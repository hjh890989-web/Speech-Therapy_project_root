"use server";

// API-018 / FR-C-027 — F11 부모 음성 클로닝 Server Action (V07).
//
// 흐름:
//   1) Supabase auth → 인증 user.id (필수, 익명 미허용)
//   2) PIPA 가드 (assertConsentedIfAuthenticated) — 두 동의 완료 + MON-005 hook
//   3) 명시적 음성 클로닝 동의 (consentGiven=true) — UI 측 별도 체크박스 (R4 강화)
//   4) Zod 입력 검증 + base64 → Blob 변환
//   5) ElevenLabs API cloneVoice — voice_id 발급 (env 미설정 시 graceful skip)
//   6) VoiceModel INSERT — expiresAt = now + 7일 (ADR-03), appliedContentTypes 화이트리스트 default
//
// ADR-09 윤리 (FR-C-027):
//   - VoiceModel.appliedContentTypes = ["storybook", "lullaby"] default (sanitizeAppliedContentTypes 통과).
//   - 추후 사용자가 변경 가능하지만 sanitize 가 화이트리스트만 통과시킴.
//
// R4 (자녀 보호):
//   - 부모 음성 자체는 PII — 7일 후 ElevenLabs 측 DELETE (FR-C-027 Cron) + soft delete marker.
//   - audit_log_triggers User UPDATE 추적은 자동 (PIPA 컬럼 변경 시).
//
// Refs: TASK_API-018.md, TASK_FR-C-027.md, V07 §4.1 F11.

import { z } from "zod";

import { prisma } from "@/lib/db";
import { withActor } from "@/lib/db/with-actor";
import {
  assertConsentedIfAuthenticated,
  ConsentRequiredError,
} from "@/lib/policy/consent-guard";
import { reportPipaViolation } from "@/lib/monitoring/pipa-violation";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { cloneVoice } from "@/lib/voice-clone/elevenlabs-client";
import {
  ALLOWED_VOICE_CONTENT_TYPES,
  sanitizeAppliedContentTypes,
} from "@/lib/voice-clone/ethics-whitelist";

import type {
  SubmitVoiceCloneInput,
  SubmitVoiceCloneResult,
} from "./submit-voice-clone-shape";

const VOICE_CLONE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7일 (ADR-03)

/** Zod schema — 입력 검증. */
const InputSchema = z.object({
  audioBase64: z
    .string()
    .min(1, "음성 데이터가 필요해요.")
    // base64 추정 length (5분 mp3 ≈ 1-2 MB → base64 ≈ 1.3-2.7 MB) — 상한 검증.
    .max(20_000_000, "음성 파일이 너무 커요 (최대 약 5MB)."),
  label: z.string().min(1, "라벨을 입력해 주세요.").max(50),
  consentGiven: z.literal(true, {
    message: "음성 클로닝 사용 동의가 필요해요.",
  }),
});

function base64ToBlob(base64: string, contentType = "audio/mpeg"): Blob {
  // data:audio/mpeg;base64,XXX 형식 지원 + raw base64 둘 다.
  const commaIdx = base64.indexOf(",");
  const rawBase64 = commaIdx >= 0 ? base64.slice(commaIdx + 1) : base64;
  const byteCharacters = atob(rawBase64);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  return new Blob([new Uint8Array(byteNumbers)], { type: contentType });
}

/// server-side telemetry — Vercel Logs. R4: 자녀 식별 정보 노출 0건.
function logVoiceCloneCreated(properties: {
  appliedContentTypeCount: number;
  audioBase64Length: number;
  elevenlabsSkipped: boolean;
}): void {
  try {
    console.log(
      JSON.stringify({
        level: "info",
        event: "voice_clone_created",
        properties,
      }),
    );
  } catch {
    // graceful — 로깅 실패는 메인 흐름 차단 X.
  }
}

export async function submitVoiceClone(
  input: SubmitVoiceCloneInput,
): Promise<SubmitVoiceCloneResult> {
  // (1) 인증 확인.
  let userId: string;
  try {
    const supabase = await getSupabaseServerClient();
    const { data } = await supabase.auth.getUser();
    if (!data.user?.id) {
      return { success: false, reason: "unauthorized" };
    }
    userId = data.user.id;
  } catch {
    return { success: false, reason: "unauthorized" };
  }

  // (2) PIPA 가드 + MON-005.
  try {
    await assertConsentedIfAuthenticated();
  } catch (err) {
    if (err instanceof ConsentRequiredError) {
      void reportPipaViolation({
        ctx: {
          layer: "2_analyze_authenticated",
          serverAction: "submitVoiceClone",
        },
      });
      return { success: false, reason: "consent_required" };
    }
    return { success: false, reason: "unauthorized" };
  }

  // (3) Zod 입력 검증 (consentGiven literal true 강제).
  const parsed = InputSchema.safeParse(input);
  if (!parsed.success) {
    const requiresConsent = parsed.error.issues.some((i) =>
      String(i.path).includes("consentGiven"),
    );
    return {
      success: false,
      reason: requiresConsent ? "consent_not_given" : "invalid_input",
      message: parsed.error.issues[0]?.message,
    };
  }
  const { audioBase64, label } = parsed.data;

  // (4) base64 → Blob.
  let audioBlob: Blob;
  try {
    audioBlob = base64ToBlob(audioBase64);
  } catch (err) {
    return {
      success: false,
      reason: "invalid_input",
      message: err instanceof Error ? err.message : "base64 디코드 실패",
    };
  }

  // (5) ElevenLabs cloneVoice — env 미설정 시 graceful skip.
  const clone = await cloneVoice({
    audioFile: audioBlob,
    label,
    description: `Parent voice clone (userId: ${userId})`,
  });
  if (!clone.ok) {
    if (clone.skipped) {
      logVoiceCloneCreated({
        appliedContentTypeCount: 0,
        audioBase64Length: audioBase64.length,
        elevenlabsSkipped: true,
      });
      return {
        success: false,
        reason: "elevenlabs_skipped",
        message: clone.error,
      };
    }
    return {
      success: false,
      reason: "elevenlabs_error",
      message: clone.error,
    };
  }

  // (6) DB INSERT — expiresAt = now + 7일, appliedContentTypes 화이트리스트 default.
  const appliedContentTypes = sanitizeAppliedContentTypes(
    ALLOWED_VOICE_CONTENT_TYPES,
  );
  const expiresAt = new Date(Date.now() + VOICE_CLONE_TTL_MS);

  try {
    const row = await withActor(userId, () =>
      prisma.voiceModel.create({
        data: {
          userId,
          modelHash: clone.data!.voice_id,
          label,
          expiresAt,
          appliedContentTypes,
        },
        select: {
          id: true,
          modelHash: true,
          expiresAt: true,
          appliedContentTypes: true,
        },
      }),
    );

    logVoiceCloneCreated({
      appliedContentTypeCount: row.appliedContentTypes.length,
      audioBase64Length: audioBase64.length,
      elevenlabsSkipped: false,
    });

    return {
      success: true,
      voiceModelId: row.id,
      modelHash: row.modelHash,
      expiresAt: row.expiresAt.toISOString(),
      appliedContentTypes: row.appliedContentTypes as typeof appliedContentTypes,
    };
  } catch (err) {
    console.error("[API-018] voice_model INSERT failed:", err);
    return { success: false, reason: "internal_error" };
  }
}
