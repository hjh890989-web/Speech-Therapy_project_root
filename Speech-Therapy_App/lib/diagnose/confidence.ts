// FR-C-002 (#25) — 발음 발달 확인 본인 평가 confidence Gemini 산출 helper.
//
// 본 모듈의 목적: app/actions/diagnosis.ts 의 `confidence = 95` 하드코딩 제거.
// FR-C-002 자동 HITL 트리거 (lib/hitl/enqueue.ts maybeEnqueueHitl, confidence < 70 분기) 가
// 결정적 95 값으로 인해 dormant 상태였음 → 본 helper 가 실 신뢰도를 반환해 트리거 활성화.
//
// 책임 분리 (lib/predictions/gemini.ts 와 같은 패턴):
//   - lib/ai/gemini.ts       : 저수준 Gemini 호출 (rate limit / timeout / throw 가능)
//   - 본 모듈                 : "절대 throw 하지 않는" 표면, 실패 시 fallback 점수 산출 보장
//
// 두 가지 confidence 의미 구분 (README/대화기록 참조):
//   - 회귀 예측 confidence (lib/predictions/gemini.ts) — 다음 주 예측 점수의 신뢰도 (0~1)
//   - 본 모듈의 평가 confidence (FR-C-002) — AI 가 본인의 평가 점수에 대한 신뢰도 (0~100)
//     낮을수록 전문가 검토 필요.
//
// 환경 변수 / 모드:
//   - GOOGLE_GENERATIVE_AI_API_KEY 미설정       → fallback (source: 'fallback', reason: 'api_key_missing')
//   - GEMINI_DISABLED === '1'                    → fallback (reason: 'disabled')
//   - NODE_ENV === 'test'                        → fallback (reason: 'disabled')
//
// Fallback 공식 (Gemini 미응답 / 에러 / mock 모드):
//   1) 3축 점수 (articulation / linguistic / acoustic) 평균을 baseline 으로 사용
//   2) 점수 분산이 크면 (max - min ≥ 30) 분산 패널티 -15 점
//   3) 0~100 clamp
//   즉 평균이 낮거나 점수가 엇갈리면 confidence 도 낮아짐 → 자연스러운 HITL 트리거.
//
// R4 (자녀 식별 정보 0): Gemini prompt 에 userId / 이름 / email / transcript / audioUrl 절대 미포함.
//   3축 점수 (숫자) + targetPhoneme + childAgeMonths (집계 변수) 만 전송.
//
// CON-04 금칙어 ("치료" / "장애" / "진단" 등) — prompt / 응답 schema / 변수명 / 주석 모두 회피.

import { z } from "zod";
import { generateJson, RateLimitedError, LLMTimeoutError } from "@/lib/ai/gemini";

// ----- Public 계약 -----

/** 호출 측 (app/actions/diagnosis.ts) 가 본 helper 에 넘기는 입력. */
export interface DiagnosisConfidenceInput {
  /// 결정적 알고리즘이 산출한 자모 정확도 (0~100).
  articulationScore: number;
  /// 결정적 알고리즘이 산출한 음절/어휘 완성도 (0~100).
  linguisticScore: number;
  /// 결정적 알고리즘이 산출한 음향 특성 점수 (0~100).
  acousticScore: number;
  /// 시드 5종 한국어 음소.
  targetPhoneme: "ㄱ" | "ㄴ" | "ㅅ" | "ㅈ" | "ㄹ";
  /// 만 2~7세 자녀 월령.
  childAgeMonths: number;
  /// rate limit / audit 추적용 (해싱 책임은 호출 측). R4: prompt 에 미주입.
  userId: string;
}

/** 호출 측에 보장하는 응답. 실패 분기 모두 동일 shape. */
export interface DiagnosisConfidenceOutput {
  /// 0~100, < 70 이면 FR-C-002 maybeEnqueueHitl 자동 트리거.
  confidence: number;
  /// 출처 — Gemini 실 호출 성공 vs fallback 분기.
  source: "gemini" | "fallback";
  /// fallback 경로일 때 사유 (계측 / 디버깅용).
  reason?: FallbackReason;
}

export type FallbackReason =
  | "api_key_missing"
  | "rate_limited"
  | "api_error"
  | "timeout"
  | "schema_invalid"
  | "disabled";

// ----- 상수 -----

const DEFAULT_MODEL = "gemini-2.5-flash-lite" as const;
const TIMEOUT_MS = 8_000;

// Gemini 응답 schema — confidence 단일 필드 + 짧은 reasoning (텔레메트리 용도, UI 노출 X).
// CON-04 금칙어 회피 위해 reasoning 길이 제한 (500자) + zod max() 검증.
const GeminiConfidenceSchema = z.object({
  scoreConfidence: z.number().min(0).max(100),
  reasoning: z.string().max(500).optional(),
});

// ----- Public API -----

/**
 * FR-C-002 진단 평가 confidence 산출.
 *
 * 절대 throw 하지 않음 — 모든 실패 분기는 fallback 으로 통일.
 *   - api_key_missing / disabled (test / GEMINI_DISABLED) → fallback + reason
 *   - rate_limited / timeout / api_error / schema_invalid → fallback + reason
 *
 * 정상 Gemini 응답 시: { confidence: 0~100, source: 'gemini' }.
 */
export async function computeDiagnosisConfidence(
  input: DiagnosisConfidenceInput,
): Promise<DiagnosisConfidenceOutput> {
  // 1. 강제 fallback 분기 (env / test / api_key_missing).
  const forced = detectForcedFallback();
  if (forced) {
    return {
      confidence: computeFallbackConfidence(input),
      source: "fallback",
      reason: forced,
    };
  }

  // 2. Gemini 실 호출 (lib/ai/gemini.generateJson — 글로벌 RPM / userId 한도 통과).
  try {
    const result = await withLocalTimeout(
      generateJson({
        system: SYSTEM_PROMPT,
        prompt: buildPrompt(input),
        schema: GeminiConfidenceSchema,
        model: DEFAULT_MODEL,
        userId: input.userId,
      }),
      TIMEOUT_MS,
    );
    return {
      confidence: clamp0to100(result.scoreConfidence),
      source: "gemini",
    };
  } catch (err) {
    const reason = classifyError(err);
    console.debug("[diagnose/confidence] fallback", {
      reason,
      err: err instanceof Error ? err.message : String(err),
    });
    return {
      confidence: computeFallbackConfidence(input),
      source: "fallback",
      reason,
    };
  }
}

/**
 * Fallback 공식 (Gemini 미응답 / 에러 / mock 모드).
 *
 * 공식:
 *   baseline = clamp(평균(articulation, linguistic, acoustic), 0, 100)
 *   variancePenalty = (max - min) >= 30 ? 15 : 0
 *   confidence = clamp(baseline - variancePenalty, 0, 100)
 *
 * 의도:
 *   - 3축 점수가 모두 높고 비슷 → 높은 confidence (HITL 트리거 X)
 *   - 평균이 낮음 → 낮은 confidence (HITL 트리거 O)
 *   - 점수가 엇갈림 (분산 큼) → 패널티로 confidence 추가 감소 (HITL 트리거 O)
 *
 * 본 함수는 export — 테스트 + 향후 분석 이벤트 (diagnose_confidence_low) 에서 재사용 가능.
 */
export function computeFallbackConfidence(input: {
  articulationScore: number;
  linguisticScore: number;
  acousticScore: number;
}): number {
  const scores = [input.articulationScore, input.linguisticScore, input.acousticScore];
  const baseline = scores.reduce((a, b) => a + b, 0) / scores.length;
  const spread = Math.max(...scores) - Math.min(...scores);
  const variancePenalty = spread >= 30 ? 15 : 0;
  return clamp0to100(baseline - variancePenalty);
}

// ----- 내부 유틸 -----

function detectForcedFallback(): FallbackReason | null {
  if (process.env.GEMINI_DISABLED === "1") return "disabled";
  if (process.env.NODE_ENV === "test") return "disabled";
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) return "api_key_missing";
  return null;
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
    const timer = setTimeout(
      () => reject(new LLMTimeoutError(`diagnose confidence timeout ${ms}ms`)),
      ms,
    );
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

function clamp0to100(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n * 10) / 10));
}

// ----- Gemini prompt (R4 자녀 식별 정보 0) -----

const SYSTEM_PROMPT = [
  "당신은 만 2~7세 아동의 발음 발달 점수에 대한 자기 평가 보조 모델입니다.",
  "응답은 반드시 JSON 만, 한국어 평문 추가 금지.",
  "발달 안내 표현만 사용. 본 산출은 의료 판단이 아닌 부모용 발달 참고 자료.",
  "scoreConfidence 는 본인의 점수 산정에 대한 신뢰도 (0=매우 불확실, 100=매우 확실).",
  "60 이하는 전문가 검토를 권장하는 임계값으로 사용됩니다.",
].join(" ");

function buildPrompt(input: DiagnosisConfidenceInput): string {
  return [
    "다음 3축 점수와 메타데이터를 바탕으로 scoreConfidence (0~100) 를 산출하세요.",
    "",
    `- 조음 점수: ${input.articulationScore.toFixed(1)}`,
    `- 언어 점수: ${input.linguisticScore.toFixed(1)}`,
    `- 음향 점수: ${input.acousticScore.toFixed(1)}`,
    `- 타겟 음소: ${input.targetPhoneme}`,
    `- 월령: ${input.childAgeMonths}개월`,
    "",
    "기준:",
    "- 3축이 모두 높고 일관되면 scoreConfidence 90+",
    "- 평균이 낮거나 점수가 엇갈리면 scoreConfidence 70 이하",
    "- 매우 낮은 평균 또는 큰 분산은 scoreConfidence 50 이하",
    "",
    "JSON 으로 답하세요 — { scoreConfidence: 0~100, reasoning: 한국어 1문장 (의학 용어 금지) }.",
  ].join("\n");
}
