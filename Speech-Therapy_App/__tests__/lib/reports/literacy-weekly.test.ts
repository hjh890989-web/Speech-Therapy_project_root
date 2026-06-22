// FR-Q-LIT (CR-2026-009 / Phase 4) — 주간 문해력 활동량 집계 순수 함수 테스트.
import { describe, it, expect } from "vitest";
import {
  aggregateLiteracyWeekly,
  type LiteracyWeeklyRow,
} from "@/lib/reports/literacy-weekly";

function row(stage: string, gameSlug: string, isoDate: string): LiteracyWeeklyRow {
  return { stage, gameSlug, createdAt: new Date(`${isoDate}T03:00:00.000Z`) };
}

describe("aggregateLiteracyWeekly", () => {
  it("0건 → null (카드 미렌더 트리거)", () => {
    expect(aggregateLiteracyWeekly([])).toBeNull();
  });

  it("총 횟수·활동일 집계", () => {
    const rows = [
      row("S2", "spelling", "2026-06-15"),
      row("S2", "spelling", "2026-06-15"), // 같은 날
      row("S2", "read-rules", "2026-06-17"),
    ];
    const s = aggregateLiteracyWeekly(rows)!;
    expect(s.totalSessions).toBe(3);
    expect(s.activeDays).toBe(2); // 06-15, 06-17
  });

  it("단계별은 stages 순서(S0→S4), count>0 단계만", () => {
    const rows = [
      row("S4", "morphology", "2026-06-15"),
      row("S2", "spelling", "2026-06-15"),
      row("S2", "read-rules", "2026-06-16"),
      row("S3", "reading-comprehension", "2026-06-16"),
    ];
    const s = aggregateLiteracyWeekly(rows)!;
    expect(s.byStage).toEqual([
      { stage: "S2", count: 2 },
      { stage: "S3", count: 1 },
      { stage: "S4", count: 1 },
    ]);
  });

  it("놀이별은 count desc, 동률은 slug 사전순(결정적)", () => {
    const rows = [
      row("S2", "spelling", "2026-06-15"),
      row("S2", "spelling", "2026-06-16"),
      row("S2", "read-rules", "2026-06-15"),
      row("S4", "morphology", "2026-06-15"),
    ];
    const s = aggregateLiteracyWeekly(rows)!;
    expect(s.byGame).toEqual([
      { gameSlug: "spelling", count: 2 },
      { gameSlug: "morphology", count: 1 }, // 동률(1) → 사전순 morphology < read-rules
      { gameSlug: "read-rules", count: 1 },
    ]);
  });

  it("결정적 — 동일 입력 동일 출력", () => {
    const rows = [row("S2", "spelling", "2026-06-15"), row("S3", "reading-comprehension", "2026-06-16")];
    expect(aggregateLiteracyWeekly(rows)).toEqual(aggregateLiteracyWeekly(rows));
  });
});
