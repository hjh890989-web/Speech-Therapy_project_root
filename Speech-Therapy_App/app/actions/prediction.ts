"use server";

// FR-C-011 — Gemini 회귀 모델 기반 다음 주 예상 점수 + 신뢰구간.
//
// REQ-FUNC-028, 044, 045.
//
// 흐름:
//   1. 직전 4주 weekly aggregate (aggregateWeeklyScores loop) → 4 datapoints
//   2. 4주 미만 → null (FR-Q-006 EmptyState 분기 트리거)
//   3. 메모리 캐시 hit → 즉시 반환 (cached=true)
//   4. Gemini generateJson (PredictionGeminiOutputSchema) — SEC-004 rate limiter 자동 적용
//   5. 캐시 SAVE + 결과 반환 (cached=false)
//   6. RateLimitedError → 직전 캐시 fallback (staleFromRateLimit=true) 또는 null
//
// 캐시 정책:
//   - In-memory Map (Vercel cold start 마다 reset — 보수적)
//   - 키: `${env}:prediction:${userId}:${year}-W${week}:${missionFrequency}`
//   - TTL: 24h
//   - 사용자 데이터 추가 시 invalidate 없음 — 매 주차마다 자동 회전
//
// 별도 task (§E-2): Upstash Redis 도입으로 다중 인스턴스 캐시 일관성 강화 (AGENTS.md §3 스택 외 정책 변경 필요).

import { generateJson, RateLimitedError } from "@/lib/ai/gemini";
import { aggregateWeeklyScores, previousWeek, getCurrentWeekNumber } from "@/lib/weekly-report";
import {
  PredictionInputSchema,
  PredictionGeminiOutputSchema,
  type PredictionInput,
  type PredictionResult,
  type MissionFrequency,
} from "@/lib/schemas/prediction";

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const HISTORY_WEEKS = 4;

interface CacheEntry {
  result: Omit<PredictionResult, "cached" | "staleFromRateLimit">;
  expiresAt: number;
}

// In-memory cache — 환경 prefix 로 prod/preview/dev 격리 (SEC-004 패턴).
const predictionCache = new Map<string, CacheEntry>();

function envPrefix(): string {
  return (process.env.VERCEL_ENV || process.env.NODE_ENV || "dev").toLowerCase();
}

function cacheKey(userId: string, year: number, week: number, freq: MissionFrequency): string {
  return `${envPrefix()}:prediction:${userId}:${year}-W${week}:${freq}`;
}

interface WeekDataPoint {
  year: number;
  week: number;
  articulationAvg: number;
  linguisticAvg: number;
  acousticAvg: number;
  sessionCount: number;
}

/// 직전 N주 weekly aggregate 수집. N 주 미만 데이터 시 null.
async function collectHistory(
  userId: string,
  baseYear: number,
  baseWeek: number,
  weeks: number,
): Promise<WeekDataPoint[] | null> {
  const points: WeekDataPoint[] = [];
  let cursorYear = baseYear;
  let cursorWeek = baseWeek;
  for (let i = 0; i < weeks; i++) {
    const { year: prevY, week: prevW } = previousWeek(cursorYear, cursorWeek);
    cursorYear = prevY;
    cursorWeek = prevW;
    const agg = await aggregateWeeklyScores(userId, cursorYear, cursorWeek);
    if (agg === null) return null; // 4주 중 하나라도 0건이면 history 부족.
    points.push({
      year: cursorYear,
      week: cursorWeek,
      articulationAvg: agg.articulationAvg,
      linguisticAvg: agg.linguisticAvg,
      acousticAvg: agg.acousticAvg,
      sessionCount: agg.sessionCount,
    });
  }
  return points;
}

function buildPrompt(history: WeekDataPoint[], freq: MissionFrequency): string {
  const lines = history
    .reverse() // 오래된 주 → 최근 주 순서
    .map(
      (p) =>
        `- ${p.year} W${p.week}: 조음 ${p.articulationAvg.toFixed(1)} / 언어 ${p.linguisticAvg.toFixed(1)} / 음향 ${p.acousticAvg.toFixed(1)} (${p.sessionCount}회)`,
    );
  return [
    "다음 주 예상 평균 점수를 회귀 추정해 주세요.",
    "",
    "직전 4주 데이터 (오래된 → 최근):",
    ...lines,
    "",
    `미션 빈도 시뮬레이션: ${freq} (low=주 1~2회, normal=주 3~4회, high=주 5회+)`,
    "",
    "JSON 으로 답하세요 — predicted (0~100 종합 평균), confidence (0~1), lower_bound, upper_bound.",
    "lower_bound ≤ predicted ≤ upper_bound 관계 유지.",
  ].join("\n");
}

const SYSTEM_PROMPT = [
  "당신은 아이의 발음 발달 추이를 수치로 추정하는 회귀 모델입니다.",
  "응답은 반드시 JSON 만, 한국어 설명 없음.",
  "의학 용어 (치료, 진단, 장애) 사용 금지. 본 추정은 의료 판단이 아닌 발달 참고 자료.",
].join(" ");

/// FR-C-011 — 다음 주 예상 점수 회귀 추정.
/// 데이터 부족 (4주 미만 또는 일부 주 0건) 시 null 반환.
export async function predictNextScore(input: PredictionInput): Promise<PredictionResult | null> {
  const parsed = PredictionInputSchema.parse(input);
  const { userId, missionFrequency = "normal" } = parsed;

  const { year, week } = getCurrentWeekNumber();
  const key = cacheKey(userId, year, week, missionFrequency);

  // 1. 캐시 hit?
  const cached = predictionCache.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    return { ...cached.result, cached: true };
  }

  // 2. 직전 4주 데이터 수집.
  const history = await collectHistory(userId, year, week, HISTORY_WEEKS);
  if (history === null) return null;

  // 3. Gemini 호출 (RateLimiter 자동 통과 / 차단).
  try {
    const gemini = await generateJson({
      system: SYSTEM_PROMPT,
      prompt: buildPrompt(history, missionFrequency),
      schema: PredictionGeminiOutputSchema,
      userId,
    });
    const result = {
      predictedNextScore: gemini.predicted,
      predictionConfidence: gemini.confidence,
      lowerBound: gemini.lower_bound,
      upperBound: gemini.upper_bound,
      basedOnWeeks: 4 as const,
    };
    predictionCache.set(key, { result, expiresAt: Date.now() + CACHE_TTL_MS });
    return { ...result, cached: false };
  } catch (err) {
    // 4. Rate limit graceful — 직전 캐시 있으면 stale 반환, 없으면 null.
    if (err instanceof RateLimitedError) {
      if (cached) {
        return { ...cached.result, cached: true, staleFromRateLimit: true };
      }
      return null;
    }
    throw err;
  }
}

/// 테스트용 — 캐시 초기화.
export async function __resetPredictionCacheForTest(): Promise<void> {
  predictionCache.clear();
}
