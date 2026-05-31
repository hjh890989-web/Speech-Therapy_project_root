"use client";

// FR-Q-022 — F15 챗봇 클라이언트 UI.
//
// route(/api/chat/stream)는 text/plain 스트림(AI SDK 프로토콜 아님) → 커스텀 fetch + ReadableStream reader.
// 흐름: 사용자 입력 → 낙관적 추가 → POST(전체 history) → 스트림 누적 append. 동시에 submitChatUtterance
//       (승인된 저장 경로, 7일 폐기 + maskPii)로 발화 record(fire-and-forget).
// 에러: route 의 401/403(CONSENT_REQUIRED/F15_DISABLED)/429/4xx·5xx 를 친화 메시지로 분기.
// CON-04: '치료/진단/장애' 0건.

import { useRef, useState } from "react";
import Link from "next/link";

import { submitChatUtterance } from "@/app/actions/submit-chat-utterance";
import { useSpeechToText } from "@/lib/hooks/useSpeechToText";

interface Msg {
  role: "user" | "assistant";
  content: string;
}

interface ChatError {
  message: string;
  action?: { href: string; label: string };
}

const GREETING: Msg = {
  role: "assistant",
  content: "안녕! 오늘은 뭐 하고 놀았어? 친구한테 이야기 들려줄래? 😊",
};
const MAX_LEN = 2000;

async function safeJson(res: Response): Promise<{ error?: string }> {
  try {
    return (await res.json()) as { error?: string };
  } catch {
    return {};
  }
}

function mapError(status: number, body: { error?: string }): ChatError {
  if (status === 401) {
    return { message: "로그인 후 이용할 수 있어요.", action: { href: "/login?next=/chat", label: "로그인" } };
  }
  if (status === 403 && body.error === "CONSENT_REQUIRED") {
    return {
      message: "개인정보 동의가 필요해요.",
      action: { href: "/settings/privacy-consent", label: "동의하러 가기" },
    };
  }
  if (status === 403) return { message: "지금은 준비 중이에요." };
  if (status === 429) return { message: "조금 빨라요! 잠시 후 다시 이야기해 볼까요?" };
  return { message: "오류가 났어요. 잠시 후 다시 시도해 주세요." };
}

export function ChatClient() {
  const [messages, setMessages] = useState<Msg[]>([GREETING]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ChatError | null>(null);
  const listEndRef = useRef<HTMLDivElement | null>(null);

  // FR-Q-022 — 음성 입력(STT). 인식된 텍스트를 기존 입력에 이어붙임. 미지원 시 버튼 미노출.
  const stt = useSpeechToText((text) =>
    setInput((prev) => (prev ? `${prev} ${text}` : text)),
  );

  async function send() {
    const text = input.trim();
    if (!text || loading) return;
    if (text.length > MAX_LEN) {
      setError({ message: "조금 더 짧게 이야기해 줄래요?" });
      return;
    }
    setError(null);
    const history: Msg[] = [...messages, { role: "user", content: text }];
    setMessages(history);
    setInput("");
    setLoading(true);

    // 승인된 저장 경로(7일 폐기 + maskPii) — record 용 fire-and-forget. 실패해도 대화 흐름 차단 0.
    void submitChatUtterance({ role: "user", content: text }).catch(() => {});

    try {
      const res = await fetch("/api/chat/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history }),
      });
      if (!res.ok || !res.body) {
        setError(mapError(res.status, await safeJson(res)));
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      setMessages((m) => [...m, { role: "assistant", content: "" }]);
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setMessages((m) => {
          const copy = [...m];
          copy[copy.length - 1] = { role: "assistant", content: acc };
          return copy;
        });
      }
    } catch {
      setError({ message: "연결이 불안정해요. 잠시 후 다시 시도해 주세요." });
    } finally {
      setLoading(false);
      listEndRef.current?.scrollIntoView?.({ behavior: "smooth" });
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void send();
    }
  }

  return (
    <div className="flex flex-1 flex-col" data-testid="chat-client">
      {/* 메시지 목록 */}
      <div
        className="flex-1 space-y-3 overflow-y-auto rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900"
        aria-live="polite"
        aria-label="대화 내용"
        data-testid="chat-messages"
      >
        {messages.map((m, i) => (
          <div
            key={i}
            data-testid={`chat-msg-${m.role}`}
            className={m.role === "user" ? "flex justify-end" : "flex justify-start"}
          >
            <p
              className={`max-w-[80%] whitespace-pre-wrap rounded-2xl px-4 py-2 text-sm ${
                m.role === "user"
                  ? "bg-emerald-600 text-white"
                  : "bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100"
              }`}
            >
              {m.content || (loading ? "…" : "")}
            </p>
          </div>
        ))}
        <div ref={listEndRef} />
      </div>

      {/* 에러 배너 */}
      {error && (
        <p
          role="alert"
          data-testid="chat-error"
          className="mt-3 flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100"
        >
          {error.message}
          {error.action && (
            <Link href={error.action.href} className="font-medium underline">
              {error.action.label}
            </Link>
          )}
        </p>
      )}

      {/* 입력 */}
      <form
        className="mt-3 flex items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
      >
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          rows={1}
          maxLength={MAX_LEN}
          placeholder="아이가 한 말을 적어 주세요…"
          aria-label="메시지 입력"
          data-testid="chat-input"
          className="min-h-[44px] flex-1 resize-none rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800"
        />
        {stt.supported && (
          <button
            type="button"
            onClick={() => (stt.listening ? stt.stop() : stt.start())}
            disabled={loading}
            aria-label={stt.listening ? "음성 입력 중지" : "음성으로 입력"}
            aria-pressed={stt.listening}
            data-testid="chat-mic"
            title="음성으로 입력"
            className={`min-h-[44px] rounded-md border px-3 py-2 text-sm transition-colors disabled:opacity-50 ${
              stt.listening
                ? "border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                : "border-gray-300 text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
            }`}
          >
            {stt.listening ? "● 듣는 중" : "🎤"}
          </button>
        )}
        <button
          type="submit"
          disabled={loading || input.trim().length === 0}
          data-testid="chat-send"
          className="min-h-[44px] rounded-md bg-emerald-600 px-5 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          보내기
        </button>
      </form>
    </div>
  );
}
