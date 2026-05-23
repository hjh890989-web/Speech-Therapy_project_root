// FR-C-017 (#40 Replace D8) — AI 쿠션어 알림장 생성 helper.
//
// 책임:
//   - Gemini streamText / generateText 양쪽 표면 제공 (UI 는 streaming 으로 페인트, fallback 은 동기 텍스트)
//   - 절대 throw 하지 않음 — 모든 실패 분기는 템플릿 fallback 으로 통일
//   - CON-04 금칙어 (치료 / 진단 / 장애 등) 검증 + 발견 시 자동 swap → 템플릿
//   - R4 자녀 식별 정보 보호: studentName 은 부모 컨텍스트 (원장 → 부모 직접 전달) 라 카피에 포함 OK,
//     단 외부 (Slack / GA) 노출은 호출 측 책임.
//
// 라이브러리:
//   - Vercel AI SDK (`ai` v6) — `streamText`/`generateText`
//   - `@ai-sdk/google` — `google("gemini-2.5-flash")`
//
// 모드 (graceful 분기 매트릭스):
//   1. GOOGLE_GENERATIVE_AI_API_KEY 미설정       → template (api_key_missing)
//   2. GEMINI_DISABLED === '1'                    → template (disabled)
//   3. NODE_ENV === 'test'                        → template (disabled, 테스트 결정성)
//   4. Gemini timeout (10s)                       → template (timeout)
//   5. Gemini RateLimitedError                    → template (rate_limited)
//   6. Gemini 일반 에러                           → template (api_error)
//   7. Gemini 응답 비어있음                       → template (empty_response)
//   8. Gemini 응답에 CON-04 금칙어 포함            → template (banned_term)
//
// streamText vs generateText:
//   - 본 helper 는 **양쪽 다 export** 한다:
//     - `streamCushionNote()` — Route Handler 가 ReadableStream<string> 반환 (UI 한글자씩 페인트, REQ-FUNC-056 ≤ 5s 페인트)
//     - `generateCushionNote()` — Server Action / 테스트가 전체 문자열 반환 (간단 사용)
//   - streaming 은 사용자 체감 응답시간(TTFB)를 ~1s 이내로 줄여 D8 Replace 의 핵심 가치를 살림
//   - 양쪽 모두 동일 prompt + 동일 fallback 매트릭스 + 동일 금칙어 검증 통과
//
// 템플릿 fallback:
//   - generateCushionTemplate(input) — 음소별 + 점수 구간별 정적 카피 (CON-04 통과 보장).
//   - 음소 5종 × 3 점수 구간 (low<60 / mid 60~80 / high>80) → 15 변형. 짧게 2~3문장.

import { google } from "@ai-sdk/google";
import { streamText, generateText } from "ai";

import { LLMTimeoutError, RateLimitedError } from "@/lib/ai/gemini";
import { hasBannedTerm } from "@/lib/forbidden-words";

// ----- Public 계약 -----

export type TargetPhoneme = "ㄱ" | "ㄴ" | "ㅅ" | "ㅈ" | "ㄹ";

export interface CushionInput {
  /** 진단/평가 결과 ID (audit + cache key). */
  evaluationResultId: string;
  /** 자녀 호칭 (선택). R4: 원장 → 부모 컨텍스트라 카피에 포함 OK. */
  studentName?: string;
  /** 한국어 음소. */
  targetPhoneme: TargetPhoneme;
  /** 0~100. */
  articulationScore: number;
  /** 0~100. */
  linguisticScore: number;
  /** 0~100. */
  acousticScore: number;
}

/** generateCushionNote / streamCushionNote 가 호출자에게 보장하는 메타. */
export type CushionSource = "gemini" | "template";

export type CushionFallbackReason =
  | "api_key_missing"
  | "disabled"
  | "timeout"
  | "rate_limited"
  | "api_error"
  | "empty_response"
  | "banned_term";

export interface CushionGenerateResult {
  text: string;
  source: CushionSource;
  /** template fallback 사유 (source='gemini' 시 null). */
  fallbackReason: CushionFallbackReason | null;
}

// ----- 상수 -----

const DEFAULT_MODEL = "gemini-2.5-flash" as const;
const STREAM_TIMEOUT_MS = 10_000;

// ----- Prompt (CON-04 + R4 명시) -----

const SYSTEM_PROMPT = [
  "당신은 부모님께 자녀의 발음 발달 결과를 부드럽게 전달하는 알림장 작성 도우미입니다.",
  "원장님이 부모님께 카카오톡/문자로 직접 전달할 수 있도록 따뜻하고 격려하는 어조로 작성하세요.",
  "절대 사용 금지: '진단', '장애', '치료', '환자', '병', '증상', '처방', '병원', '아프', '문제아'.",
  "허용 표현: '발음 발달 확인', '함께 연습', '발달 단계', '점점 좋아지고 있어요'.",
  "응답은 2~3문장, 100~300자 사이 한국어 plain text. 마크다운 / JSON / 줄바꿈 외 형식 금지.",
].join(" ");

function buildUserPrompt(input: CushionInput): string {
  const phoneme = input.targetPhoneme;
  const nameLine = input.studentName
    ? `자녀 호칭: ${input.studentName}`
    : "자녀 호칭: (생략)";
  return [
    `오늘 함께 연습한 음소: ${phoneme}`,
    nameLine,
    `발음 발달 확인 점수 (0~100): 조음 ${Math.round(input.articulationScore)}, 언어 ${Math.round(input.linguisticScore)}, 음향 ${Math.round(input.acousticScore)}`,
    "",
    "위 정보를 바탕으로 부모님께 보내는 알림장 한 단락 (2~3문장, 100~300자) 을 작성하세요.",
    "점수는 직접 노출하지 말고 '잘하고 있어요' / '함께 더 연습해 볼게요' 같은 격려 표현으로 풀어 주세요.",
  ].join("\n");
}

// ----- 모드 판별 -----

function detectForcedTemplateReason(): CushionFallbackReason | null {
  if (process.env.GEMINI_DISABLED === "1") return "disabled";
  if (process.env.NODE_ENV === "test") return "disabled";
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) return "api_key_missing";
  return null;
}

// ----- 템플릿 fallback (음소 5종 × 점수 구간 3종 = 15 변형, CON-04 통과 보장) -----

const PHONEME_DESC: Record<TargetPhoneme, string> = {
  ㄱ: "ㄱ",
  ㄴ: "ㄴ",
  ㅅ: "ㅅ",
  ㅈ: "ㅈ",
  ㄹ: "ㄹ",
};

function averageScore(input: CushionInput): number {
  return (
    (input.articulationScore + input.linguisticScore + input.acousticScore) / 3
  );
}

function scoreBand(avg: number): "low" | "mid" | "high" {
  if (avg < 60) return "low";
  if (avg <= 80) return "mid";
  return "high";
}

/**
 * Gemini 실패 시 사용하는 정적 카피.
 * CON-04 통과 보장 (사람이 작성한 카피).
 * 음소 + 점수 구간별 15 변형. studentName 이 있으면 첫머리에 호명 추가.
 */
export function generateCushionTemplate(input: CushionInput): string {
  const phoneme = PHONEME_DESC[input.targetPhoneme] ?? input.targetPhoneme;
  const avg = averageScore(input);
  const band = scoreBand(avg);
  const namePrefix = input.studentName
    ? `${input.studentName} 보호자님, `
    : "보호자님, ";

  const COPY: Record<"low" | "mid" | "high", string> = {
    low: `오늘 ${phoneme} 발음을 함께 연습했어요. 처음엔 조금 어려워했지만 끝까지 잘 따라와 주었어요. 집에서도 짧은 단어로 천천히 한 번씩 더 들려주시면 큰 도움이 돼요.`,
    mid: `오늘 ${phoneme} 발음 연습을 잘 따라와 주었어요. 또래 발달 단계에서 안정적으로 자라고 있는 모습이에요. 가벼운 마음으로 가정에서도 한 번씩 함께 소리내 보시면 좋아요.`,
    high: `오늘 ${phoneme} 발음을 또렷하게 잘 표현해 주었어요. 평소 가정에서 연습해 주신 덕분에 안정적으로 자리잡고 있어요. 칭찬을 듬뿍 해 주시면 자신감이 더 자라요.`,
  };

  return `${namePrefix}${COPY[band]}`;
}

// ----- Gemini call helpers -----

function ensureApiKey(): void {
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    throw new Error("GOOGLE_GENERATIVE_AI_API_KEY missing");
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new LLMTimeoutError(`cushion stream timeout ${ms}ms`)),
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

function classifyError(err: unknown): CushionFallbackReason {
  if (err instanceof RateLimitedError) return "rate_limited";
  if (err instanceof LLMTimeoutError) return "timeout";
  const msg = err instanceof Error ? err.message.toLowerCase() : String(err).toLowerCase();
  if (msg.includes("timeout") || msg.includes("timed out")) return "timeout";
  if (msg.includes("rate limit") || msg.includes("429") || msg.includes("quota")) return "rate_limited";
  return "api_error";
}

// ----- generateCushionNote (전체 텍스트, Server Action 용) -----

/**
 * 동기적으로 전체 알림장 텍스트를 생성 (streaming 아님).
 *
 * - Server Action 안에서 사용하면 클라이언트로 1 응답에 반환 가능.
 * - 실패 시 템플릿 fallback (절대 throw 안 함).
 * - Gemini 응답에 CON-04 금칙어 포함 시 자동 swap.
 */
export async function generateCushionNote(
  input: CushionInput,
): Promise<CushionGenerateResult> {
  const forced = detectForcedTemplateReason();
  if (forced) {
    return {
      text: generateCushionTemplate(input),
      source: "template",
      fallbackReason: forced,
    };
  }

  try {
    ensureApiKey();
    const result = await withTimeout(
      generateText({
        model: google(DEFAULT_MODEL),
        system: SYSTEM_PROMPT,
        prompt: buildUserPrompt(input),
      }),
      STREAM_TIMEOUT_MS,
    );
    const text = (result.text ?? "").trim();
    if (!text) {
      return {
        text: generateCushionTemplate(input),
        source: "template",
        fallbackReason: "empty_response",
      };
    }
    if (hasBannedTerm(text)) {
      // CON-04 — 금칙어 포함 응답은 무조건 template 로 swap.
      return {
        text: generateCushionTemplate(input),
        source: "template",
        fallbackReason: "banned_term",
      };
    }
    return { text, source: "gemini", fallbackReason: null };
  } catch (err) {
    return {
      text: generateCushionTemplate(input),
      source: "template",
      fallbackReason: classifyError(err),
    };
  }
}

// ----- streamCushionNote (ReadableStream<string>, Route Handler 용) -----

/**
 * Gemini streamText 호출 → text-delta 만 추출한 ReadableStream<string>.
 *
 * - forced template 분기 (api_key_missing / disabled) 또는 streamText 동기 throw 시:
 *   템플릿 텍스트를 단일 chunk 로 흘려보내는 ReadableStream 반환 → 호출 측 흐름 동일.
 * - 응답 중간 비동기 에러는 stream 안에서 처리 — 누적 텍스트 + 금칙어 검사 후 swap 분기는
 *   route handler / 호출자가 stream 소진 후 별도 검증 책임. (본 함수는 raw stream 만 제공.)
 *
 * 사용 예 (Route Handler):
 *   const stream = await streamCushionNote(input);
 *   return new Response(stream, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
 */
export async function streamCushionNote(
  input: CushionInput,
): Promise<ReadableStream<string>> {
  const forced = detectForcedTemplateReason();
  if (forced) {
    return makeStaticStream(generateCushionTemplate(input));
  }

  let textStream: AsyncIterable<string>;
  try {
    ensureApiKey();
    // streamText 자체는 동기 호출 (Promise 반환 X) — 내부 비동기 에러는 stream 안에서 발생.
    const result = streamText({
      model: google(DEFAULT_MODEL),
      system: SYSTEM_PROMPT,
      prompt: buildUserPrompt(input),
    });
    textStream = result.textStream;
  } catch {
    // 동기 throw (api key 누락 등) — 템플릿 단일 chunk fallback.
    return makeStaticStream(generateCushionTemplate(input));
  }

  // textStream 을 ReadableStream<string> 으로 변환 + 타임아웃 + 금칙어 swap.
  const template = generateCushionTemplate(input);
  return new ReadableStream<string>({
    async start(controller) {
      let accumulated = "";
      let timedOut = false;
      const timer = setTimeout(() => {
        timedOut = true;
        controller.enqueue(template);
        controller.close();
      }, STREAM_TIMEOUT_MS);

      try {
        for await (const chunk of textStream) {
          if (timedOut) return;
          if (typeof chunk !== "string" || chunk.length === 0) continue;
          accumulated += chunk;
          controller.enqueue(chunk);
        }
        clearTimeout(timer);

        const trimmed = accumulated.trim();
        if (!trimmed) {
          // 빈 응답 — 템플릿 단일 chunk 로 보강 후 종료.
          controller.enqueue(template);
        } else if (hasBannedTerm(trimmed)) {
          // CON-04 — 금칙어 발견 시 별도 chunk 로 "swap" 신호 + template.
          // UI 는 이 시점에 누적 텍스트를 template 로 교체할 책임.
          controller.enqueue("\n[__CUSHION_SWAP__]\n");
          controller.enqueue(template);
        }
        controller.close();
      } catch {
        clearTimeout(timer);
        // stream 중간 에러 — 부분 누적 + 템플릿 보강.
        if (!accumulated.trim()) {
          controller.enqueue(template);
        } else if (hasBannedTerm(accumulated)) {
          controller.enqueue("\n[__CUSHION_SWAP__]\n");
          controller.enqueue(template);
        }
        controller.close();
      }
    },
  });
}

function makeStaticStream(text: string): ReadableStream<string> {
  return new ReadableStream<string>({
    start(controller) {
      controller.enqueue(text);
      controller.close();
    },
  });
}

/** 테스트용 — banned term swap 마커 (UI 가 인지). */
export const CUSHION_SWAP_MARKER = "[__CUSHION_SWAP__]" as const;
