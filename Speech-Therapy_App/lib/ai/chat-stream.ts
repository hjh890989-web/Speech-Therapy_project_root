// API-NEW-F15-1 — F15 챗봇 안전 응답 스트림 (Gemini streamText + timeout/fallback + 금칙어 filterStream).
//
// cushion(lib/cushion/generate.ts streamCushionNote) 패턴 복제:
//   - 절대 throw 안 함 — 모든 실패(키 부재 / GEMINI_DISABLED / NODE_ENV=test / timeout / 중간 에러)는 안전 멘트 fallback.
//   - 생성 결과는 filterStream(profanity-filter)을 통과 — 금칙어 부분 노출 차단(3중 방어의 2층).
//   - Node 런타임(Prisma 7 Edge 비호환 — 프로젝트 전 route 일관). force-dynamic 은 route 측.

import { google } from "@ai-sdk/google";
import { streamText } from "ai";

import { filterStream } from "@/lib/ai/profanity-filter";
import { F15_SYSTEM_PROMPT } from "@/lib/ai/chat-system-prompt";

// gemini-2.5-flash — cushion 과 동일. (task 명세의 gemini-1.5-pro 는 2026 봄 deprecated → 404 회피 + p95 충족.)
const CHAT_MODEL = "gemini-2.5-flash";
const STREAM_TIMEOUT_MS = 10_000;

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

/// 안전 fallback — Gemini 미가용 시 의료/단정 0건 격려 멘트.
export const CHAT_FALLBACK_REPLY =
  "지금은 천천히 함께 이야기해 볼까요? 오늘 뭐 하고 놀았는지 알려줄래요? 😊";

/// 강제 fallback 분기(키 부재 / 비활성 / 테스트 결정성) — cushion detectForcedTemplateReason 패턴.
function forcedFallbackReason(): string | null {
  if (process.env.GEMINI_DISABLED === "1") return "disabled";
  if (process.env.NODE_ENV === "test") return "disabled";
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) return "api_key_missing";
  return null;
}

function staticStream(text: string): ReadableStream<string> {
  return new ReadableStream<string>({
    start(controller) {
      controller.enqueue(text);
      controller.close();
    },
  });
}

/**
 * F15 챗봇 응답을 ReadableStream<string> 으로 반환. 항상 안전(검열 통과) — 호출 측은 그대로 흘리면 된다.
 */
export function streamChatReply(messages: ChatTurn[]): ReadableStream<string> {
  if (forcedFallbackReason()) return staticStream(CHAT_FALLBACK_REPLY);

  let textStream: AsyncIterable<string>;
  try {
    const result = streamText({
      model: google(CHAT_MODEL),
      system: F15_SYSTEM_PROMPT,
      messages,
    });
    textStream = result.textStream;
  } catch {
    return staticStream(CHAT_FALLBACK_REPLY);
  }

  const raw = new ReadableStream<string>({
    async start(controller) {
      let accumulated = "";
      let timedOut = false;
      const timer = setTimeout(() => {
        timedOut = true;
        if (!accumulated.trim()) controller.enqueue(CHAT_FALLBACK_REPLY);
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
        if (!accumulated.trim()) controller.enqueue(CHAT_FALLBACK_REPLY);
        controller.close();
      } catch {
        clearTimeout(timer);
        if (!accumulated.trim()) controller.enqueue(CHAT_FALLBACK_REPLY);
        controller.close();
      }
    },
  });

  // 3중 방어 2층 — 금칙어 stream transform 검열.
  return filterStream(raw);
}
