// FR-C-NOTIFICATION-PREFERENCE — 알림 선호 server-only fetch helper.
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
//   - 본 파일은 `server-only` 가드 (Performance 3차) — Client Component 가 transitively
//     import 시 build 시 명확한 에러. 순수 shape (타입/상수/normalize/shouldSend) 는
//     `./preference-shape` 으로 분리되어 client 측이 안전하게 import 가능.
//
// CON-04: 본 파일의 모든 주석 / 상수에 "치료/진단/장애" 금칙어 0건.

import { cache } from "react";

import { prisma } from "@/lib/db";

import {
  NOTIFICATION_PREFERENCE_KEYS,
  getDefaultNotificationPreference,
  normalizeNotificationPreference,
  shouldSendEmail,
  type NotificationPreference,
  type NotificationPreferenceKey,
} from "./preference-shape";

// 기존 import path 호환 — server-only callers (lib/email/*, Server Action, RSC page,
// tests) 가 변경 없이 본 파일에서 types/helpers 를 계속 import 할 수 있도록 re-export.
export {
  NOTIFICATION_PREFERENCE_KEYS,
  getDefaultNotificationPreference,
  normalizeNotificationPreference,
  shouldSendEmail,
  type NotificationPreference,
  type NotificationPreferenceKey,
};

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
      return getDefaultNotificationPreference();
    }
    try {
      const row = await prisma.user.findUnique({
        where: { id: userId },
        select: { notificationPreference: true },
      });
      if (!row) {
        // 미가입 user — 안전한 default 반환 (호출 측은 발송 진행, 사용자가 후일 opt-out).
        return getDefaultNotificationPreference();
      }
      return normalizeNotificationPreference(row.notificationPreference);
    } catch (err) {
      // graceful — DB 일시 장애 시 default 로 진행 (발송 누락 위험 < 미발송 누락 위험).
      console.error(
        "[notifications/preference] DB fetch failed — fallback to DEFAULTS",
        err,
      );
      return getDefaultNotificationPreference();
    }
  },
);
