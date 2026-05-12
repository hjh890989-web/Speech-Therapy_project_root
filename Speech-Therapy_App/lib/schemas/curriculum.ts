// API-002 — getCurriculum() 계약. SRS §3.5, REQ-FUNC-015 / 021~023.
// 구현 책임: FR-C-008 (적응형 난이도 비즈니스 로직).

import { z } from "zod";

export const CurriculumErrorCode = z.enum([
  "INVALID_INPUT",
  "NO_MISSIONS_AVAILABLE",
  "INTERNAL_ERROR",
]);
export type CurriculumErrorCode = z.infer<typeof CurriculumErrorCode>;

export const SessionResultSchema = z.object({
  sessionId: z.string().uuid(),
  missionId: z.string().uuid(),
  success: z.boolean(),
  timestamp: z.string().datetime(),
});
export type SessionResult = z.infer<typeof SessionResultSchema>;

export const CurriculumInputSchema = z.object({
  userId: z.string().uuid(),
  /// 최근 10세션 — 적응형 난이도 윈도우.
  recentSessions: z.array(SessionResultSchema).max(10),
  /// 지정 시 우선 음소로 추천.
  targetPhoneme: z.enum(["ㅅ", "ㅈ", "ㄱ", "ㄴ", "ㄹ"]).optional(),
  childAgeMonths: z.number().int().min(24).max(84),
});
export type CurriculumInput = z.infer<typeof CurriculumInputSchema>;

export const CurriculumOutputSchema = z.object({
  recommendedMissionId: z.string().uuid(),
  recommendedDifficulty: z.number().int().min(1).max(5),
  reason: z.enum(["continue", "level_down", "level_up", "phoneme_switch"]),
  suggestedNextPhoneme: z.string().optional(),
  streakInfo: z.object({
    successCount: z.number().int().min(0),
    failureCount: z.number().int().min(0),
  }),
});
export type CurriculumOutput = z.infer<typeof CurriculumOutputSchema>;
