"use client";

// FR-C-017 (#40 Replace D8) — AI 쿠션어 알림장 생성기 (스트리밍 + 클립보드 복사).
//
// 흐름:
//   1) "알림장 생성" 클릭 → POST /api/cushion/stream 호출
//   2) Response.body 의 ReadableStream<Uint8Array> 를 TextDecoder 로 한 글자씩 textarea 에 페인트
//   3) 스트림 중간에 [__CUSHION_SWAP__] 마커 등장 시 → 이후 chunk 로 누적 텍스트 교체 (CON-04 swap)
//   4) 완료 후 "클립보드 복사" 버튼 활성화 → lib/share.ts::shareOrCopy 호출
//   5) 분석 이벤트:
//      - cushion_note_generated (완료 직후, source/charCount)
//      - cushion_note_copied (복사 직후, method)
//
// 상태 머신:
//   idle → streaming → done → copied | error
//
// R4 (자녀 식별 정보):
//   studentName 은 부모 컨텍스트라 카피에 OK. 외부 (analytics) 노출은 evaluationResultId 만.
//
// 금칙어 (CON-04):
//   서버 측이 swap 마커 ([__CUSHION_SWAP__]) 발송. 본 컴포넌트는 마커 검출 시 textarea 교체.

import { useCallback, useState } from "react";

import { trackEvent } from "@/lib/analytics";
import { shareOrCopy } from "@/lib/share";

const SWAP_MARKER = "[__CUSHION_SWAP__]";

export interface CushionNoteGeneratorProps {
  evaluationResultId: string;
  /** 부모 호칭 prefill (원장 → 부모 직접 전달용). UI 가 선택 입력 허용. */
  defaultStudentName?: string;
}

type Status =
  | { state: "idle" }
  | { state: "streaming"; charCount: number }
  | { state: "done"; charCount: number; source: "gemini" | "template" }
  | { state: "copied"; method: "web_share" | "clipboard" | "unsupported" }
  | { state: "error"; message: string };

export function CushionNoteGenerator({
  evaluationResultId,
  defaultStudentName,
}: CushionNoteGeneratorProps) {
  const [studentName, setStudentName] = useState<string>(defaultStudentName ?? "");
  const [text, setText] = useState<string>("");
  const [status, setStatus] = useState<Status>({ state: "idle" });

  const isStreaming = status.state === "streaming";
  const hasText = text.trim().length > 0;
  const canCopy =
    (status.state === "done" || status.state === "copied") && hasText;

  const handleGenerate = useCallback(async () => {
    setText("");
    setStatus({ state: "streaming", charCount: 0 });

    try {
      const res = await fetch("/api/cushion/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          evaluationResultId,
          studentName: studentName.trim() || undefined,
        }),
      });

      if (!res.ok) {
        let detail = `${res.status}`;
        try {
          const json = await res.json();
          if (typeof json?.error === "string") detail = json.error;
        } catch {
          // ignore non-JSON body
        }
        setStatus({
          state: "error",
          message: `알림장 생성 실패 (${detail}) — 잠시 후 다시 시도해 주세요.`,
        });
        return;
      }

      const body = res.body;
      if (!body) {
        setStatus({
          state: "error",
          message: "응답 본문이 없어요. 다시 시도해 주세요.",
        });
        return;
      }

      const reader = body.getReader();
      const decoder = new TextDecoder("utf-8");
      let accumulated = "";
      let swapped = false;

      // streaming 루프 — chunk 마다 textarea 갱신.
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunkText = decoder.decode(value, { stream: true });
        accumulated += chunkText;

        // CON-04 swap 마커 감지 — 마커 이후를 새 본문으로 교체.
        const markerIdx = accumulated.indexOf(SWAP_MARKER);
        if (markerIdx !== -1 && !swapped) {
          swapped = true;
          accumulated = accumulated.slice(markerIdx + SWAP_MARKER.length).replace(/^\s+/, "");
        }

        setText(accumulated);
        setStatus({ state: "streaming", charCount: accumulated.length });
      }

      // 잔여 decoder buffer flush.
      accumulated += decoder.decode();
      if (!swapped) {
        const markerIdx = accumulated.indexOf(SWAP_MARKER);
        if (markerIdx !== -1) {
          swapped = true;
          accumulated = accumulated.slice(markerIdx + SWAP_MARKER.length).replace(/^\s+/, "");
        }
      }
      setText(accumulated);

      const charCount = accumulated.length;
      const source: "gemini" | "template" = swapped ? "template" : "gemini";
      setStatus({ state: "done", charCount, source });
      trackEvent("cushion_note_generated", {
        evaluationResultId,
        source,
        charCount,
      });
    } catch (err) {
      setStatus({
        state: "error",
        message: `네트워크 오류 — ${err instanceof Error ? err.message : "재시도 필요"}`,
      });
    }
  }, [evaluationResultId, studentName]);

  const handleCopy = useCallback(async () => {
    if (!hasText) return;
    const result = await shareOrCopy({
      text,
      url: "",
      title: "발음 발달 알림장",
      surface: "result",
    });
    setStatus({ state: "copied", method: result.method });
    trackEvent("cushion_note_copied", {
      evaluationResultId,
      method: result.method,
    });
  }, [text, evaluationResultId, hasText]);

  return (
    <section
      data-testid="cushion-note-generator"
      aria-labelledby="cushion-note-heading"
      className="space-y-4 rounded-lg border border-slate-200 bg-white p-4"
    >
      <header className="space-y-1">
        <h2
          id="cushion-note-heading"
          className="text-base font-semibold text-slate-900"
        >
          AI 알림장 초안
        </h2>
        <p className="text-xs text-slate-500">
          부모님께 카카오톡/문자로 직접 보내실 수 있도록 부드러운 알림장을 만들어 드려요.
        </p>
      </header>

      <div className="space-y-1">
        <label
          htmlFor="cushion-student-name"
          className="block text-sm font-medium text-slate-700"
        >
          자녀 호칭 (선택)
        </label>
        <input
          id="cushion-student-name"
          data-testid="cushion-student-name-input"
          type="text"
          maxLength={40}
          value={studentName}
          onChange={(e) => setStudentName(e.target.value)}
          placeholder="예: 지우"
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          disabled={isStreaming}
        />
      </div>

      <div className="space-y-1">
        <label
          htmlFor="cushion-text-area"
          className="block text-sm font-medium text-slate-700"
        >
          알림장 본문
        </label>
        <textarea
          id="cushion-text-area"
          data-testid="cushion-text-area"
          value={text}
          readOnly
          rows={6}
          className="w-full rounded-md border border-slate-300 bg-slate-50 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          placeholder="‘알림장 생성’을 누르면 AI 가 작성한 초안이 한 글자씩 표시돼요."
          aria-live="polite"
        />
        <p className="text-xs text-slate-500" data-testid="cushion-char-count">
          글자 수: {text.length}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          data-testid="cushion-generate-button"
          onClick={handleGenerate}
          disabled={isStreaming}
          className="inline-flex min-h-[40px] items-center rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isStreaming ? "AI 가 작성 중…" : "알림장 생성"}
        </button>

        <button
          type="button"
          data-testid="cushion-copy-button"
          onClick={handleCopy}
          disabled={!canCopy}
          className="inline-flex min-h-[40px] items-center rounded-md border border-emerald-600 px-4 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          클립보드 복사
        </button>

        {status.state === "done" && (
          <span
            data-testid="cushion-status-done"
            data-source={status.source}
            className="text-xs font-medium text-emerald-700"
          >
            생성 완료 ({status.charCount}자, {status.source === "gemini" ? "AI 작성" : "안전 템플릿"})
          </span>
        )}
        {status.state === "copied" && (
          <span
            data-testid="cushion-status-copied"
            data-method={status.method}
            className="text-xs font-medium text-emerald-700"
          >
            {status.method === "unsupported"
              ? "이 기기에서는 자동 복사가 안 돼요. 본문을 직접 복사해 주세요."
              : "복사했어요. 카카오톡/문자에 붙여 넣어 주세요."}
          </span>
        )}
        {status.state === "error" && (
          <span
            data-testid="cushion-status-error"
            role="alert"
            className="text-xs text-rose-700"
          >
            {status.message}
          </span>
        )}
      </div>
    </section>
  );
}
