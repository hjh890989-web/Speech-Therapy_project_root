"use server";

// FR-C-008 — getCurriculum Server Action.
// API-002 Zod 입력 검증 → lib/curriculum.ts 비즈니스 로직 위임.
// REQ-FUNC-021~023 (3연속 실패 -1 / 5연속 성공 +1 / 음소 마스터 switch / 전환 < 0.5s).
//
// FR-C-008 (#31) — DB 기반 적응형 난이도 하향 보강:
//   curriculum.ts 의 input.recentSessions 기반 streak 결정에 더해,
//   같은 음소의 최근 3개 EvaluationResult (articulationScore < 50) 도 체크.
//   둘 중 하나라도 만족하면 -1 (은밀히) — UI 알림 없음, 분석 이벤트만 console.log.

import { prisma } from "@/lib/db";
import {
  analyzeStreaks,
  decideRecommendation,
  prismaMissionDeps,
  resolveMission,
} from "@/lib/curriculum";
import {
  applyAdjustmentWithFloor,
  checkAdaptiveDifficulty,
} from "@/lib/missions/adaptive-difficulty";
import {
  CurriculumInputSchema,
  type CurriculumInput,
  type CurriculumOutput,
} from "@/lib/schemas/curriculum";

type SupportedPhoneme = "ㄱ" | "ㄴ" | "ㅅ" | "ㅈ" | "ㄹ";

function isSupportedPhoneme(value: string): value is SupportedPhoneme {
  return value === "ㄱ" || value === "ㄴ" || value === "ㅅ" || value === "ㅈ" || value === "ㄹ";
}

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

  // FR-C-008 (#31) — DB 기반 적응형 난이도 하향 (은밀히).
  // 같은 user + 같은 phoneme 최근 3개 EvaluationResult 가 모두 articulation < 50 이면
  // decision.difficulty 를 추가로 -1 (clamp 1).
  // 본 분기는 UI 노출 절대 X — server-side console.log 텔레메트리만 (FR-C-010 패턴).
  let finalDifficulty = decision.difficulty;
  if (isSupportedPhoneme(decision.phoneme)) {
    const adjustment = await checkAdaptiveDifficulty({
      userId: input.userId,
      targetPhoneme: decision.phoneme,
    });
    if (adjustment.shouldLower) {
      const previousLevel = finalDifficulty;
      finalDifficulty = applyAdjustmentWithFloor(previousLevel, adjustment.recommendedAdjustment);
      // 은밀히 — 사용자 UI 알림은 절대 발송하지 않는다.
      // 본 console.log 는 lib/events.ts 의 difficulty_adjusted shape 과 정합.
      // (Vercel Logs → 향후 server-side analytics sink 도입 시 trackEvent 로 swap)
      console.log("[analytics:server] difficulty_adjusted", {
        targetPhoneme: decision.phoneme,
        consecutiveFailures: adjustment.consecutiveFailures,
        previousLevel,
        newLevel: finalDifficulty,
      });
    }
  }

  const missionId = await resolveMission(
    input,
    { ...decision, difficulty: finalDifficulty },
    prismaMissionDeps,
  );
  if (!missionId) {
    throw new Error("NO_MISSIONS_AVAILABLE");
  }

  return {
    recommendedMissionId: missionId,
    recommendedDifficulty: finalDifficulty,
    reason: decision.reason,
    ...(decision.suggestedNextPhoneme && { suggestedNextPhoneme: decision.suggestedNextPhoneme }),
    streakInfo: {
      successCount: streak.successCount,
      failureCount: streak.failureCount,
    },
  };
}
