"use server";

// FR-C-NEW-F15-1 — F15 챗봇 발화 저장 Server Action (PIPA 가드 + R4 마스킹 + 7일 폐기).
//
// 흐름(submit-voice-clone 패턴 복제 — 진단/F11 과 동등 Tier):
//   1) Supabase auth → 인증 user.id (필수, 익명 미허용)
//   2) PIPA 가드(assertConsentedIfAuthenticated) — §22-6 + §17 두 동의 + MON-005 hook
//   3) Zod 입력 검증
//   4) R4 마스킹(maskPii 7패턴) — *저장 전*. 자녀 식별 정보 제거.
//   5) 금칙어 검열(containsForbidden) — 의료/단정 발화는 미저장(저장 거부)
//   6) ChatMessage INSERT — expiresAt = now + 7일(ADR-03). chat-cleanup cron 이 hard-delete.
//
// ⚠️ F15_CHAT_ENABLED 활성 전(휴면)에는 호출처(/chat UI)가 없음 — 본 가드는 활성 시 즉시 작동하도록 선배선.

import { z } from "zod";

import { prisma } from "@/lib/db";
import {
  assertConsentedIfAuthenticated,
  ConsentRequiredError,
} from "@/lib/policy/consent-guard";
import { reportPipaViolation } from "@/lib/monitoring/pipa-violation";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { maskPii } from "@/lib/ai/pii-mask";
import { containsForbidden } from "@/lib/ai/profanity-filter";

import type {
  SubmitChatUtteranceInput,
  SubmitChatUtteranceResult,
} from "./submit-chat-utterance-shape";

const CHAT_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7일 (ADR-03)

const InputSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1, "내용이 필요해요.").max(2000),
});

export async function submitChatUtterance(
  input: SubmitChatUtteranceInput,
): Promise<SubmitChatUtteranceResult> {
  // (1) 인증 (익명 미허용).
  let userId: string;
  try {
    const supabase = await getSupabaseServerClient();
    const { data } = await supabase.auth.getUser();
    if (!data.user?.id) return { success: false, reason: "unauthorized" };
    userId = data.user.id;
  } catch {
    return { success: false, reason: "unauthorized" };
  }

  // (2) PIPA 가드 + MON-005. 국외이전 binding 경로 → DB 장애 시 fail-closed(미동의 데이터 차단).
  try {
    await assertConsentedIfAuthenticated({ failClosedOnDbError: true });
  } catch (err) {
    if (err instanceof ConsentRequiredError) {
      void reportPipaViolation({
        ctx: { layer: "2_analyze_authenticated", serverAction: "submitChatUtterance" },
      });
      return { success: false, reason: "consent_required" };
    }
    return { success: false, reason: "unauthorized" };
  }

  // (3) Zod.
  const parsed = InputSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, reason: "invalid_input", message: parsed.error.issues[0]?.message };
  }

  // (4) 금칙어 검열 — **RAW 입력 기준**. 마스킹 후 검사하면 [주소] 패턴이 금칙어('치료로 12' 등)를
  //     삼켜 검열이 무력화됨(적대적 검증 medium). stream route(RAW 검열→마스킹)와 순서 일치.
  if (containsForbidden(parsed.data.content)) {
    return { success: false, reason: "forbidden_content" };
  }

  // (5) R4 마스킹 — 저장 직전 디지털 PII(전화/이메일/RRN/주소/IP/URL/카드) 제거.
  //     ⚠️ 이름/학교/시설 등 자유텍스트 식별정보는 미커버(maskPii 한계) — F15 13항목 #6 자문 대상.
  const masked = maskPii(parsed.data.content);

  // (6) INSERT — expiresAt = now + 7일.
  const expiresAt = new Date(Date.now() + CHAT_TTL_MS);
  try {
    const row = await prisma.chatMessage.create({
      data: { userId, role: parsed.data.role, content: masked, expiresAt },
      select: { id: true, expiresAt: true },
    });
    return { success: true, messageId: row.id, expiresAt: row.expiresAt.toISOString() };
  } catch (err) {
    console.error("[FR-C-NEW-F15-1] chat_message INSERT failed:", err);
    return { success: false, reason: "internal_error" };
  }
}
