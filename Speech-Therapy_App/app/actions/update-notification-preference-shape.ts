// FR-PERF-3-USE-SERVER-REFACTOR — update-notification-preference Server Action 의 shape (CLIENT-SAFE).
//
// Next.js 16 + Turbopack 의 "use server" 파일은 async function 외 export 금지 룰
// 정합 위해 분리. 본 파일은 "use server" directive 미포함.

import type {
  NotificationPreference,
  NotificationPreferenceKey,
} from "@/lib/notifications/preference-shape";

/** Server Action 입력 — Partial (사용자가 변경한 키만 전달, 나머지는 DB 유지). */
export type UpdateNotificationPreferenceInput = Partial<NotificationPreference>;

/** Server Action 결과 — graceful (throw 없음). */
export type UpdateNotificationPreferenceResult =
  | {
      success: true;
      /** merge + normalize 된 최종 preference (UI prefill 갱신용). */
      preference: NotificationPreference;
      /** 분석 이벤트 발송용 메타. R4: userId 는 분석 백엔드 자동 해시 가정. */
      analytics: {
        userId: string;
        changed: NotificationPreferenceKey[];
      };
    }
  | {
      success: false;
      reason:
        | "unauthorized"
        | "invalid_input"
        | "no_change"
        | "db_failed";
      message: string;
    };
