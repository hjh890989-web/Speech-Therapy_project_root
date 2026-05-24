// FR-Q-013 후속 — classifyEntryGroup 의 KST 기준 분류 검증.
//
// 시나리오 (≥ 6):
//   [TZ1] now=KST 오전 (UTC 00:00) — 같은 KST 일자 자정~23:59 = today
//   [TZ2] now=KST 오전 — UTC 동일 일자 14:59 (전날 KST 23:59) = yesterday
//   [TZ3] now=KST 자정 직전 (UTC 14:59) — 같은 KST 일자 모두 today
//   [TZ4] now=KST 자정 직후 (UTC 15:00) — KST 다음날 00:00 today, 그 직전 yesterday
//   [TZ5] today/yesterday/thisWeek 경계 KST 기준 정확성
//   [TZ6] 7일 전 KST 경계 — thisWeek vs older
//   [TZ7] DST 무관 (여름/겨울 모두 +9h)
//   [TZ8] 호출 측 시그니처 무변경 — 기존 호출 패턴 그대로 작동
//
// 참고: 기존 timeline-aggregator.test.ts 의 [7] 테스트는 로컬 TZ 기반이라 server TZ 가
//   UTC 인 CI 환경에서는 KST 기준과 어긋남 — 본 파일은 UTC instant 입력 기준 KST 분류
//   정확성을 별도로 강제.

import { describe, it, expect } from "vitest";

import { classifyEntryGroup } from "@/lib/timeline/aggregator";

describe("classifyEntryGroup — KST 기준 분류 (TZ 통일 PR)", () => {
  it("[TZ1] now=KST 2026-05-24 10:00 (UTC 01:00) — 같은 KST 일자 자정~23:59 모두 today", () => {
    const now = new Date("2026-05-24T01:00:00.000Z"); // KST 2026-05-24 10:00
    // KST 2026-05-24 00:00 = UTC 2026-05-23 15:00
    const kstDayStart = new Date("2026-05-23T15:00:00.000Z");
    // KST 2026-05-24 23:59:59 = UTC 2026-05-24 14:59:59
    const kstDayEnd = new Date("2026-05-24T14:59:59.000Z");
    expect(classifyEntryGroup(kstDayStart, now)).toBe("today");
    expect(classifyEntryGroup(kstDayEnd, now)).toBe("today");
  });

  it("[TZ2] now=KST 2026-05-24 10:00 — 전날 KST 23:59 (UTC 2026-05-23 14:59) = yesterday", () => {
    const now = new Date("2026-05-24T01:00:00.000Z"); // KST 2026-05-24 10:00
    const yesterdayLate = new Date("2026-05-23T14:59:59.000Z"); // KST 2026-05-23 23:59
    const yesterdayStart = new Date("2026-05-22T15:00:00.000Z"); // KST 2026-05-23 00:00
    expect(classifyEntryGroup(yesterdayLate, now)).toBe("yesterday");
    expect(classifyEntryGroup(yesterdayStart, now)).toBe("yesterday");
  });

  it("[TZ3] now=KST 자정 직전 (UTC 14:59) — 같은 KST 일자 모두 today, 전날은 yesterday", () => {
    // UTC 2026-05-24 14:59 = KST 2026-05-24 23:59.
    const now = new Date("2026-05-24T14:59:00.000Z");
    // KST 같은 일자 (5-24) 의 자정과 정오 모두 today.
    const sameDayStart = new Date("2026-05-23T15:00:00.000Z"); // KST 5-24 00:00
    const sameDayNoon = new Date("2026-05-24T03:00:00.000Z"); // KST 5-24 12:00
    expect(classifyEntryGroup(sameDayStart, now)).toBe("today");
    expect(classifyEntryGroup(sameDayNoon, now)).toBe("today");

    // 전날 KST (5-23) 23:59 = UTC 5-23 14:59 → yesterday.
    const prevDayLate = new Date("2026-05-23T14:59:00.000Z");
    expect(classifyEntryGroup(prevDayLate, now)).toBe("yesterday");
  });

  it("[TZ4] now=KST 자정 직후 (UTC 15:00) — 같은 KST 일자 (다음날) 00:00 today, 직전 yesterday", () => {
    // UTC 2026-05-24 15:00 = KST 2026-05-25 00:00.
    const now = new Date("2026-05-24T15:00:00.000Z");
    // KST 2026-05-25 00:00 = UTC 2026-05-24 15:00 → today.
    const sameDayStart = new Date("2026-05-24T15:00:00.000Z");
    expect(classifyEntryGroup(sameDayStart, now)).toBe("today");

    // 직전 1ms (UTC 14:59:59.999 = KST 5-24 23:59:59.999) → yesterday.
    const justBefore = new Date("2026-05-24T14:59:59.999Z");
    expect(classifyEntryGroup(justBefore, now)).toBe("yesterday");
  });

  it("[TZ5] today / yesterday / thisWeek 경계 KST 기준 정확성", () => {
    // now = KST 2026-05-25 10:00 = UTC 2026-05-25 01:00.
    const now = new Date("2026-05-25T01:00:00.000Z");
    // today: KST 2026-05-25 시작 = UTC 2026-05-24 15:00.
    expect(classifyEntryGroup(new Date("2026-05-24T15:00:00.000Z"), now)).toBe("today");
    // yesterday: KST 2026-05-24 시작 = UTC 2026-05-23 15:00.
    expect(classifyEntryGroup(new Date("2026-05-23T15:00:00.000Z"), now)).toBe("yesterday");
    // thisWeek: KST 2026-05-23 (그저께).
    expect(classifyEntryGroup(new Date("2026-05-22T15:00:00.000Z"), now)).toBe("thisWeek");
    // thisWeek 가장 이른: KST 2026-05-18 자정 = UTC 2026-05-17 15:00.
    expect(classifyEntryGroup(new Date("2026-05-17T15:00:00.000Z"), now)).toBe("thisWeek");
    // older: KST 2026-05-17 23:59 = UTC 2026-05-17 14:59 → older.
    expect(classifyEntryGroup(new Date("2026-05-17T14:59:59.000Z"), now)).toBe("older");
  });

  it("[TZ6] 7일 전 KST 경계 — thisWeek vs older", () => {
    const now = new Date("2026-05-25T01:00:00.000Z"); // KST 5-25 10:00
    // 7일 전 KST 자정 = KST 5-18 00:00 = UTC 5-17 15:00.
    const sevenAgoStart = new Date("2026-05-17T15:00:00.000Z");
    const justBefore = new Date(sevenAgoStart.getTime() - 1);
    expect(classifyEntryGroup(sevenAgoStart, now)).toBe("thisWeek"); // >= weekStart
    expect(classifyEntryGroup(justBefore, now)).toBe("older");
  });

  it("[TZ7] DST 무관 — 여름철 자정 경계도 +9h 고정", () => {
    // 7월 1일 KST 10:00 = UTC 01:00.
    const now = new Date("2026-07-01T01:00:00.000Z");
    // 같은 KST 일자 (7-01) 자정 = UTC 6-30 15:00.
    expect(classifyEntryGroup(new Date("2026-06-30T15:00:00.000Z"), now)).toBe("today");
    // 전날 KST (6-30) 23:59 = UTC 6-30 14:59.
    expect(classifyEntryGroup(new Date("2026-06-30T14:59:59.000Z"), now)).toBe("yesterday");
  });

  it("[TZ8] 시그니처 무변경 — default now 인자 호출 정상 작동", () => {
    // now 미지정 → 현재 시각의 KST 자정 비교. 동일 instant 호출은 today.
    const ahead = new Date(Date.now() + 1000); // 1초 뒤 (오늘)
    expect(classifyEntryGroup(ahead)).toBe("today");
  });
});
