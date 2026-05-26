"use server";

// FR-C-NOTIFICATION-PREFERENCE — /settings/notifications 알림 선호 변경 Server Action.
//
// 흐름:
//   1) Supabase auth.getUser → userId. 비로그인 → unauthorized.
//   2) Zod-like validation — Partial<NotificationPreference> 의 각 키가 boolean 인지.
//   3) 기존 DB 값 fetch (DEFAULTS 폴백) → spread merge → withActor 안에서 user.update.
//   4) graceful — throw 절대 금지. 모든 분기 결과 객체 반환.
//
// RBAC (R4):
//   - 본 Action 은 외부에서 user id 입력 받지 않음 — auth.getUser 의 uid 만 사용.
//   - 본인 row 만 update — cross-write 0건.
//
// 분석 이벤트:
//   - 호출 측 (NotificationPreferenceForm) 이 result.analytics.changed 를 사용해
//     trackEvent("notification_preference_updated", ...) 발송.
//   - 본 Action 은 결과에 changed 키 배열만 담아 반환 — 실 이벤트 발송 X.
//
// CON-04: 본 파일의 모든 메시지 / 주석에 "치료/진단/장애" 금칙어 0건.

import { prisma } from "@/lib/db";
import { withActor } from "@/lib/db/with-actor";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import {
  NOTIFICATION_PREFERENCE_KEYS,
  normalizeNotificationPreference,
  type NotificationPreference,
  type NotificationPreferenceKey,
} from "@/lib/notifications/preference";

// FR-PERF-3-USE-SERVER-REFACTOR — non-async exports (type) 는
// ./update-notification-preference-shape 으로 분리.
import type {
  UpdateNotificationPreferenceInput,
  UpdateNotificationPreferenceResult,
} from "./update-notification-preference-shape";

/**
 * 알림 선호 변경 — /settings/notifications 의 NotificationPreferenceForm 에서 호출.
 *
 * RBAC: Supabase auth uid 만 본인 User row update — 외부 인자로 받은 user id 절대 사용 X.
 *
 * 멱등성: 같은 값 재호출 시 DB update 호출은 발생하지만 trigger 측 audit 만 남음 — 분석은 changed=[] 로 비.
 */
export async function updateNotificationPreference(
  input: UpdateNotificationPreferenceInput,
): Promise<UpdateNotificationPreferenceResult> {
  // 1) auth.
  let userId: string;
  try {
    const supabase = await getSupabaseServerClient();
    const { data, error } = await supabase.auth.getUser();
    if (error || !data?.user?.id) {
      return {
        success: false,
        reason: "unauthorized",
        message: "로그인 후 다시 시도해 주세요.",
      };
    }
    userId = data.user.id;
  } catch {
    return {
      success: false,
      reason: "unauthorized",
      message: "로그인 상태를 확인할 수 없어요. 잠시 후 다시 시도해 주세요.",
    };
  }

  // 2) 입력 검증 — Partial 의 각 키가 boolean 인지.
  //    - input 자체가 비 object → invalid_input.
  //    - input 안에 알려진 키 0건 (전부 누락) → no_change (DB 호출 회피).
  //    - 알려지지 않은 키는 silently 무시 (확장 안전).
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return {
      success: false,
      reason: "invalid_input",
      message: "잘못된 입력이에요.",
    };
  }
  const inputObj = input as Record<string, unknown>;
  const sanitizedInput: Partial<NotificationPreference> = {};
  for (const key of NOTIFICATION_PREFERENCE_KEYS) {
    if (!(key in inputObj)) continue;
    const value = inputObj[key];
    if (typeof value !== "boolean") {
      return {
        success: false,
        reason: "invalid_input",
        message: "옵션 값은 true 또는 false 여야 해요.",
      };
    }
    sanitizedInput[key] = value;
  }
  const inputKeys = Object.keys(sanitizedInput) as NotificationPreferenceKey[];
  if (inputKeys.length === 0) {
    return {
      success: false,
      reason: "no_change",
      message: "변경된 옵션이 없어요.",
    };
  }

  // 3) 기존 DB 값 fetch (graceful → DEFAULTS 폴백 + 본인 row 만).
  //    cached helper 우회 — 본 Action 은 SSR cache 와 무관한 mutation flow.
  let existing: NotificationPreference;
  try {
    const row = await prisma.user.findUnique({
      where: { id: userId },
      select: { notificationPreference: true },
    });
    existing = normalizeNotificationPreference(row?.notificationPreference);
  } catch {
    return {
      success: false,
      reason: "db_failed",
      message: "알림 옵션 조회에 실패했어요. 잠시 후 다시 시도해 주세요.",
    };
  }

  // merge: 기존 값 + 사용자 변경 키.
  const merged: NotificationPreference = { ...existing, ...sanitizedInput };

  // 분석용 changed — 실제 값이 _바뀐_ 키만 카운트 (no-op write 는 빈 배열).
  const changed: NotificationPreferenceKey[] = [];
  for (const key of inputKeys) {
    if (existing[key] !== merged[key]) {
      changed.push(key);
    }
  }

  // 4) DB update — 본인 row 만. withActor 가 audit_trigger_fn actor_id 캡처.
  try {
    await withActor(userId, async (tx) => {
      await tx.user.update({
        where: { id: userId },
        // Prisma JSON 컬럼 — plain object 전달 시 자동 직렬화.
        // NotificationPreference 는 _명시_ interface 라 InputJsonObject 의 index signature
        // 와 호환 안 됨 — 안전한 cast (값은 boolean 만으로 검증 완료).
        data: {
          notificationPreference: merged as unknown as Record<string, boolean>,
        },
      });
    });
  } catch {
    return {
      success: false,
      reason: "db_failed",
      message: "알림 옵션 저장에 실패했어요. 잠시 후 다시 시도해 주세요.",
    };
  }

  return {
    success: true,
    preference: merged,
    analytics: { userId, changed },
  };
}
