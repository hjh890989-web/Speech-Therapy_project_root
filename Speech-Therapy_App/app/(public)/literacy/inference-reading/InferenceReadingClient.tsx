"use client";

// FR-Q-LIT (CR-2026-009 / Phase 3b S4) — 추론 독해 미니게임 클라이언트.
//
// 흐름: 지문(항상 표시) + 추론 질문(숨은 뜻) + 선택지 3개. 첫 정답→✅ 다음 / 첫 오답→"다시 생각해볼까?"
//   재선택(시간 제한 없음) 정답이면 credit. 끝: 요약. 격려 톤(CON-04).
//   완료 시 raw 영속(useSaveLiteracyResultOnce, fire-and-forget) — 연습-only(referenceBand=null).

import { useMemo, useState } from "react";

import type { InferenceCard } from "@/lib/literacy/inference-reading-content";
import {
  scoreInferenceAttempt,
  summarizeInferenceReadingSession,
  type InferenceScore,
} from "@/lib/literacy/inference-reading";
import { useSaveLiteracyResultOnce } from "@/lib/literacy/use-save-result";

interface InferenceReadingClientProps {
  items: InferenceCard[];
}

type Phase = "answering" | "retry" | "feedback";

function shuffle<T>(arr: readonly T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function InferenceReadingClient({ items }: InferenceReadingClientProps) {
  const [index, setIndex] = useState(0);
  const [scores, setScores] = useState<InferenceScore[]>([]);
  const [phase, setPhase] = useState<Phase>("answering");
  const [firstWrong, setFirstWrong] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<"correct" | "retry" | "moveon" | null>(null);
  const [locked, setLocked] = useState(false);

  const item = index < items.length ? items[index] : null;
  const choices = useMemo(() => (item ? shuffle(item.choices) : []), [item]);

  const summary = summarizeInferenceReadingSession(scores);

  useSaveLiteracyResultOnce({
    done: item === null,
    gameSlug: "inference-reading",
    rawScore: summary.correct,
    rawTotal: summary.total,
  });

  if (item === null) {
    return (
      <section data-testid="inference-reading-summary" aria-live="polite" className="text-center">
        <p className="text-4xl" aria-hidden="true">🎉</p>
        <h2 className="mt-3 text-xl font-bold">숨은 뜻 찾기 끝!</h2>
        <p
          data-testid="inference-reading-summary-score"
          className="mt-2 text-sm text-gray-700 dark:text-gray-300"
        >
          {summary.total}개 중 <strong>{summary.correct}개</strong>를 맞혔어요.
          {summary.selfCorrected > 0 && ` 다시 생각해 고친 것도 ${summary.selfCorrected}개나 돼요!`}
        </p>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          오늘도 글 속 숨은 뜻을 멋지게 찾아냈어요. 또 만나요!
        </p>
      </section>
    );
  }

  const active: InferenceCard = item;

  function resolve(score: InferenceScore, kind: "correct" | "moveon") {
    setLocked(true);
    setFeedback(kind);
    setPhase("feedback");
    setScores((prev) => [...prev, score]);
    setTimeout(() => {
      setIndex((i) => i + 1);
      setPhase("answering");
      setFirstWrong(null);
      setFeedback(null);
      setLocked(false);
    }, 900);
  }

  function handleChoice(choice: string) {
    if (locked) return;

    if (phase === "answering") {
      if (choice === active.answer) {
        resolve({ correct: 1, selfCorrected: false }, "correct");
      } else {
        setFirstWrong(choice);
        setPhase("retry");
        setFeedback("retry");
      }
      return;
    }

    const score = scoreInferenceAttempt({
      card: active,
      firstAnswer: firstWrong ?? "",
      correctedAnswer: choice,
    });
    resolve(score, score.correct === 1 ? "correct" : "moveon");
  }

  return (
    <section data-testid="inference-reading-game" aria-label="숨은 뜻 찾기">
      <p className="mb-3 text-xs text-gray-500 dark:text-gray-400" data-testid="inference-reading-progress">
        {index + 1} / {items.length}
      </p>

      {/* 지문 — 항상 표시(다시 생각하기 권장) */}
      <article
        data-testid="inference-reading-passage"
        className="mb-5 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900/50"
      >
        <h2 className="mb-2 text-sm font-bold text-slate-700 dark:text-slate-200">{active.passageTitle}</h2>
        <p className="text-base leading-relaxed text-slate-800 dark:text-slate-100">{active.passageText}</p>
      </article>

      {/* 추론 질문 */}
      <p
        className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100"
        data-testid="inference-reading-question"
      >
        {active.question}
      </p>

      {/* 선택지 3개 */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3" data-testid="inference-reading-choices">
        {choices.map((choice) => (
          <button
            key={choice}
            type="button"
            disabled={locked}
            onClick={() => handleChoice(choice)}
            className="min-h-[56px] rounded-xl border-2 border-emerald-200 bg-white px-4 py-3 text-base font-bold text-emerald-800 transition hover:border-emerald-400 hover:bg-emerald-50 disabled:opacity-60 dark:border-emerald-800 dark:bg-slate-900 dark:text-emerald-200 dark:hover:bg-slate-800"
          >
            {choice}
          </button>
        ))}
      </div>

      {feedback && (
        <p
          data-testid="inference-reading-feedback"
          aria-live="polite"
          className="mt-5 text-center text-sm font-medium"
        >
          {feedback === "correct" && <span className="text-emerald-700 dark:text-emerald-300">잘했어요! 🌟</span>}
          {feedback === "retry" && <span className="text-amber-700 dark:text-amber-300">글을 다시 읽고 생각해볼까요? 🙂</span>}
          {feedback === "moveon" && <span className="text-sky-700 dark:text-sky-300">괜찮아요, 다음 글로 가볼까요? 👍</span>}
        </p>
      )}
    </section>
  );
}
