"use client";

// FR-Q-LIT-01 (CR-2026-007 / REQ-FUNC-CL-09) — 해독 미니게임 클라이언트 (음독 + STT).
//
// 흐름: 무의미 단어 1개 표시 → 마이크로 소리 내어 읽기 → STT 전사 → scoreDecodingResponse(기록) →
//   격려 피드백 → 다음. 끝: 요약.
// ⚠️ STT 가 무의미단어를 실제 어휘로 보정하는 경향(CL-09) → 채점은 best-effort 내부값, **UI 는 항상
//   격려 톤**(틀림 인상 회피). 응답(STT 전사)은 기능적 기록.
// STT 미지원 브라우저 → 부모 확인("다 읽었어요")으로 진행(채점 없이 읽기 연습).
// 채점은 클라이언트 즉시용 — 영속/임상 해석은 KOPLAC 게이트 후(서버 미연동). CON-04 금칙어 0.

import { useState } from "react";

import { useSpeechToText } from "@/lib/hooks/useSpeechToText";
import type { DecodingItem } from "@/lib/literacy/decoding-content";
import { DECODING_POSITION_LABEL } from "@/lib/literacy/decoding-content";
import {
  scoreDecodingResponse,
  summarizeDecodingSession,
  type DecodingScore,
} from "@/lib/literacy/decoding";

interface DecodingGameClientProps {
  items: DecodingItem[];
}

export function DecodingGameClient({ items }: DecodingGameClientProps) {
  const [index, setIndex] = useState(0);
  const [scores, setScores] = useState<DecodingScore[]>([]);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [locked, setLocked] = useState(false);

  const item = index < items.length ? items[index] : null;

  function advance(score: DecodingScore | null) {
    setLocked(true);
    if (score) setScores((prev) => [...prev, score]);
    setFeedback("잘 읽었어요! 👏");
    setTimeout(() => {
      setIndex((i) => i + 1);
      setFeedback(null);
      setLocked(false);
    }, 900);
  }

  // STT — 결과 콜백은 매 렌더 최신화(hook 내부 ref). item null 시 무시.
  function handleResult(transcript: string) {
    if (locked || item === null) return;
    advance(scoreDecodingResponse(item, transcript));
  }
  const stt = useSpeechToText(handleResult);

  if (item === null) {
    const summary = summarizeDecodingSession(scores);
    return (
      <section data-testid="decoding-summary" aria-live="polite" className="text-center">
        <p className="text-4xl" aria-hidden="true">🎉</p>
        <h2 className="mt-3 text-xl font-bold">읽기 놀이 끝!</h2>
        <p data-testid="decoding-summary-score" className="mt-2 text-sm text-gray-700 dark:text-gray-300">
          {items.length}개를 소리 내어 읽었어요.
          {scores.length > 0 && ` 그중 ${summary.correct}개를 또박또박 잘 읽었어요!`}
        </p>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          처음 보는 글자도 용감하게 읽어 줘서 멋져요. 또 만나요!
        </p>
      </section>
    );
  }

  const active: DecodingItem = item;

  return (
    <section data-testid="decoding-game" aria-label="소리 내어 읽기">
      {/* 진행 */}
      <p className="mb-3 text-xs text-gray-500 dark:text-gray-400" data-testid="decoding-progress">
        {index + 1} / {items.length}
      </p>

      {/* 무의미 단어 — 크게 */}
      <div className="mb-2 rounded-2xl border-2 border-emerald-200 bg-emerald-50 px-4 py-10 text-center dark:border-emerald-800 dark:bg-emerald-950/30">
        <p className="text-5xl font-extrabold tracking-wide text-emerald-900 dark:text-emerald-100" data-testid="decoding-word">
          {active.word}
        </p>
      </div>
      <p className="mb-6 text-center text-xs text-gray-500 dark:text-gray-400">
        {DECODING_POSITION_LABEL[active.positionFocus]}에 집중해서 또박또박 읽어 봐요.
      </p>

      {/* 입력 — STT 지원 시 마이크, 미지원 시 부모 확인 */}
      {stt.supported ? (
        <div className="flex flex-col items-center gap-2">
          <button
            type="button"
            disabled={locked}
            onClick={() => stt.start()}
            data-testid="decoding-mic"
            className="min-h-[56px] rounded-full bg-emerald-600 px-8 py-3 text-lg font-bold text-white transition hover:bg-emerald-700 disabled:opacity-60"
          >
            {stt.listening ? "듣고 있어요… 🎧" : "🎤 읽어볼게요"}
          </button>
          <p className="text-xs text-gray-400 dark:text-gray-500">마이크를 누르고 글자를 읽어 주세요.</p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2">
          <button
            type="button"
            disabled={locked}
            onClick={() => advance(null)}
            data-testid="decoding-manual-next"
            className="min-h-[56px] rounded-full border-2 border-emerald-600 px-8 py-3 text-lg font-bold text-emerald-700 transition hover:bg-emerald-50 disabled:opacity-60 dark:text-emerald-300 dark:hover:bg-slate-800"
          >
            다 읽었어요 ✅
          </button>
          <p className="text-xs text-gray-400 dark:text-gray-500">
            아이가 소리 내어 읽으면 버튼을 눌러 다음으로 넘어가요.
          </p>
        </div>
      )}

      {/* 피드백 — 항상 격려 톤 */}
      {feedback && (
        <p
          data-testid="decoding-feedback"
          aria-live="polite"
          className="mt-5 text-center text-sm font-medium text-emerald-700 dark:text-emerald-300"
        >
          {feedback}
        </p>
      )}
    </section>
  );
}
