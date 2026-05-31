"use server";

// API-020 / FR-C-029 — F16 푸시 구독 등록 Server Action (V07).
//
// 흐름:
//   1) F16 게이트 (isF16PushEnabled) — off 시 즉시 차단 (코드 배치 / 활성 0, ADR-10).
//   2) Supabase auth → 인증 user.id (필수, 익명 미허용 — 인증 user PIPA).
//   3) PIPA 가드 (assertConsentedIfAuthenticated) — 두 동의 완료 + MON-005 hook.
//   4) Zod 입력 검증 (endpoint URL + p256dh/auth 키).
//   5) PushSubscription upsert (endpoint unique) — 옵트인 source of truth = row 존재.
//      재구독 시 키 갱신 + dismissCount reset (사용자 재의사 표시).
//
// 정보통신망법 §50: 본 Action 호출 = 사용자 명시 옵트인. row.createdAt = 옵트인 기록 시점.
// R4: endpoint/키는 PII 아님. 외부 user id 미입력 — auth uid 만 (cross-write 0건).
//
// Refs: TASK_API-020.md, TASK_FR-C-029.md, REQ-FUNC-040, V07 §4.1 F16.

import { z } from "zod";

import { withActor } from "@/lib/db/with-actor";
import { reportPipaViolation } from "@/lib/monitoring/pipa-violation";
import {
  assertConsentedIfAuthenticated,
  ConsentRequiredError,
} from "@/lib/policy/consent-guard";
import { isF16PushEnabled } from "@/lib/push/config";
import { getSupabaseServerClient } from "@/lib/supabase/server";

import type {
  SubscribePushInput,
  SubscribePushResult,
} from "./subscribe-push-shape";

const InputSchema = z.object({
  endpoint: z.string().url("유효한 endpoint 가 아니에요.").max(2048),
  keys: z.object({
    p256dh: z.string().min(1).max(512),
    auth: z.string().min(1).max(512),
  }),
});

export async function subscribePush(
  input: SubscribePushInput,
): Promise<SubscribePushResult> {
  // (1) F16 게이트 — off 시 무동작 (구독 자체 차단).
  if (!isF16PushEnabled()) {
    return { success: false, reason: "disabled" };
  }

  // (2) 인증 (익명 미허용).
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

  // (3) PIPA 가드 + MON-005.
  try {
    await assertConsentedIfAuthenticated();
  } catch (err) {
    if (err instanceof ConsentRequiredError) {
      void reportPipaViolation({
        ctx: {
          layer: "2_analyze_authenticated",
          serverAction: "subscribePush",
        },
      });
      return { success: false, reason: "consent_required" };
    }
    return { success: false, reason: "unauthorized" };
  }

  // (4) Zod.
  const parsed = InputSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      reason: "invalid_input",
      message: parsed.error.issues[0]?.message,
    };
  }
  const { endpoint, keys } = parsed.data;

  // (5) upsert — endpoint unique. 재구독 시 키 갱신 + dismissCount reset.
  try {
    const row = await withActor(userId, (tx) =>
      tx.pushSubscription.upsert({
        where: { endpoint },
        create: {
          userId,
          endpoint,
          p256dh: keys.p256dh,
          auth: keys.auth,
        },
        update: {
          userId,
          p256dh: keys.p256dh,
          auth: keys.auth,
          dismissCount: 0,
        },
        select: { id: true },
      }),
    );
    return { success: true, subscriptionId: row.id };
  } catch (err) {
    console.error("[API-020] push subscription upsert 실패:", err);
    return { success: false, reason: "internal_error" };
  }
}
