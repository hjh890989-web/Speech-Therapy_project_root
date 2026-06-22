"use client";

// FR-Q-LIT (CR-2026-009 / Phase 3b S3) — 사실적 읽기이해 미니게임 클라이언트.
//
// 흐름: 지문(항상 표시) + 사실 확인 질문 + 선택지 3개. 첫 정답→✅ 다음 / 첫 오답→"다시 읽어볼까?"
//   재선택(시간 제한 없음 — look-back 권장) 정답이면 credit. 끝: 요약. 격려 톤(CON-04).
//   완료 시 raw 영속(useSaveLiteracyResultOnce, fire-and-forget) — 연습-only(referenceBand=null).

import { useMemo, useState } from "react";

import type { ComprehensionCard } from "@/lib/literacy/reading-comprehension-content";
import {
  scoreComprehensionAttempt,
  summarizeComprehensionSession,
  type ComprehensionScore,
} from "@/lib/literacy/reading-comprehension";
import { useSaveLiteracyResultOnce } from "@/lib/literacy/use-save-result";
import { ReadAloudButton } from "@/components/literacy/ReadAloudButton";

interface ReadingComprehensionClientProps {
  items: ComprehensionCard[];
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

export function ReadingComprehensionClient({ items }: ReadingComprehensionClientProps) {
  const [index, setIndex] = useState(0);
  const [scores, setScores] = useState<ComprehensionScore[]>([]);
  const [phase, setPhase] = useState<Phase>("answering");
  const [firstWrong, setFirstWrong] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<"correct" | "retry" | "moveon" | null>(null);
  const [locked, setLocked] = useState(false);

  const item = index < items.length ? items[index] : null;
  const choices = useMemo(() => (item ? shuffle(item.choices) : []), [item]);

  const summary = summarizeComprehensionSession(scores);

  useSaveLiteracyResultOnce({
    done: item === null,
    gameSlug: "reading-comprehension",
    rawScore: summary.correct,
    rawTotal: summary.total,
  });

  if (item === null) {
    return (
      <section data-testid="reading-comprehension-summary" aria-live="polite" className="text-center">
        <p className="text-4xl" aria-hidden="true">🎉</p>
        <h2 className="mt-3 text-xl font-bold">글 읽고 답하기 끝!</h2>
        <p
          data-testid="reading-comprehension-summary-score"
          className="mt-2 text-sm text-gray-700 dark:text-gray-300"
        >
          {summary.total}개 중 <strong>{summary.correct}개</strong>를 맞혔어요.
          {summary.selfCorrected > 0 && ` 다시 읽고 고친 것도 ${summary.selfCorrected}개나 돼요!`}
        </p>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          오늘도 글과 즐겁게 놀았어요. 또 만나요!
        </p>
      </section>
    );
  }

  const active: ComprehensionCard = item;

  function resolve(score: ComprehensionScore, kind: "correct" | "moveon") {
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
        // 첫 오답 — 다시 읽고 한 번 더(시간 제한 없음).
        setFirstWrong(choice);
        setPhase("retry");
        setFeedback("retry");
      }
      return;
    }

    // phase === "retry" — 재선택 1회로 resolve.
    const score = scoreComprehensionAttempt({
      card: active,
      firstAnswer: firstWrong ?? "",
      correctedAnswer: choice,
    });
    resolve(score, score.correct === 1 ? "correct" : "moveon");
  }

  return (
    <section data-testid="reading-comprehension-game" aria-label="글 읽고 답하기">
      <p className="mb-3 text-xs text-gray-500 dark:text-gray-400" data-testid="reading-comprehension-progress">
        {index + 1} / {items.length}
      </p>

      {/* 지문 — 항상 표시(다시 읽기 권장) */}
      <article
        data-testid="reading-comprehension-passage"
        className="mb-5 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900/50"
      >
        <h2 className="mb-2 text-sm font-bold text-slate-700 dark:text-slate-200">{active.passageTitle}</h2>
        <p className="text-base leading-relaxed text-slate-800 dark:text-slate-100">{active.passageText}</p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <ReadAloudButton text={active.passageText} label="듣기" />
        </div>
      </article>

      {/* 질문 + 읽어주기(초저학년 도움) */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <p
          className="text-lg font-semibold text-gray-900 dark:text-gray-100"
          data-testid="reading-comprehension-question"
        >
          {active.question}
        </p>
        <ReadAloudButton text={active.question} label="듣기" />
      </div>

      {/* 선택지 3개 */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3" data-testid="reading-comprehension-choices">
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
          data-testid="reading-comprehension-feedback"
          aria-live="polite"
          className="mt-5 text-center text-sm font-medium"
        >
          {feedback === "correct" && <span className="text-emerald-700 dark:text-emerald-300">잘했어요! 🌟</span>}
          {feedback === "retry" && <span className="text-amber-700 dark:text-amber-300">글을 다시 읽어볼까요? 천천히 찾아봐요 🙂</span>}
          {feedback === "moveon" && <span className="text-sky-700 dark:text-sky-300">괜찮아요, 다음 글로 가볼까요? 👍</span>}
        </p>
      )}
    </section>
  );
}
