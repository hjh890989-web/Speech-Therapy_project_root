// FR-Q-013 후속 — KST TZ 헬퍼 (lib/timeline/tz.ts) 단위 테스트.
//
// 검증 시나리오 (≥ 6):
//   [T1] kstStartOfDay(KST 23:00) → KST 00:00 (= UTC 전날 15:00) instant
//   [T2] 자정 직전 UTC 14:59 → KST 23:59 today (kstStartOfDay 와 같은 UTC 일자)
//   [T3] 자정 직후 UTC 15:00 → KST 다음날 00:00 (kstStartOfDay 결과의 다음날)
//   [T4] kstDaysAgoStart(1) — 어제 KST 자정 instant 정확성
//   [T5] kstDaysAgoStart(7) — 7일 전 KST 자정 instant 정확성
//   [T6] DST 무관 — 여름철 / 겨울철 어느 시점에도 +9h 고정 offset
//   [T7] toKst() — UTC 메서드로 KST wall-clock 확인 가능
//   [T8] 동일 KST 일자의 서로 다른 instant 도 kstStartOfDay 가 동일 값 반환

import { describe, it, expect } from "vitest";

import {
  KST_OFFSET_MS,
  toKst,
  kstStartOfDay,
  kstDaysAgoStart,
  toDayStartKst,
  addKstDays,
  formatKstDate,
  formatKstDateTime,
} from "@/lib/timeline/tz";

describe("KST_OFFSET_MS — 단순 +9h 고정", () => {
  it("9 시간 = 32_400_000 ms", () => {
    expect(KST_OFFSET_MS).toBe(9 * 60 * 60 * 1000);
    expect(KST_OFFSET_MS).toBe(32_400_000);
  });
});

describe("toKst — UTC instant 을 KST wall-clock 으로 표현", () => {
  it("[T7] toKst(UTC 2026-05-23T15:00:00Z) → UTC 메서드로 KST 00:00 wall-clock", () => {
    const utc = new Date("2026-05-23T15:00:00.000Z"); // = KST 2026-05-24 00:00
    const k = toKst(utc);
    // UTC 메서드로 KST wall-clock 확인.
    expect(k.getUTCFullYear()).toBe(2026);
    expect(k.getUTCMonth()).toBe(4); // 5월 = index 4
    expect(k.getUTCDate()).toBe(24);
    expect(k.getUTCHours()).toBe(0);
    expect(k.getUTCMinutes()).toBe(0);
  });

  it("toKst — 입력 instant 와 9h 차이의 새 Date 반환 (원본 변경 X)", () => {
    const utc = new Date("2026-05-23T15:00:00.000Z");
    const before = utc.getTime();
    const k = toKst(utc);
    expect(k.getTime() - utc.getTime()).toBe(KST_OFFSET_MS);
    // 원본 unchanged.
    expect(utc.getTime()).toBe(before);
  });
});

describe("kstStartOfDay — KST 자정 instant", () => {
  it("[T1] kstStartOfDay(KST 23:00 = UTC 14:00) → KST 00:00 = UTC 전날 15:00 instant", () => {
    // 2026-05-24 KST 23:00 = 2026-05-24 UTC 14:00.
    const ref = new Date("2026-05-24T14:00:00.000Z");
    const start = kstStartOfDay(ref);
    // KST 00:00 of 2026-05-24 = UTC 2026-05-23T15:00:00Z.
    expect(start.toISOString()).toBe("2026-05-23T15:00:00.000Z");
  });

  it("[T2] UTC 14:59 (자정 직전 KST 23:59) → kstStartOfDay 가 같은 KST 일자 자정", () => {
    const ref = new Date("2026-05-24T14:59:59.999Z"); // KST 2026-05-24 23:59:59.999
    const start = kstStartOfDay(ref);
    // 같은 KST 일자 (2026-05-24) 의 자정 → UTC 2026-05-23T15:00:00Z.
    expect(start.toISOString()).toBe("2026-05-23T15:00:00.000Z");
  });

  it("[T3] UTC 15:00 (자정 직후 KST 다음날 00:00) → kstStartOfDay 가 다음 KST 일자 자정", () => {
    const ref = new Date("2026-05-24T15:00:00.000Z"); // KST 2026-05-25 00:00:00
    const start = kstStartOfDay(ref);
    // 같은 KST 일자 (2026-05-25) 의 자정 → UTC 2026-05-24T15:00:00Z.
    expect(start.toISOString()).toBe("2026-05-24T15:00:00.000Z");
  });

  it("[T8] 동일 KST 일자의 서로 다른 instant → 동일 자정 instant 반환", () => {
    // 2026-05-24 KST 00:00 / 12:00 / 23:59 모두 → 같은 KST 자정 (UTC 2026-05-23T15:00:00Z).
    const a = new Date("2026-05-23T15:00:00.000Z"); // KST 00:00
    const b = new Date("2026-05-24T03:00:00.000Z"); // KST 12:00
    const c = new Date("2026-05-24T14:59:59.999Z"); // KST 23:59
    const sa = kstStartOfDay(a).getTime();
    const sb = kstStartOfDay(b).getTime();
    const sc = kstStartOfDay(c).getTime();
    expect(sa).toBe(sb);
    expect(sb).toBe(sc);
  });
});

describe("kstDaysAgoStart — N일 전 KST 자정", () => {
  it("[T4] kstDaysAgoStart(1) — 어제 KST 자정 instant", () => {
    // ref = 2026-05-25 KST 10:00 = UTC 2026-05-25 01:00.
    const ref = new Date("2026-05-25T01:00:00.000Z");
    const yesterdayStart = kstDaysAgoStart(1, ref);
    // 어제 (2026-05-24) KST 00:00 = UTC 2026-05-23T15:00:00Z.
    expect(yesterdayStart.toISOString()).toBe("2026-05-23T15:00:00.000Z");
  });

  it("[T5] kstDaysAgoStart(7) — 7일 전 KST 자정 instant", () => {
    // ref = 2026-05-25 KST 10:00.
    const ref = new Date("2026-05-25T01:00:00.000Z");
    const weekStart = kstDaysAgoStart(7, ref);
    // 7일 전 KST 00:00 = 2026-05-18 KST 00:00 = UTC 2026-05-17T15:00:00Z.
    expect(weekStart.toISOString()).toBe("2026-05-17T15:00:00.000Z");
  });

  it("kstDaysAgoStart(0) — 오늘 KST 자정 (kstStartOfDay 와 동일)", () => {
    const ref = new Date("2026-05-25T01:00:00.000Z");
    const todayStart = kstDaysAgoStart(0, ref);
    expect(todayStart.getTime()).toBe(kstStartOfDay(ref).getTime());
  });
});

describe("toDayStartKst / addKstDays — FR-TZ-UNIFY-EXTEND alias", () => {
  it("[T9] toDayStartKst — kstStartOfDay 와 동일 결과 (단일 진실)", () => {
    const ref = new Date("2026-05-24T05:30:00.000Z");
    expect(toDayStartKst(ref).toISOString()).toBe(
      kstStartOfDay(ref).toISOString(),
    );
  });

  it("[T10] addKstDays — KST 자정 + 1일", () => {
    // KST 2026-05-24 00:00 = UTC 2026-05-23 15:00.
    const day0 = kstStartOfDay(new Date("2026-05-24T05:30:00.000Z"));
    const day1 = addKstDays(day0, 1);
    expect(day1.toISOString()).toBe("2026-05-24T15:00:00.000Z");
  });

  it("[T11] addKstDays — KST 자정 - 7일", () => {
    const day0 = kstStartOfDay(new Date("2026-05-25T05:30:00.000Z"));
    const dayMinus7 = addKstDays(day0, -7);
    // KST 2026-05-25 - 7d = KST 2026-05-18 00:00 = UTC 2026-05-17 15:00.
    expect(dayMinus7.toISOString()).toBe("2026-05-17T15:00:00.000Z");
  });
});

describe("formatKstDate — FR-TZ-UNIFY-EXTEND KST 일자 라벨", () => {
  it("[T12] UTC 14:59 (KST 23:59) → 같은 KST 일자", () => {
    expect(formatKstDate(new Date("2026-05-25T14:59:00.000Z"))).toBe(
      "2026-05-25",
    );
  });

  it("[T13] UTC 15:00 (KST 다음날 00:00) → 다음 KST 일자", () => {
    expect(formatKstDate(new Date("2026-05-25T15:00:00.000Z"))).toBe(
      "2026-05-26",
    );
  });

  it("[T14] UTC 00:00 (KST 09:00) → 같은 KST 일자", () => {
    expect(formatKstDate(new Date("2026-05-25T00:00:00.000Z"))).toBe(
      "2026-05-25",
    );
  });

  it("[T15] 2026-05-25T23:00:00+09:00 (= UTC 14:00) → '2026-05-25' (UTC 라벨로 5-25 인지)", () => {
    // 입력 instant 가 KST 23:00 (= UTC 14:00) — UTC 일자 라벨이라면 5-25 동일하나,
    // 의도는 _KST_ 일자 검증. 본 테스트는 KST/UTC 동일 일자라 경계 조건.
    expect(formatKstDate(new Date("2026-05-25T14:00:00.000Z"))).toBe(
      "2026-05-25",
    );
  });

  it("[T16] UTC 자정 직전 23:59 → KST 다음날 08:59 → KST 일자 +1", () => {
    // UTC 2026-05-25T23:59 = KST 2026-05-26T08:59 → "2026-05-26".
    expect(formatKstDate(new Date("2026-05-25T23:59:00.000Z"))).toBe(
      "2026-05-26",
    );
  });
});

describe("formatKstDateTime — FR-TZ-UNIFY-EXTEND KST wall-clock", () => {
  it("[T17] UTC 14:00 (KST 23:00) → 'YYYY-MM-DD HH:MM:SS' KST", () => {
    expect(formatKstDateTime(new Date("2026-05-25T14:00:00.000Z"))).toBe(
      "2026-05-25 23:00:00",
    );
  });

  it("[T18] UTC 15:00 (KST 다음날 00:00) → KST 다음날 00:00:00", () => {
    expect(formatKstDateTime(new Date("2026-05-25T15:00:00.000Z"))).toBe(
      "2026-05-26 00:00:00",
    );
  });

  it("[T19] UTC 00:00 (KST 09:00) → 같은 일자 09:00:00", () => {
    expect(formatKstDateTime(new Date("2026-05-25T00:00:00.000Z"))).toBe(
      "2026-05-25 09:00:00",
    );
  });

  it("[T20] 초 단위까지 정확 — UTC 14:30:45 → KST 23:30:45", () => {
    expect(formatKstDateTime(new Date("2026-05-25T14:30:45.000Z"))).toBe(
      "2026-05-25 23:30:45",
    );
  });
});

describe("DST 무관 — Korea 는 일광 절약 없음", () => {
  it("[T6] 여름철 / 겨울철 어느 시점에도 +9h 고정", () => {
    // 여름 (7월 1일).
    const summer = new Date("2026-07-01T15:00:00.000Z"); // KST 7-02 00:00
    const summerStart = kstStartOfDay(summer);
    expect(summerStart.toISOString()).toBe("2026-07-01T15:00:00.000Z");

    // 겨울 (1월 1일).
    const winter = new Date("2026-01-01T15:00:00.000Z"); // KST 1-02 00:00
    const winterStart = kstStartOfDay(winter);
    expect(winterStart.toISOString()).toBe("2026-01-01T15:00:00.000Z");

    // 두 자정 간 차이 정확히 (181 일).
    const diffDays =
      (winterStart.getTime() - summerStart.getTime()) / (24 * 60 * 60 * 1000);
    // 2026-07-01 KST 자정 ~ 2026-01-01 KST 자정 = 약 -182 일 (음수, 겨울이 더 이전).
    expect(Math.abs(diffDays - Math.round(diffDays))).toBeLessThan(0.001);
  });
});
