// FR-C-011 (#34) — Gemini 회귀 예측 helper (graceful fallback wrapper).
//
// 본 모듈은 기존 app/actions/prediction.ts (Server Action) 와 별도의 "절대 throw 하지 않는"
// 회귀 예측 표면을 제공한다.
//
// 책임 분리:
//   - lib/ai/gemini.ts   : 저수준 Gemini 호출 (rate limit / timeout / throw 발생 가능)
//   - app/actions/prediction.ts : FR-Q-012 페이지가 의존, 4주 미만 시 null + Gemini 응답 직접 노출
//   - 본 모듈 (lib/predictions/gemini.ts) : weekly-aggregator cron / 외부 server actions 가 사용,
//     실패 시 mock fallback 항상 보장 (실패 분기 매트릭스 5종 → 모두 mock 응답)
//
// 사용 패턴:
//   const { predicted, confidence, model, cached, staleFromRateLimit } =
//     await predictNextScore({ userId, weekHistory: [...4주...], missionFrequency: 'normal' });
//
// 환경 변수 / 모드:
//   - GOOGLE_GENERATIVE_AI_API_KEY 미설정       → mock fallback (reason: 'api_key_missing')
//   - GEMINI_DISABLED === '1'                    → mock fallback (reason: 'disabled')
//   - NODE_ENV === 'test'                        → mock fallback (reason: 'disabled')
//
// 캐시 / Rate Limit (in-memory, Vercel cold start 마다 reset):
//   - Cache: userId + weekHistory hash + missionFrequency 키, TTL 24h
//   - Rate Limit: userId 당 1시간 5건 (Gemini 무료 quota 보호) — sliding window
//
// R4 (자녀 식별 정보 0): prompt 에 userId / 이름 / email / transcript 절대 미포함.
//   집계 점수 (3축 평균 + sessionCount + wAurAchieved) + 미션 빈도 시뮬 변수만 전송.
//
// CON-04 금칙어: "치료" / "진단" / "장애" — prompt / 응답 schema / 변수명 / 주석 모두 회피.
//
// 트레이싱: console.debug 로 input/output (서버 사이드만 노출, 자녀 정보 0).

import { z } from "zod";
import { generateJson, RateLimitedError, LLMTimeoutError } from "@/lib/ai/gemini";
import { trackEvent } from "@/lib/analytics";

// ----- Public 계약 -----

/** weekly-aggregator / Server Action 이 본 helper 에 넘기는 입력. */
export interface PredictionInput {
  userId: string;
  /// 직전 N주 (보통 4주) 집계. 비어 있어도 graceful (mock fallback).
  weekHistory: Array<{
    weekNumber: number;
    articulationAvg: number;
    linguisticAvg: number;
    acousticAvg: number;
    sessionCount: number;
    wAurAchieved: boolean;
  }>;
  /// 시뮬레이션용 — UI 슬라이더 변경 시 별도 캐시 키.
  missionFrequency?: "low" | "normal" | "high";
}

/** 본 helper 가 호출자에게 보장하는 응답. 실패 시에도 같은 shape (model: 'mock'). */
export interface PredictionOutput {
  /// 다음 주 예상 평균 점수 (0~100, 1 자리 반올림).
  predicted: number;
  /// 0~1 — mock 시 0.3, 실 Gemini 시 0.7~0.9.
  confidence: number;
  /// audit 용 간단 설명. UI 노출 금지 (자녀 식별 정보 0 — 집계 점수 기반).
  reasoning: string;
  /// 사용된 모델 — fallback 추적용.
  model: "gemini-2.5-flash" | "gemini-2.5-pro" | "mock";
  /// 캐시 hit 여부.
  cached: boolean;
  /// rate limit / API 실패로 인한 stale 응답 여부.
  staleFromRateLimit: boolean;
}

// ----- 상수 -----

const DEFAULT_MODEL = "gemini-2.5-flash" as const;
const TIMEOUT_MS = 10_000;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1h
const RATE_LIMIT_MAX = 5;                     // userId 당 5건 / 1h

// Mock confidence — 실 Gemini 0.7~0.9 대비 명확히 낮춰 UI/분석에서 구분 가능.
const MOCK_CONFIDENCE = 0.3;

// Gemini 응답 schema (CON-04: 의학 용어 회피 — predicted / confidence / reasoning).
const GeminiPredictionSchema = z.object({
  predicted: z.number().min(0).max(100),
  confidence: z.number().min(0).max(1),
  reasoning: z.string().max(500),
});

// ----- In-memory state (Vercel cold start 마다 reset; 보수적) -----

interface CacheEntry {
  output: Omit<PredictionOutput, "cached" | "staleFromRateLimit">;
  expiresAt: number;
}

const predictionCache = new Map<string, CacheEntry>();
const userCallTimestamps = new Map<string, number[]>();

// ----- 키 / 해시 -----

function hashWeekHistory(history: PredictionInput["weekHistory"]): string {
  // 단순 deterministic hash — JSON.stringify 후 빠른 djb2 변형.
  // crypto 미사용 (Edge runtime 안전).
  const json = JSON.stringify(
    history.map((w) => ({
      w: w.weekNumber,
      a: Math.round(w.articulationAvg * 10),
      l: Math.round(w.linguisticAvg * 10),
      c: Math.round(w.acousticAvg * 10),
      s: w.sessionCount,
      g: w.wAurAchieved ? 1 : 0,
    })),
  );
  let h = 5381;
  for (let i = 0; i < json.length; i++) {
    h = ((h << 5) + h) ^ json.charCodeAt(i);
  }
  return (h >>> 0).toString(36);
}

function cacheKey(input: PredictionInput): string {
  const freq = input.missionFrequency ?? "normal";
  return `${input.userId}:${freq}:${hashWeekHistory(input.weekHistory)}`;
}

// ----- Rate limit (userId 당 sliding window 5 calls / 1h) -----

function checkUserRateLimit(userId: string): { allowed: boolean } {
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW_MS;
  const arr = userCallTimestamps.get(userId) ?? [];
  // prune
  const recent = arr.filter((t) => t >= windowStart);
  userCallTimestamps.set(userId, recent);
  return { allowed: recent.length < RATE_LIMIT_MAX };
}

function recordUserCall(userId: string): void {
  const now = Date.now();
  const arr = userCallTimestamps.get(userId) ?? [];
  arr.push(now);
  userCallTimestamps.set(userId, arr);
}

// ----- 모드 판별 (graceful fallback 트리거) -----

type FallbackReason =
  | "api_key_missing"
  | "rate_limited"
  | "api_error"
  | "timeout"
  | "schema_invalid"
  | "disabled"
  | "insufficient_history";

function detectForcedMockReason(input: PredictionInput): FallbackReason | null {
  if (process.env.GEMINI_DISABLED === "1") return "disabled";
  if (process.env.NODE_ENV === "test") return "disabled";
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) return "api_key_missing";
  if (input.weekHistory.length === 0) return "insufficient_history";
  return null;
}

// ----- Mock 예측 (직전 주 평균 + 5, 0~100 클램프) -----

function computeMockPrediction(
  input: PredictionInput,
): Omit<PredictionOutput, "cached" | "staleFromRateLimit"> {
  const history = input.weekHistory;
  // 직전 주 (가장 최근) 의 3축 평균. weekHistory 가 비면 0.
  let baseAvg = 0;
  if (history.length > 0) {
    // 호출 측이 항상 "최근 → 과거" 순으로 정렬한다고 보장하지 않으므로 최대 weekNumber 사용.
    const latest = history.reduce((max, cur) =>
      cur.weekNumber > max.weekNumber ? cur : max,
    );
    baseAvg =
      (latest.articulationAvg + latest.linguisticAvg + latest.acousticAvg) / 3;
  }

  // missionFrequency 시뮬 — low: -2 / normal: 0 / high: +2.
  const freqDelta =
    input.missionFrequency === "high"
      ? 2
      : input.missionFrequency === "low"
        ? -2
        : 0;

  const raw = baseAvg + 5 + freqDelta;
  const predicted = Math.max(0, Math.min(100, Math.round(raw * 10) / 10));

  return {
    predicted,
    confidence: MOCK_CONFIDENCE,
    reasoning: `mock: 직전 주 3축 평균 ${baseAvg.toFixed(1)} + 5 + freq(${input.missionFrequency ?? "normal"})`,
    model: "mock",
  };
}

// ----- Gemini prompt (R4 자녀 식별 정보 0) -----

function buildPrompt(input: PredictionInput): string {
  // weekHistory 를 weekNumber 오름차순으로 정렬 후 직렬화 (오래된 → 최근).
  const sorted = [...input.weekHistory].sort(
    (a, b) => a.weekNumber - b.weekNumber,
  );
  const lines = sorted.map(
    (w) =>
      `- 주 ${w.weekNumber}: 조음 ${w.articulationAvg.toFixed(1)} / 언어 ${w.linguisticAvg.toFixed(1)} / 음향 ${w.acousticAvg.toFixed(1)} (${w.sessionCount}회 발화 세션, 주간 활동 ${w.wAurAchieved ? "충분" : "부족"})`,
  );
  const freq = input.missionFrequency ?? "normal";
  return [
    "다음 주 예상 평균 점수를 회귀 추정하세요.",
    "",
    "직전 주차 추이 (오래된 → 최근):",
    ...lines,
    "",
    `시뮬레이션 미션 빈도: ${freq} (low=주 1~2회, normal=주 3~4회, high=주 5회+)`,
    "",
    "JSON 으로 답하세요 — predicted (0~100 종합 평균), confidence (0~1), reasoning (한국어 1~2문장, 의학 용어 금지).",
  ].join("\n");
}

const SYSTEM_PROMPT = [
  "당신은 아이의 발음 발달 추이를 수치로 추정하는 회귀 보조 모델입니다.",
  "응답은 반드시 JSON 만, 한국어 설명 없음.",
  "발달 안내 표현만 사용. 본 추정은 의료 판단이 아닌 발달 참고 자료.",
].join(" ");

// ----- 메인 export -----

/**
 * FR-C-011 — Gemini 회귀 예측 (graceful fallback wrapper).
 *
 * 절대 throw 하지 않음 — 모든 실패 분기는 mock fallback 으로 통일.
 *   - api_key_missing / disabled → mock + staleFromRateLimit=true + analytics 이벤트
 *   - rate_limited (in-memory window) → mock + staleFromRateLimit=true
 *   - timeout (10s) → mock + staleFromRateLimit=true
 *   - api_error → mock + staleFromRateLimit=true
 *   - schema_invalid (Gemini 응답 형식 위배) → mock + staleFromRateLimit=true
 *
 * 캐시 hit: { ...mock 또는 gemini 결과, cached: true, staleFromRateLimit: 이전 호출 값 보존 }.
 */
export async function predictNextScore(
  input: PredictionInput,
): Promise<PredictionOutput> {
  // 1. 캐시 hit?
  const key = cacheKey(input);
  const cached = predictionCache.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    console.debug("[predictions/gemini] cache hit", { key, model: cached.output.model });
    return {
      ...cached.output,
      cached: true,
      // 캐시된 결과가 mock 이면 stale 의미 유지, 실 호출이면 false.
      staleFromRateLimit: cached.output.model === "mock",
    };
  }

  // 2. 강제 mock 분기 (env / test / api_key_missing / weekHistory 비어있음).
  const forced = detectForcedMockReason(input);
  if (forced) {
    const mock = computeMockPrediction(input);
    persistCache(key, mock);
    emitFallbackEvent(input.userId, forced);
    console.debug("[predictions/gemini] forced mock", { reason: forced, predicted: mock.predicted });
    return { ...mock, cached: false, staleFromRateLimit: true };
  }

  // 3. Rate limit 사전 검사 (in-memory sliding window).
  const rl = checkUserRateLimit(input.userId);
  if (!rl.allowed) {
    const mock = computeMockPrediction(input);
    persistCache(key, mock);
    emitFallbackEvent(input.userId, "rate_limited");
    console.debug("[predictions/gemini] rate_limited", { userId: input.userId });
    return { ...mock, cached: false, staleFromRateLimit: true };
  }

  // 4. Gemini 실 호출 (lib/ai/gemini.generateJson 사용 — SEC-004 글로벌 RPM 추가 통과).
  try {
    const prompt = buildPrompt(input);
    const result = await withLocalTimeout(
      generateJson({
        system: SYSTEM_PROMPT,
        prompt,
        schema: GeminiPredictionSchema,
        model: DEFAULT_MODEL,
        // lib/ai/gemini 의 sliding window rate limit 통과 + 카운트.
        userId: input.userId,
      }),
      TIMEOUT_MS,
    );

    recordUserCall(input.userId);

    const output: Omit<PredictionOutput, "cached" | "staleFromRateLimit"> = {
      predicted: clamp(result.predicted),
      confidence: clamp01(result.confidence),
      reasoning: result.reasoning,
      model: DEFAULT_MODEL,
    };
    persistCache(key, output);
    console.debug("[predictions/gemini] gemini success", {
      userId: input.userId,
      predicted: output.predicted,
      confidence: output.confidence,
    });
    return { ...output, cached: false, staleFromRateLimit: false };
  } catch (err) {
    const reason = classifyError(err);
    const mock = computeMockPrediction(input);
    persistCache(key, mock);
    emitFallbackEvent(input.userId, reason);
    console.debug("[predictions/gemini] fallback", {
      userId: input.userId,
      reason,
      err: err instanceof Error ? err.message : String(err),
    });
    return { ...mock, cached: false, staleFromRateLimit: true };
  }
}

// ----- 내부 유틸 -----

function persistCache(
  key: string,
  output: Omit<PredictionOutput, "cached" | "staleFromRateLimit">,
): void {
  predictionCache.set(key, { output, expiresAt: Date.now() + CACHE_TTL_MS });
}

function clamp(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n * 10) / 10));
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

function classifyError(err: unknown): FallbackReason {
  if (err instanceof RateLimitedError) return "rate_limited";
  if (err instanceof LLMTimeoutError) return "timeout";
  const msg = err instanceof Error ? err.message.toLowerCase() : String(err).toLowerCase();
  if (msg.includes("timeout") || msg.includes("timed out")) return "timeout";
  if (msg.includes("rate limit") || msg.includes("429") || msg.includes("quota")) {
    return "rate_limited";
  }
  if (
    msg.includes("schema") ||
    msg.includes("zod") ||
    msg.includes("invalid") ||
    msg.includes("validation")
  ) {
    return "schema_invalid";
  }
  return "api_error";
}

function withLocalTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new LLMTimeoutError(`prediction timeout ${ms}ms`)), ms);
    promise.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (e) => {
        clearTimeout(timer);
        reject(e);
      },
    );
  });
}

function emitFallbackEvent(userId: string, reason: FallbackReason): void {
  try {
    trackEvent("prediction_fallback_used", { userId, reason });
  } catch {
    // analytics 실패가 흐름을 막지 않도록 graceful.
  }
}

// ----- 테스트 전용 export -----

/** 테스트용 — 캐시 + rate-limit 카운터 초기화. */
export function __resetPredictionsGeminiForTest(): void {
  predictionCache.clear();
  userCallTimestamps.clear();
}

/** 테스트용 — rate-limit 카운터 강제 채움 (5건 채워서 rate_limited 시뮬). */
export function __fillRateLimitForTest(userId: string, count = RATE_LIMIT_MAX): void {
  const now = Date.now();
  userCallTimestamps.set(
    userId,
    Array.from({ length: count }, () => now),
  );
}
