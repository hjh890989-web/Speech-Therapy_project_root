// API-003 — getWeeklyReport() 계약. SRS §3.5, REQ-FUNC-027/028/044, REQ-NF-004.
// 구현 책임: FR-Q-005 (그래프 UI) + FR-C-010 (Cron 배치 생성) + FR-C-011 (예측).
// 본 스키마는 lib/weekly-report.ts 의 ScoreTrend 와 정합.

import { z } from "zod";
import { ScoreTrendSchema } from "@/lib/weekly-report";

export const WeeklyReportErrorCode = z.enum([
  "INVALID_INPUT",
  "REPORT_NOT_FOUND",
  "INTERNAL_ERROR",
]);
export type WeeklyReportErrorCode = z.infer<typeof WeeklyReportErrorCode>;

export const WeeklyReportInputSchema = z.object({
  userId: z.string().uuid(),
  /// 생략 시 최신 주차.
  weekNumber: z.number().int().min(1).max(53).optional(),
  year: z.number().int().min(2026).max(2100).optional(),
  includePrediction: z.boolean().default(true),
});
export type WeeklyReportInput = z.infer<typeof WeeklyReportInputSchema>;

export const WeeklyReportPayloadSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  year: z.number().int(),
  weekNumber: z.number().int(),
  scoreTrend: ScoreTrendSchema,
  articulationAvg: z.number().min(0).max(100),
  linguisticAvg: z.number().min(0).max(100),
  acousticAvg: z.number().min(0).max(100),
  peerPercentileAvg: z.number().min(0).max(100),
  sessionCount: z.number().int().min(0),
  predictedNextScore: z.number().nullable(),
  predictionConfidence: z.number().nullable(),
  generatedAt: z.string().datetime(),
});
export type WeeklyReportPayload = z.infer<typeof WeeklyReportPayloadSchema>;

export const WeeklyReportOutputSchema = z.object({
  /// dataSufficiency='insufficient' 시 null. FR-Q-006 가 긍정 메시지로 분기.
  report: WeeklyReportPayloadSchema.nullable(),
  /// 직전 주 대비 변동률 (%).
  weekOverWeekChange: z.number(),
  /// REQ-FUNC-029 데이터 부족 분기 키.
  dataSufficiency: z.enum(["full", "partial", "insufficient"]),
  /// REQ-FUNC-011 — UI 강제 Disclaimer.
  disclaimerRequired: z.literal(true),
});
export type WeeklyReportOutput = z.infer<typeof WeeklyReportOutputSchema>;
