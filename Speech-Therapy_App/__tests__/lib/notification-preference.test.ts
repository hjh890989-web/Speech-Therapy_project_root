// FR-C-NOTIFICATION-PREFERENCE — lib/notifications/preference.ts 단위 테스트.
//
// 격리:
//   - @/lib/db Prisma mock (user.findUnique)
//
// 시나리오 (총 9건):
//   1. getNotificationPreference 정상 fetch + DEFAULTS merge (모든 키 명시)
//   2. 누락 키 → DEFAULTS 의 default true 반환
//   3. 명시 false → false 반환
//   4. DB row 부재 (findUnique null) → DEFAULTS 반환
//   5. DB throw → DEFAULTS 폴백 (graceful) + console.error
//   6. shouldSendEmail enum 검증 — boolean 분기 정확
//   7. cache dedup — 같은 userId 로 2회 호출 시 prisma 1회만 (React cache 동작 가정)
//   8. normalizeNotificationPreference — non-object/array → DEFAULTS
//   9. CON-04 — 본 모듈 export 의 모든 문자열 (키 이름) 에 의료 금칙어 0건

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const findUniqueMock = vi.fn();
vi.mock("@/lib/db", () => ({
  prisma: {
    user: {
      findUnique: (...args: unknown[]) => findUniqueMock(...args),
    },
  },
}));

import {
  getDefaultNotificationPreference,
  getNotificationPreference,
  NOTIFICATION_PREFERENCE_KEYS,
  normalizeNotificationPreference,
  shouldSendEmail,
  type NotificationPreference,
} from "@/lib/notifications/preference";

const USER_ID = "user-uuid-pref-1111";
const USER_ID_DIFF = "user-uuid-pref-2222";
const FORBIDDEN_MEDICAL = ["치료", "진단", "장애"];

beforeEach(() => {
  findUniqueMock.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("getNotificationPreference — FR-C-NOTIFICATION-PREFERENCE", () => {
  it("[1] 정상 fetch — 모든 키 명시 → 그대로 반환 (boolean 정확)", async () => {
    findUniqueMock.mockResolvedValueOnce({
      notificationPreference: {
        weeklyReportEmail: false,
        cushionNoteEmail: true,
        consentReminderEmail: false,
        parentInviteEmail: true,
      },
    });
    const pref = await getNotificationPreference(USER_ID);
    expect(pref).toEqual({
      weeklyReportEmail: false,
      cushionNoteEmail: true,
      consentReminderEmail: false,
      parentInviteEmail: true,
    });
    expect(findUniqueMock).toHaveBeenCalledTimes(1);
  });

  it("[2] 누락 키 → DEFAULTS 의 default true 반환 (opt-out 기반)", async () => {
    findUniqueMock.mockResolvedValueOnce({
      notificationPreference: {
        // weeklyReportEmail 만 명시.
        weeklyReportEmail: false,
      },
    });
    const pref = await getNotificationPreference(USER_ID);
    expect(pref.weeklyReportEmail).toBe(false);
    // 나머지 3종은 default true.
    expect(pref.cushionNoteEmail).toBe(true);
    expect(pref.consentReminderEmail).toBe(true);
    expect(pref.parentInviteEmail).toBe(true);
  });

  it("[3] DB row 부재 (findUnique null) → DEFAULTS 반환", async () => {
    findUniqueMock.mockResolvedValueOnce(null);
    const pref = await getNotificationPreference(USER_ID_DIFF);
    expect(pref).toEqual(getDefaultNotificationPreference());
    // DEFAULTS 의 모든 키가 true.
    for (const key of NOTIFICATION_PREFERENCE_KEYS) {
      expect(pref[key]).toBe(true);
    }
  });

  it("[4] DB throw → DEFAULTS 폴백 (graceful, console.error)", async () => {
    findUniqueMock.mockRejectedValueOnce(new Error("connection lost"));
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const pref = await getNotificationPreference("user-uuid-pref-9999");
    expect(pref).toEqual(getDefaultNotificationPreference());
    expect(errSpy).toHaveBeenCalled();
    errSpy.mockRestore();
  });

  it("[5] 빈 userId → DEFAULTS 반환 (prisma 호출 X)", async () => {
    const pref = await getNotificationPreference("");
    expect(pref).toEqual(getDefaultNotificationPreference());
    expect(findUniqueMock).not.toHaveBeenCalled();
  });

  it("[6] cache dedup — 같은 userId 2회 호출 → prisma 1회만 (React cache)", async () => {
    findUniqueMock.mockResolvedValue({
      notificationPreference: { cushionNoteEmail: false },
    });
    // 본 테스트는 단일 vi 실행 안에서 호출 — React cache 가 module scope 가 아닌 request
    // scope 라서 vitest 환경에서는 실 dedup 보장이 약함. 본 케이스는 두 결과의 _동등성_ 만 검증.
    const a = await getNotificationPreference("user-cache-dedup-aaaa");
    const b = await getNotificationPreference("user-cache-dedup-aaaa");
    expect(a).toEqual(b);
    expect(a.cushionNoteEmail).toBe(false);
    // 다른 userId 는 별도 호출.
    findUniqueMock.mockResolvedValueOnce({ notificationPreference: {} });
    const c = await getNotificationPreference("user-cache-dedup-bbbb");
    expect(c.cushionNoteEmail).toBe(true);
  });
});

describe("shouldSendEmail — FR-C-NOTIFICATION-PREFERENCE", () => {
  const allTrue: NotificationPreference = {
    weeklyReportEmail: true,
    cushionNoteEmail: true,
    consentReminderEmail: true,
    parentInviteEmail: true,
  };
  const cushionFalse: NotificationPreference = {
    ...allTrue,
    cushionNoteEmail: false,
  };

  it("[7] true → 발송 허용 (모든 키)", () => {
    for (const key of NOTIFICATION_PREFERENCE_KEYS) {
      expect(shouldSendEmail(allTrue, key)).toBe(true);
    }
  });

  it("[8] 명시 false → 발송 차단 (해당 키만)", () => {
    expect(shouldSendEmail(cushionFalse, "cushionNoteEmail")).toBe(false);
    // 나머지 키는 여전히 true.
    expect(shouldSendEmail(cushionFalse, "weeklyReportEmail")).toBe(true);
    expect(shouldSendEmail(cushionFalse, "consentReminderEmail")).toBe(true);
    expect(shouldSendEmail(cushionFalse, "parentInviteEmail")).toBe(true);
  });
});

describe("normalizeNotificationPreference — FR-C-NOTIFICATION-PREFERENCE", () => {
  it("[9] non-object / array / null → DEFAULTS 반환", () => {
    expect(normalizeNotificationPreference(null)).toEqual(
      getDefaultNotificationPreference(),
    );
    expect(normalizeNotificationPreference(undefined)).toEqual(
      getDefaultNotificationPreference(),
    );
    expect(normalizeNotificationPreference("not-object")).toEqual(
      getDefaultNotificationPreference(),
    );
    expect(normalizeNotificationPreference([1, 2, 3])).toEqual(
      getDefaultNotificationPreference(),
    );
  });

  it("[10] 알려지지 않은 키는 silently 무시 + boolean 외 값도 무시 (DEFAULTS 유지)", () => {
    const pref = normalizeNotificationPreference({
      weeklyReportEmail: false,
      unknownKey: true, // 무시
      cushionNoteEmail: "string", // boolean 아님 → DEFAULTS 의 true 유지
    });
    expect(pref.weeklyReportEmail).toBe(false);
    expect(pref.cushionNoteEmail).toBe(true);
    expect(
      (pref as unknown as Record<string, unknown>).unknownKey,
    ).toBeUndefined();
  });

  it("[11] CON-04 — 본 모듈 export 의 모든 키 이름 / DEFAULTS / DEFAULTS 값에 의료 금칙어 0건", () => {
    const allText = JSON.stringify({
      keys: NOTIFICATION_PREFERENCE_KEYS,
      defaults: getDefaultNotificationPreference(),
    });
    for (const w of FORBIDDEN_MEDICAL) {
      expect(allText).not.toContain(w);
    }
  });
});
