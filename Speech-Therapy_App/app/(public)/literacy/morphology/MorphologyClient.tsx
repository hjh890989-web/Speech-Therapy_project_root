"use client";

// FR-Q-LIT (CR-2026-009 / Phase 3b S4) — 형태소 인식 미니게임 클라이언트.
//
// 흐름: 아이템마다 문항(낱말 합치기/만들기/숨은 뜻) + 선택지 3개. 첫 정답→✅ 다음 / 첫 오답→재시도
//   (3초 SC 창 내 정답 교정 credit). 끝: 요약. 격려 톤(CON-04).
//   완료 시 raw 영속(useSaveLiteracyResultOnce, fire-and-forget) — 연습-only(referenceBand=null).

import { useMemo, useState } from "react";

import type { MorphItem } from "@/lib/literacy/morphology-content";
import {
  scoreMorphAttempt,
  summarizeMorphologySession,
  SELF_CORRECTION_WINDOW_MS,
  type MorphScore,
} from "@/lib/literacy/morphology";
import { useSaveLiteracyResultOnce } from "@/lib/literacy/use-save-result";

interface MorphologyClientProps {
  items: MorphItem[];
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

export function MorphologyClient({ items }: MorphologyClientProps) {
  const [index, setIndex] = useState(0);
  const [scores, setScores] = useState<MorphScore[]>([]);
  const [phase, setPhase] = useState<Phase>("answering");
  const [firstWrong, setFirstWrong] = useState<string | null>(null);
  const [scOpen, setScOpen] = useState(false);
  const [feedback, setFeedback] = useState<"correct" | "retry" | "moveon" | null>(null);
  const [locked, setLocked] = useState(false);

  const item = index < items.length ? items[index] : null;
  const choices = useMemo(() => (item ? shuffle(item.choices) : []), [item]);

  const summary = summarizeMorphologySession(scores);

  useSaveLiteracyResultOnce({
    done: item === null,
    gameSlug: "morphology",
    rawScore: summary.correct,
    rawTotal: summary.total,
  });

  if (item === null) {
    return (
      <section data-testid="morphology-summary" aria-live="polite" className="text-center">
        <p className="text-4xl" aria-hidden="true">🎉</p>
        <h2 className="mt-3 text-xl font-bold">낱말 조각 놀이 끝!</h2>
        <p
          data-testid="morphology-summary-score"
          className="mt-2 text-sm text-gray-700 dark:text-gray-300"
        >
          {summary.total}개 중 <strong>{summary.correct}개</strong>를 맞혔어요.
          {summary.selfCorrected > 0 && ` 스스로 고친 것도 ${summary.selfCorrected}개나 돼요!`}
        </p>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          오늘도 낱말의 짜임과 즐겁게 놀았어요. 또 만나요!
        </p>
      </section>
    );
  }

  const active: MorphItem = item;

  function resolve(score: MorphScore, kind: "correct" | "moveon") {
    setLocked(true);
    setFeedback(kind);
    setPhase("feedback");
    setScores((prev) => [...prev, score]);
    setTimeout(() => {
      setIndex((i) => i + 1);
      setPhase("answering");
      setFirstWrong(null);
      setScOpen(false);
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
        setScOpen(true);
        setPhase("retry");
        setFeedback("retry");
        setTimeout(() => setScOpen(false), SELF_CORRECTION_WINDOW_MS);
      }
      return;
    }

    const score = scoreMorphAttempt({
      item: active,
      firstAnswer: firstWrong ?? "",
      correctedAnswer: choice,
      selfCorrectionElapsedMs: scOpen ? 0 : SELF_CORRECTION_WINDOW_MS + 1,
    });
    resolve(score, score.correct === 1 ? "correct" : "moveon");
  }

  return (
    <section data-testid="morphology-game" aria-label="낱말 조각 놀이">
      <p className="mb-3 text-xs text-gray-500 dark:text-gray-400" data-testid="morphology-progress">
        {index + 1} / {items.length}
      </p>

      {/* 문항 */}
      <p
        className="mb-5 text-lg font-semibold text-gray-900 dark:text-gray-100"
        data-testid="morphology-prompt"
      >
        {active.prompt}
      </p>

      {/* 선택지 3개 */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3" data-testid="morphology-choices">
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
          data-testid="morphology-feedback"
          aria-live="polite"
          className="mt-5 text-center text-sm font-medium"
        >
          {feedback === "correct" && <span className="text-emerald-700 dark:text-emerald-300">잘했어요! 🌟</span>}
          {feedback === "retry" && <span className="text-amber-700 dark:text-amber-300">다시 해볼까요? 천천히 생각해봐요 🙂</span>}
          {feedback === "moveon" && <span className="text-sky-700 dark:text-sky-300">괜찮아요, 다음 낱말로 가볼까요? 👍</span>}
        </p>
      )}
    </section>
  );
}
