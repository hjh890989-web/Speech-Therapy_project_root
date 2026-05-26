// FR-C-NOTIFICATION-PREFERENCE — 알림 선호 shape + 순수 helper (CLIENT-SAFE).
//
// 본 모듈은 _순수 데이터 형/상수/검증_ 만 보유 — Prisma 호출 0건. Client Component 에서
// 직접 import 안전.
//
// 분리 사유 (Performance 3차):
//   - 이전엔 `lib/notifications/preference.ts` 가 Prisma 호출 (`getNotificationPreference`)
//     과 순수 helper (normalize / shouldSend / 상수) 를 모두 한 파일에 둠.
//   - Client Component (NotificationPreferenceForm) 가 그 파일에서 상수 + 타입만 import
//     해도, ESM 그래프상 prisma 까지 transitively client bundle 로 끌려와 Turbopack chunking
//     failure (`node:module` 외부 모듈 오류) 발생.
//   - shape 만 분리하여 client 측은 본 파일만 import → prisma 비의존.
//
// CON-04: 본 파일의 모든 주석 / 상수에 "치료/진단/장애" 금칙어 0건.

/**
 * 알림 선호 — 4종 알림 종류별 boolean.
 *
 * default 정책 (opt-out 기반):
 *   - 누락 키 → DEFAULTS 의 값 (true).
 *   - 명시 false → 해당 알림 발송 차단.
 *   - 명시 true → 해당 알림 발송 (default 와 동일).
 *
 * 추가 시 본 인터페이스 + DEFAULTS + NOTIFICATION_PREFERENCE_KEYS + Server Action Zod 모두 동기 갱신 필요.
 */
export interface NotificationPreference {
  /** 부모 주간 리뷰 이메일 (FR-Q-WEEKLY-REVIEW retention 보조). */
  weeklyReportEmail: boolean;
  /** 쿠션어 알림장 부모 발송 (원장이 보내는 경우 receive). */
  cushionNoteEmail: boolean;
  /** 동의서 미서명 D+3 리마인더 이메일 (FR-C-018). */
  consentReminderEmail: boolean;
  /** 부모 초대 이메일 (initial setup 후 옵션 — 가입 자체 흐름엔 영향 X). */
  parentInviteEmail: boolean;
}

/**
 * DEFAULTS — 모든 키 true (opt-out 기반).
 *
 * 한국 정보통신망법 §50 의 광고성 정보 opt-in 의무는 _광고 / 마케팅_ 알림에만 적용.
 * 본 4종은 모두 _서비스 운영 정보_ (서명 만료 안내 / 자녀 활동 알림 등) — opt-out 으로 운영.
 */
const DEFAULTS: NotificationPreference = {
  weeklyReportEmail: true,
  cushionNoteEmail: true,
  consentReminderEmail: true,
  parentInviteEmail: true,
};

/**
 * 알려진 키 목록 — Server Action 의 Zod / 분석 이벤트 changed 키 산출에 재사용.
 *
 * 새 알림 추가 시 본 배열 + NotificationPreference interface + DEFAULTS 동시 갱신.
 */
export const NOTIFICATION_PREFERENCE_KEYS = [
  "weeklyReportEmail",
  "cushionNoteEmail",
  "consentReminderEmail",
  "parentInviteEmail",
] as const satisfies ReadonlyArray<keyof NotificationPreference>;

export type NotificationPreferenceKey = (typeof NOTIFICATION_PREFERENCE_KEYS)[number];

/**
 * 외부 JSON (DB raw value) → NotificationPreference 정규화.
 *
 * - null / undefined / non-object → DEFAULTS (모두 true).
 * - 알려진 키 중 boolean 인 값만 채택 — 나머지는 DEFAULTS 값 유지.
 * - 알려지지 않은 키는 silently 무시 (확장 안전).
 *
 * 본 함수가 helper 의 _유일한_ 정규화 진입점 — Server Action / 발송 path 모두 본 함수 결과만 사용.
 */
export function normalizeNotificationPreference(
  raw: unknown,
): NotificationPreference {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { ...DEFAULTS };
  }
  const obj = raw as Record<string, unknown>;
  const out: NotificationPreference = { ...DEFAULTS };
  for (const key of NOTIFICATION_PREFERENCE_KEYS) {
    const value = obj[key];
    if (typeof value === "boolean") {
      out[key] = value;
    }
  }
  return out;
}

/**
 * 특정 알림 종류의 발송 허용 여부 검사.
 *
 * 발송 path 가 호출:
 *   const pref = await getNotificationPreference(userId);
 *   if (!shouldSendEmail(pref, "cushionNoteEmail")) return { skipped: true, reason: "user_opt_out" };
 *
 * @param pref normalizeNotificationPreference 또는 getNotificationPreference 결과.
 * @param kind 알림 종류 — NotificationPreferenceKey 중 하나.
 * @returns true = 발송 허용, false = 사용자 opt-out 으로 발송 차단.
 */
export function shouldSendEmail(
  pref: NotificationPreference,
  kind: NotificationPreferenceKey,
): boolean {
  // boolean 강제 — 타입이 약속해도 외부 호출자가 잘못 전달 시 안전 폴백.
  const value = pref[kind];
  return value !== false;
}

/** DEFAULTS 의 외부 read-only 노출 — Server Action / form prefill 에서 폴백 표시용. */
export function getDefaultNotificationPreference(): NotificationPreference {
  return { ...DEFAULTS };
}
