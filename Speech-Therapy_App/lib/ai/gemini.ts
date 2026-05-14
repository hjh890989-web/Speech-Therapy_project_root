// API-011 — Vercel AI SDK + Google Gemini 어댑터.
// FR-C-001 의 2/4 단계가 본 모듈의 generateJson / generateText 사용.
//
// 환경 변수:
// - GOOGLE_GENERATIVE_AI_API_KEY (Google AI Studio 발급)
//
// Sprint 1 단순화:
// - Rate Limiter (SEC-004) 미통합 — Google free tier RPM 15 안에서 운용.
// - Fallback provider (OpenAI/Anthropic) 골격만, 본격은 별도 PR.
// - 토큰 사용량 로깅은 console + 향후 Supabase 로 확장.

import { google } from "@ai-sdk/google";
import { generateObject, generateText } from "ai";
import type { ZodTypeAny, z } from "zod";

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
}): Promise<z.infer<S>> {
  ensureApiKey();
  const model = google(args.model ?? DEFAULT_MODEL);
  const result = await withTimeout(
    generateObject({
      model,
      system: args.system,
      prompt: args.prompt,
      schema: args.schema,
    }),
  );
  // generateObject 의 추론 타입은 InferSchema 헬퍼라 Zod output 과 한 단계 어긋남 →
  // Zod 검증을 한 번 더 통과시켜 z.infer<S> 로 안전 확정.
  return args.schema.parse(result.object) as z.infer<S>;
}

/// FR-C-001 §4 — Plain text 응답 (쿠션 카피 등).
export async function generatePlainText(args: {
  system: string;
  prompt: string;
  model?: string;
}): Promise<string> {
  ensureApiKey();
  const model = google(args.model ?? DEFAULT_MODEL);
  const result = await withTimeout(
    generateText({
      model,
      system: args.system,
      prompt: args.prompt,
    }),
  );
  return result.text;
}
