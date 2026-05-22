// API-011 — Vercel AI SDK + Google Gemini 어댑터.
// FR-C-001 의 2/4 단계가 본 모듈의 generateJson / generateText 사용.
//
// 환경 변수:
// - GOOGLE_GENERATIVE_AI_API_KEY (Google AI Studio 발급)
//
// Sprint 3 §2 E (SEC-004 §E-1) — In-memory rate limiter 통합:
//  - 글로벌 RPM 14 (Gemini free tier 15 안전 마진 1)
//  - 사용자당 일 50회 (REQ-NF-018 비용 보호)
//  - 다중 인스턴스 안전성은 §E-2 (Upstash Redis) 에서 강화 예정

import { google } from "@ai-sdk/google";
import { generateObject, generateText } from "ai";
import type { ZodTypeAny, z } from "zod";

import { checkRateLimit, recordCall, RateLimitedError } from "@/lib/ratelimit";
import { trackError, trackSuccess } from "@/lib/error-tracking";
import type { GeminiErrorCode } from "@/lib/error-catalog";
export { RateLimitedError } from "@/lib/ratelimit";

// gemini-2.5-flash-lite — gemini-2.5-flash 대비 thinking 모드 없음 → 응답 속도 ~50% 빠름.
// 진단 스코어링은 JSON 4 필드 단순 분류 → lite 품질로 충분.
// gemini-1.5-flash 는 2026 봄 v1beta 에서 deprecated → 404 NOT_FOUND 회피.
const DEFAULT_MODEL = "gemini-2.5-flash-lite";
const LLM_TIMEOUT_MS = 15_000;

export class LLMTimeoutError extends Error {
  constructor(message = "LLM 호출이 15초를 초과했습니다") {
    super(message);
    this.name = "LLMTimeoutError";
  }
}

function ensureApiKey() {
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    throw new Error(
      "GOOGLE_GENERATIVE_AI_API_KEY 환경변수가 설정되지 않았습니다. " +
        "https://aistudio.google.com/apikey 에서 발급 후 .env 또는 Vercel 환경 변수에 추가하세요.",
    );
  }
}

function withTimeout<T>(promise: Promise<T>, ms = LLM_TIMEOUT_MS): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new LLMTimeoutError()), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}

/// API-001 / FR-C-001 §2 — JSON 형식 응답 (Zod 검증 보장).
export async function generateJson<S extends ZodTypeAny>(args: {
  system: string;
  prompt: string;
  schema: S;
  model?: string;
  /// Sprint 3 §2 E — userId 지정 시 rate limiter 적용. 없으면 미적용 (legacy).
  userId?: string;
}): Promise<z.infer<S>> {
  ensureApiKey();
  if (args.userId) enforceRateLimit(args.userId);
  const model = google(args.model ?? DEFAULT_MODEL);
  try {
    const result = await withTimeout(
      generateObject({
        model,
        system: args.system,
        prompt: args.prompt,
        schema: args.schema,
      }),
    );
    if (args.userId) recordCall(args.userId);
    // generateObject 의 추론 타입은 InferSchema 헬퍼라 Zod output 과 한 단계 어긋남 →
    // Zod 검증을 한 번 더 통과시켜 z.infer<S> 로 안전 확정.
    const parsed = args.schema.parse(result.object) as z.infer<S>;
    trackSuccess("gemini");
    return parsed;
  } catch (err) {
    trackError(classifyGeminiError(err));
    throw err;
  }
}

/// FR-C-001 §4 — Plain text 응답 (쿠션 카피 등).
export async function generatePlainText(args: {
  system: string;
  prompt: string;
  model?: string;
  /// Sprint 3 §2 E — userId 지정 시 rate limiter 적용. 없으면 미적용 (legacy).
  userId?: string;
}): Promise<string> {
  ensureApiKey();
  if (args.userId) enforceRateLimit(args.userId);
  const model = google(args.model ?? DEFAULT_MODEL);
  try {
    const result = await withTimeout(
      generateText({
        model,
        system: args.system,
        prompt: args.prompt,
      }),
    );
    if (args.userId) recordCall(args.userId);
    trackSuccess("gemini");
    return result.text;
  } catch (err) {
    trackError(classifyGeminiError(err));
    throw err;
  }
}

/// MON-002 — Gemini 에러 분류 (error-catalog GeminiErrorCode 매핑).
function classifyGeminiError(err: unknown): GeminiErrorCode {
  if (err instanceof RateLimitedError) return "gemini_rate_limited";
  if (err instanceof LLMTimeoutError) return "gemini_timeout";
  const msg = err instanceof Error ? err.message.toLowerCase() : String(err).toLowerCase();
  if (msg.includes("429") || msg.includes("rate limit") || msg.includes("quota")) return "gemini_429";
  if (msg.includes("5") && /\b5\d{2}\b/.test(msg)) return "gemini_5xx";
  if (msg.includes("schema") || msg.includes("zod") || msg.includes("invalid")) return "gemini_schema_invalid";
  return "gemini_unknown";
}

/// 호출 전 rate-limit 검사 — 차단 시 RateLimitedError throw (Gemini 미호출 보호).
function enforceRateLimit(userId: string): void {
  const check = checkRateLimit(userId);
  if (!check.allowed) {
    throw new RateLimitedError(check.reason!, check.retryAfterSec ?? 60);
  }
}
