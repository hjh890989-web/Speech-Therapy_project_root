"use client";

// FR-Q-LIT (CR-2026-009 / Phase 3b S2) — 소리 규칙 읽기(해독) 미니게임 클라이언트.
//
// 흐름: 아이템마다 낱말(글자) 표시 + "어떻게 소리 날까요?" + 선택지 2개(바른 소리 vs 글자 그대로 소리).
//   첫 정답→✅ 다음 / 첫 오답→재시도(3초 SC 창 내 교정 credit). 끝: 요약. 격려 톤(CON-04).
//   완료 시 raw 영속(useSaveLiteracyResultOnce, fire-and-forget) — 연습-only(referenceBand=null).

import { useMemo, useState } from "react";

import { ReadAloudButton } from "@/components/literacy/ReadAloudButton";
import type { ReadRuleItem } from "@/lib/literacy/read-rules-content";
import {
  scoreReadRuleAttempt,
  summarizeReadRulesSession,
  SELF_CORRECTION_WINDOW_MS,
  type ReadRuleScore,
} from "@/lib/literacy/read-rules";
import { useSaveLiteracyResultOnce } from "@/lib/literacy/use-save-result";

interface ReadRulesClientProps {
  items: ReadRuleItem[];
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

export function ReadRulesClient({ items }: ReadRulesClientProps) {
  const [index, setIndex] = useState(0);
  const [scores, setScores] = useState<ReadRuleScore[]>([]);
  const [phase, setPhase] = useState<Phase>("answering");
  const [firstWrong, setFirstWrong] = useState<string | null>(null);
  const [scOpen, setScOpen] = useState(false);
  const [feedback, setFeedback] = useState<"correct" | "retry" | "moveon" | null>(null);
  const [locked, setLocked] = useState(false);

  const item = index < items.length ? items[index] : null;
  const choices = useMemo(() => (item ? shuffle(item.choices) : []), [item]);

  const summary = summarizeReadRulesSession(scores);

  useSaveLiteracyResultOnce({
    done: item === null,
    gameSlug: "read-rules",
    rawScore: summary.correct,
    rawTotal: summary.total,
  });

  if (item === null) {
    return (
      <section data-testid="read-rules-summary" aria-live="polite" className="text-center">
        <p className="text-4xl" aria-hidden="true">🎉</p>
        <h2 className="mt-3 text-xl font-bold">소리 규칙 읽기 끝!</h2>
        <p
          data-testid="read-rules-summary-score"
          className="mt-2 text-sm text-gray-700 dark:text-gray-300"
        >
          {summary.total}개 중 <strong>{summary.correct}개</strong>를 맞혔어요.
          {summary.selfCorrected > 0 && ` 스스로 고친 것도 ${summary.selfCorrected}개나 돼요!`}
        </p>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          오늘도 글자와 소리 규칙과 즐겁게 놀았어요. 또 만나요!
        </p>
      </section>
    );
  }

  const active: ReadRuleItem = item;

  function resolve(score: ReadRuleScore, kind: "correct" | "moveon") {
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

    const score = scoreReadRuleAttempt({
      item: active,
      firstAnswer: firstWrong ?? "",
      correctedAnswer: choice,
      selfCorrectionElapsedMs: scOpen ? 0 : SELF_CORRECTION_WINDOW_MS + 1,
    });
    resolve(score, score.correct === 1 ? "correct" : "moveon");
  }

  return (
    <section data-testid="read-rules-game" aria-label="소리 규칙 읽기">
      <p className="mb-3 text-xs text-gray-500 dark:text-gray-400" data-testid="read-rules-progress">
        {index + 1} / {items.length}
      </p>

      {/* 낱말(글자) — 아이가 보고 어떻게 소리 나는지 고른다. */}
      <p
        className="mb-2 text-center text-3xl font-bold text-gray-900 dark:text-gray-100"
        data-testid="read-rules-word"
      >
        {active.word}
      </p>
      <p className="mb-2 text-center text-base font-semibold text-gray-800 dark:text-gray-200" data-testid="read-rules-prompt">
        이 낱말은 어떻게 소리 날까요?
      </p>
      {/* 지시문만 읽어줌 — 낱말(read-rules-word) 발음은 과제(아이가 소리 고름)라 누설 금지. */}
      <div className="mb-5 flex flex-wrap items-center justify-center gap-3">
        <ReadAloudButton text="이 낱말은 어떻게 소리 날까요?" label="듣기" />
      </div>

      {/* 선택지 (바른 소리 vs 글자 그대로 소리) */}
      <div className="grid grid-cols-2 gap-3" data-testid="read-rules-choices">
        {choices.map((choice) => (
          <button
            key={choice}
            type="button"
            disabled={locked}
            onClick={() => handleChoice(choice)}
            className="min-h-[56px] rounded-xl border-2 border-emerald-200 bg-white px-4 py-3 text-xl font-bold text-emerald-800 transition hover:border-emerald-400 hover:bg-emerald-50 disabled:opacity-60 dark:border-emerald-800 dark:bg-slate-900 dark:text-emerald-200 dark:hover:bg-slate-800"
          >
            「{choice}」
          </button>
        ))}
      </div>

      {feedback && (
        <p
          data-testid="read-rules-feedback"
          aria-live="polite"
          className="mt-5 text-center text-sm font-medium"
        >
          {feedback === "correct" && <span className="text-emerald-700 dark:text-emerald-300">잘했어요! 🌟</span>}
          {feedback === "retry" && <span className="text-amber-700 dark:text-amber-300">다시 해볼까요? 소리 내어 읽어봐요 🙂</span>}
          {feedback === "moveon" && <span className="text-sky-700 dark:text-sky-300">괜찮아요, 다음 낱말로 가볼까요? 👍</span>}
        </p>
      )}
    </section>
  );
}
