// FR-C-NOTIFICATION-PREFERENCE — 알림 종류별 opt-in/out 선호 helper.
//
// 책임:
//   - User.notificationPreference JSONB 컬럼을 안전하게 fetch + DEFAULTS merge.
//   - 발송 path (cushion-note / weekly-report / consent / parent-invite) 가 호출하여
//     각 알림 종류별 opt-in 여부를 단일 entry-point 로 결정.
//
// 정책 (법적 정합 — GDPR / 한국 정보통신망법 §50):
//   - 본 helper 는 _마케팅성 / 정보성_ 알림만 관여.
//   - 트랜잭션성 알림 (계정 변경 / 비밀번호 reset / 데이터 다운로드 안내 / 보안 알림)
//     은 본 helper 와 무관 — 호출 측이 본 helper 우회 후 항상 발송.
//   - opt-out 기반 default: 누락 키 = true (모든 신규 user 는 가입 직후 모든 알림 수신).
//     사용자가 명시 false 로 변경하면 그 키만 발송 차단.
//
// R4 (자녀 보호):
//   - userId 만 입력 — 자녀 식별 정보 0건.
//   - DB 부재 user / fetch 실패 → DEFAULTS (모두 true) 폴백 (안전한 기본).
//
// Performance:
//   - React `cache()` 로 request-scope dedup — 같은 RSC 안에서 동일 user 의
//     preference 를 N 회 조회해도 DB 왕복 1회만.
//
// CON-04: 본 파일의 모든 주석 / 상수에 "치료/진단/장애" 금칙어 0건.

import { cache } from "react";

import { prisma } from "@/lib/db";

/**
 * 알림 선호 — 4종 알림 종류별 boolean.
 *
 * default 정책:
 *   - 누락 키 → DEFAULTS 의 값 (true).
 *   - 명시 false → 해당 알림 발송 차단.
 *   - 명시 true → 해당 알림 발송 (default 와 동일).
 *
 * 추가 시 본 인터페이스 + DEFAULTS + KNOWN_KEYS + Server Action Zod 모두 동기 갱신 필요.
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
 * user 의 알림 선호 fetch — DB 미존재 / 일시 장애 시 DEFAULTS 폴백.
 *
 * React cache() 로 request-scope dedup. 같은 RSC 안에서 같은 userId 로 N 회 호출 시
 * 실제 prisma 왕복은 1회.
 *
 * @param userId Supabase auth uid. 빈 문자열 / null-like → DEFAULTS.
 */
export const getNotificationPreference = cache(
  async (userId: string): Promise<NotificationPreference> => {
    if (!userId || typeof userId !== "string" || userId.trim().length === 0) {
      return { ...DEFAULTS };
    }
    try {
      const row = await prisma.user.findUnique({
        where: { id: userId },
        select: { notificationPreference: true },
      });
      if (!row) {
        // 미가입 user — 안전한 default 반환 (호출 측은 발송 진행, 사용자가 후일 opt-out).
        return { ...DEFAULTS };
      }
      return normalizeNotificationPreference(row.notificationPreference);
    } catch (err) {
      // graceful — DB 일시 장애 시 default 로 진행 (발송 누락 위험 < 미발송 누락 위험).
      console.error(
        "[notifications/preference] DB fetch failed — fallback to DEFAULTS",
        err,
      );
      return { ...DEFAULTS };
    }
  },
);

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
