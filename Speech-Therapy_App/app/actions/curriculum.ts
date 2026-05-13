"use server";

// FR-C-008 — getCurriculum Server Action.
// API-002 Zod 입력 검증 → lib/curriculum.ts 비즈니스 로직 위임.
// REQ-FUNC-021~023 (3연속 실패 -1 / 5연속 성공 +1 / 음소 마스터 switch / 전환 < 0.5s).

import { prisma } from "@/lib/db";
import {
  analyzeStreaks,
  decideRecommendation,
  prismaMissionDeps,
  resolveMission,
} from "@/lib/curriculum";
import {
  CurriculumInputSchema,
  type CurriculumInput,
  type CurriculumOutput,
} from "@/lib/schemas/curriculum";

export async function getCurriculum(rawInput: unknown): Promise<CurriculumOutput> {
  const input: CurriculumInput = CurriculumInputSchema.parse(rawInput);

  // 최근 세션의 미션 메타 (난이도/음소) 를 1회만 추가 조회 → streak 의 currentLevel 결정.
  const latest = input.recentSessions[0];
  let recentDifficulty: number | null = null;
  let recentPhoneme: string | null = null;
  if (latest) {
    const mission = await prisma.missionCard.findUnique({
      where: { id: latest.missionId },
      select: { difficultyLevel: true, targetPhoneme: true },
    });
    if (mission) {
      recentDifficulty = mission.difficultyLevel;
      recentPhoneme = mission.targetPhoneme;
    }
  }

  const streak = analyzeStreaks(input.recentSessions, recentDifficulty, recentPhoneme);
  const preferred = input.targetPhoneme ?? (recentPhoneme as CurriculumInput["targetPhoneme"]) ?? "ㅅ";
  const decision = decideRecommendation(streak, 1, preferred);

  const missionId = await resolveMission(input, decision, prismaMissionDeps);
  if (!missionId) {
    throw new Error("NO_MISSIONS_AVAILABLE");
  }

  return {
    recommendedMissionId: missionId,
    recommendedDifficulty: decision.difficulty,
    reason: decision.reason,
    ...(decision.suggestedNextPhoneme && { suggestedNextPhoneme: decision.suggestedNextPhoneme }),
    streakInfo: {
      successCount: streak.successCount,
      failureCount: streak.failureCount,
    },
  };
}
