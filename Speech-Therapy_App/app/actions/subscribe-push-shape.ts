// API-020 — F16 push 구독 Server Action 의 입력/출력 타입 (non-async exports).
//
// FR-PERF-3-USE-SERVER-REFACTOR: "use server" 모듈은 async 함수만 export 가능 —
// interface / type 은 본 shape 파일로 분리 (subscribe-push.ts / unsubscribe-push.ts 가 import).

/** 클라이언트 PushSubscription.toJSON() 에서 추출한 구독 정보. */
export interface SubscribePushInput {
  /// Web Push endpoint URL.
  endpoint: string;
  /// 구독 암호화 키.
  keys: {
    p256dh: string;
    auth: string;
  };
}

export type SubscribePushReason =
  | "disabled" // F16 게이트 off (F16_PUSH_ENABLED / VAPID 미설정)
  | "unauthorized" // 비로그인 (익명 미허용)
  | "consent_required" // PIPA 동의 미완료
  | "invalid_input" // Zod 검증 실패
  | "internal_error"; // DB 등 내부 오류

export type SubscribePushResult =
  | { success: true; subscriptionId: string }
  | { success: false; reason: SubscribePushReason; message?: string };

export type UnsubscribePushReason =
  | "unauthorized"
  | "internal_error";

export type UnsubscribePushResult =
  | { success: true; deletedCount: number }
  | { success: false; reason: UnsubscribePushReason; message?: string };
