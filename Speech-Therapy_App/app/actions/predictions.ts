"use server";

// FR-C-011 (#34) — Gemini 회귀 예측 Server Action 표면.
//
// 본 액션은 lib/predictions/gemini.predictNextScore (graceful wrapper) 를 호출하여
// 모든 실패 분기를 mock fallback 으로 통일한다.
//
// 기존 `app/actions/prediction.ts` (단수) 는 FR-Q-012 페이지 전용 — null 반환 / Gemini 직접 throw
// 가 의도된 별도 표면. 본 액션 (복수형) 은 외부 호출자 (어드민 / 백오피스 / 미래 mission UI 등) 가
// "항상 응답 보장" 패턴이 필요할 때 사용.
//
// R4: userId 만 노출 (자녀 식별 정보 미포함). prompt 는 lib/predictions/gemini 내부에서 집계 점수만 사용.

import {
  predictNextScore,
  type PredictionInput,
  type PredictionOutput,
} from "@/lib/predictions/gemini";
import { prisma } from "@/lib/db";
import { W_AUR_MIN_MISSIONS } from "@/lib/reports/weekly-aggregator";

/**
 * userId 만으로 회귀 예측 (직전 4주 weeklyReport 자동 조회).
 * 데이터가 1주차도 없으면 mock fallback (insufficient_history).
 *
 * @returns 항상 PredictionOutput — 실패 시에도 mock 응답 (절대 throw 안 함).
 */
export async function getPredictionForUser(
  userId: string,
  missionFrequency?: "low" | "normal" | "high",
): Promise<PredictionOutput> {
  const weekHistory = await loadWeekHistory(userId);
  return predictNextScore({
    userId,
    weekHistory,
    missionFrequency,
  });
}

/**
 * 호출자가 이미 weekHistory 를 가지고 있을 때 직접 helper 호출.
 * (예: cron 이 같은 transaction 안에서 weeklyReport 를 막 upsert 한 직후)
 */
export async function getPredictionWithHistory(
  input: PredictionInput,
): Promise<PredictionOutput> {
  return predictNextScore(input);
}

// ----- 내부 -----

async function loadWeekHistory(userId: string): Promise<PredictionInput["weekHistory"]> {
  try {
    const rows = await prisma.weeklyReport.findMany({
      where: { userId },
      orderBy: { generatedAt: "desc" },
      take: 4,
      select: {
        weekNumber: true,
        articulationAvg: true,
        linguisticAvg: true,
        acousticAvg: true,
        sessionCount: true,
        missionCompletedCount: true,
      },
    });
    return rows.map((r) => ({
      weekNumber: r.weekNumber,
      articulationAvg: r.articulationAvg,
      linguisticAvg: r.linguisticAvg,
      acousticAvg: r.acousticAvg,
      sessionCount: r.sessionCount,
      // W-AUR 재유도 = 미션완료수 기반(FR-C-WAUR-SWITCH, fetchWeekHistoryForPrediction 와 정합).
      wAurAchieved: r.missionCompletedCount >= W_AUR_MIN_MISSIONS,
    }));
  } catch {
    return [];
  }
}
