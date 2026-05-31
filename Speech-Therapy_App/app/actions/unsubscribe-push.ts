"use server";

// API-020 — F16 푸시 구독 해지 Server Action (V07).
//
// 흐름:
//   1) Supabase auth → 인증 user.id.
//   2) 본인 PushSubscription DELETE — endpoint 지정 시 해당 1건, 미지정 시 user 전체.
//
// _게이트 무관_: 옵트아웃은 F16_PUSH_ENABLED off 여도 항상 동작.
//   정보통신망법 §50 — 수신거부는 언제나 보장 (구독 등록은 게이트되지만 해지는 무조건 허용).
//
// R4: where 에 userId 강제 — endpoint 를 알아도 타인 구독 삭제 불가 (cross-write 0건).
//
// Refs: TASK_API-020.md, REQ-FUNC-040.

import { withActor } from "@/lib/db/with-actor";
import { getSupabaseServerClient } from "@/lib/supabase/server";

import type { UnsubscribePushResult } from "./subscribe-push-shape";

export async function unsubscribePush(
  endpoint?: string,
): Promise<UnsubscribePushResult> {
  // (1) 인증.
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

  // (2) DELETE — 본인 구독만 (userId 강제로 cross-write 차단).
  try {
    const where =
      typeof endpoint === "string" && endpoint.length > 0
        ? { userId, endpoint }
        : { userId };
    const result = await withActor(userId, (tx) =>
      tx.pushSubscription.deleteMany({ where }),
    );
    return { success: true, deletedCount: result.count };
  } catch (err) {
    console.error("[API-020] push 구독 해지 실패:", err);
    return { success: false, reason: "internal_error" };
  }
}
