"use server";

// API-003 — getWeeklyReport() Server Action 시그니처 stub.
// 구현은 FR-Q-005 (조회) + FR-C-010 (Cron 배치 생성) 책임.

import type {
  WeeklyReportInput,
  WeeklyReportOutput,
} from "@/lib/schemas/weekly-report";
import { WeeklyReportInputSchema } from "@/lib/schemas/weekly-report";

export async function getWeeklyReport(
  rawInput: unknown,
): Promise<WeeklyReportOutput> {
  const _input: WeeklyReportInput = WeeklyReportInputSchema.parse(rawInput);

  // FR-Q-005 구현:
  //    - DB-007 weekly_reports 조회 (year/week 또는 최신)
  //    - lib/weekly-report.ts aggregateWeeklyScores 활용
  //    - dataSufficiency 판정 (sessionCount 기반)
  //    - includePrediction=true 면 FR-C-011 회귀 모델 호출
  throw new Error("Not implemented — see FR-Q-005 / FR-C-010");
}
