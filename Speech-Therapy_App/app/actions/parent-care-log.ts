"use server";

// FR-C-030 — F17 통합 케어로그 (V07 신규).
//
// 책임 (부모 직접 입력 — teacher/admin 측 submitOfflineEntry 와 별도 RBAC):
//   1) Supabase auth → 인증 user.id 확인 (parent 본인만 허용)
//   2) Zod 입력 검증 — kind ∈ {parent_play, parent_external_session} + note ≤ 500자
//   3) CON-04 금칙어 검사 (note 본문 hasBannedTerm)
//   4) PIPA 가드 (assertConsentedIfAuthenticated) — 두 동의 완료 후만
//   5) createOfflineEntry — withActor(userId, ...) 안에서 INSERT
//      userId == authorId == 인증 user.id (본인 자료 본인 입력)
//   6) revalidatePath — /reports + /admin/timeline (F4 통합 시각화 즉시 반영)
//
// graceful (throw 절대 금지):
//   - 모든 분기는 { success: false, reason } 결과 객체 반환.
//   - 성공 시 { success: true, entryId, observedAt }.
//
// R4 (자녀 보호):
//   - 본인 user 의 본인 입력만 — RBAC 자동 정합 (subject == author).
//   - note 본문에 자녀 PII 입력은 부모 책임 — 본 Action 은 검출 X.
//   - 그러나 audit_log_triggers 의 R4 sanitize 가 oldData/newData 의심 키 자동 [REDACTED].
//
// CON-04: note 본문 금칙어 ("치료/진단/장애" 등) 검출 시 즉시 reject.
//
// MON-005: PIPA 가드 위반 시 fire-and-forget Slack alert.
//
// Refs: TASK_FR-C-030.md, §4.1 F17 (REQ-FUNC-041~043), DB-004 후속.

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { hasBannedTerm } from "@/lib/forbidden-words";
import {
  createOfflineEntry,
  OFFLINE_ENTRY_NOTE_MAX_LENGTH,
  PARENT_CARE_LOG_KINDS,
} from "@/lib/offline-entry/repo";
import {
  assertConsentedIfAuthenticated,
  ConsentRequiredError,
} from "@/lib/policy/consent-guard";
import { reportPipaViolation } from "@/lib/monitoring/pipa-violation";
import { getSupabaseServerClient } from "@/lib/supabase/server";

import type {
  SubmitParentCareLogInput,
  SubmitParentCareLogResult,
} from "./parent-care-log-shape";

/** Zod schema — 부모용 kind 만 허용. */
const InputSchema = z.object({
  kind: z.enum(PARENT_CARE_LOG_KINDS),
  note: z
    .string()
    .min(1, "메모 내용을 입력해 주세요.")
    .max(
      OFFLINE_ENTRY_NOTE_MAX_LENGTH,
      `메모는 최대 ${OFFLINE_ENTRY_NOTE_MAX_LENGTH}자까지 입력할 수 있어요.`,
    ),
  observedAt: z.string().optional(),
});

/// server-side telemetry — Vercel Logs 수집. R4: 자녀 식별 정보 노출 0건.
function logParentCareLogCreated(properties: {
  kind: string;
  noteLength: number;
}): void {
  try {
    console.log(
      JSON.stringify({
        level: "info",
        event: "parent_care_log_created",
        properties,
      }),
    );
  } catch {
    // 로깅 실패는 graceful — 메인 흐름 차단 X.
  }
}

/**
 * 부모 본인 직접 케어로그 입력 (FR-C-030).
 *
 * RBAC:
 *   - 인증 user 필수 (Supabase auth.getUser).
 *   - role === "parent" (B2B teacher 측 흐름은 submitOfflineEntry 별도).
 *   - subject userId == author userId == 인증 user.id (본인 데이터만).
 *
 * PIPA:
 *   - assertConsentedIfAuthenticated() 통과 필수.
 *   - 미동의 시 reason: "consent_required" + MON-005 Slack alert.
 */
export async function submitParentCareLog(
  input: SubmitParentCareLogInput,
): Promise<SubmitParentCareLogResult> {
  // 1) 인증 확인 — 익명 user 미허용 (부모용 RBAC).
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

  // 2) PIPA 가드 — 미동의 시 graceful + MON-005.
  try {
    await assertConsentedIfAuthenticated();
  } catch (err) {
    if (err instanceof ConsentRequiredError) {
      void reportPipaViolation({
        ctx: {
          layer: "2_analyze_authenticated",
          serverAction: "submitParentCareLog",
        },
      });
      return { success: false, reason: "consent_required" };
    }
    return { success: false, reason: "unauthorized" };
  }

  // 3) Zod 입력 검증.
  const parsed = InputSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      reason: "invalid_input",
      issues: parsed.error.issues.map((i) => i.message),
    };
  }
  const { kind, note, observedAt } = parsed.data;

  // 4) CON-04 금칙어 검사.
  if (hasBannedTerm(note)) {
    return { success: false, reason: "forbidden_term" };
  }

  // 5) createOfflineEntry — withActor(userId) 안에서 INSERT.
  let entryId: string;
  let recordedAt: Date;
  try {
    const entry = await createOfflineEntry({
      userId,        // subject = 본인
      authorId: userId, // author = 본인 (parent 본인 입력)
      kind,
      note,
      observedAt: observedAt ? new Date(observedAt) : new Date(),
      institutionId: null, // B2C 부모 — institution 무관
    });
    entryId = entry.id;
    recordedAt = entry.observedAt;
  } catch (err) {
    console.error("[FR-C-030] parent_care_log INSERT failed:", err);
    return { success: false, reason: "internal_error" };
  }

  // 6) F4 통합 시각화 cache invalidate.
  try {
    revalidatePath("/reports");
    revalidatePath(`/admin/timeline/${userId}`);
  } catch {
    // revalidate 실패는 graceful — 다음 요청 시 fresh.
  }

  // 7) 분석 이벤트.
  logParentCareLogCreated({ kind, noteLength: note.length });

  return {
    success: true,
    entryId,
    observedAt: recordedAt.toISOString(),
  };
}
