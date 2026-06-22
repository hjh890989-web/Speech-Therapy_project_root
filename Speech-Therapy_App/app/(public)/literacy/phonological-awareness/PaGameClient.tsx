"use client";

// FR-Q-LIT-01 (CR-2026-007 / REQ-FUNC-CL-08) — 음운 인식 미니게임 클라이언트.
//
// 흐름: 아이템마다 지시문 + 선택지 3개(셔플) → 탭.
//   - 첫 정답 → ✅ 다음.
//   - 첫 오답 → 「다시 해볼까?」 (1회 더). 3초 SC 창 내 정답 교정 시 credit(scorePaAttempt).
//   - 재시도 결과로 해당 아이템 resolve → 다음.
// 끝: 요약("N개 중 M개"). CON-04 금칙어 0 — 격려 톤(틀림 인상 회피).
// 채점은 클라이언트 즉시 피드백용 — 영속/임상 해석은 KOPLAC 게이트 후(서버 미연동).
//
// SC 창은 Date.now() 대신 setTimeout 기반 상태(scOpen)로 추적 — render 순수성(react-hooks/purity) 준수.

import { useMemo, useState } from "react";

import type { PaItem } from "@/lib/literacy/pa-content";
import {
  scorePaAttempt,
  summarizePaSession,
  SELF_CORRECTION_WINDOW_MS,
  type PaScore,
} from "@/lib/literacy/phonological-awareness";
import { useSaveLiteracyResultOnce } from "@/lib/literacy/use-save-result";
import { useReadAloud } from "@/lib/literacy/use-read-aloud";
import { ReadAloudButton } from "@/components/literacy/ReadAloudButton";

interface PaGameClientProps {
  items: PaItem[];
}

type Phase = "answering" | "retry" | "feedback";

/// 선택지 셔플 (표시 순서만 — 채점은 값 비교라 순서 무관).
function shuffle<T>(arr: readonly T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function PaGameClient({ items }: PaGameClientProps) {
  const [index, setIndex] = useState(0);
  const [scores, setScores] = useState<PaScore[]>([]);
  const [phase, setPhase] = useState<Phase>("answering");
  const [firstWrong, setFirstWrong] = useState<string | null>(null);
  /// SC 창 열림 — 첫 오답 시 true, 3초 후 setTimeout 으로 false.
  const [scOpen, setScOpen] = useState(false);
  const [feedback, setFeedback] = useState<"correct" | "retry" | "moveon" | null>(null);
  const [locked, setLocked] = useState(false);
  const speak = useReadAloud();

  const item = index < items.length ? items[index] : null;
  // 선택지는 아이템 바뀔 때만 셔플 (재렌더마다 순서 변경 방지).
  const choices = useMemo(() => (item ? shuffle(item.choices) : []), [item]);

  // 요약은 최상단에서 1회 계산 — 완료 분기 렌더와 저장 훅이 같은 값을 공유.
  const summary = summarizePaSession(scores);

  // 완료 시 결과 1회 영속(fire-and-forget). 훅 규칙상 조건부 return 이전 무조건 호출.
  useSaveLiteracyResultOnce({
    done: item === null,
    gameSlug: "phonological-awareness",
    rawScore: summary.correct,
    rawTotal: summary.total,
  });

  // item === null = 모든 아이템 완료 → 요약.
  if (item === null) {
    return (
      <section data-testid="pa-summary" aria-live="polite" className="text-center">
        <p className="text-4xl" aria-hidden="true">🎉</p>
        <h2 className="mt-3 text-xl font-bold">소리 놀이 끝!</h2>
        <p data-testid="pa-summary-score" className="mt-2 text-sm text-gray-700 dark:text-gray-300">
          {summary.total}개 중 <strong>{summary.correct}개</strong>를 맞혔어요.
          {summary.selfCorrected > 0 && ` 스스로 고친 것도 ${summary.selfCorrected}개나 돼요!`}
        </p>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          오늘도 말소리와 즐겁게 놀았어요. 또 만나요!
        </p>
      </section>
    );
  }

  // 이후 item 은 non-null — closure 안전 narrowing 용 const.
  const active: PaItem = item;

  function resolve(score: PaScore, kind: "correct" | "moveon") {
    setLocked(true);
    setFeedback(kind);
    setPhase("feedback");
    setScores((prev) => [...prev, score]);
    // 짧은 피드백 후 다음 아이템.
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
    speak(choice); // 글 못 읽는 아이용 — 고른 선택지를 소리로 들려줌.

    if (phase === "answering") {
      if (choice === active.answer) {
        resolve({ correct: 1, selfCorrected: false }, "correct");
      } else {
        // 첫 오답 — 1회 재시도 허용 + SC 창(3초) 시작.
        setFirstWrong(choice);
        setScOpen(true);
        setPhase("retry");
        setFeedback("retry");
        setTimeout(() => setScOpen(false), SELF_CORRECTION_WINDOW_MS);
      }
      return;
    }

    // phase === "retry" — 재시도 1회로 resolve. SC 창 열림 → 창내(0), 닫힘 → 창밖(초과).
    const score = scorePaAttempt({
      item: active,
      firstAnswer: firstWrong ?? "",
      correctedAnswer: choice,
      selfCorrectionElapsedMs: scOpen ? 0 : SELF_CORRECTION_WINDOW_MS + 1,
    });
    resolve(score, score.correct === 1 ? "correct" : "moveon");
  }

  return (
    <section data-testid="pa-game" aria-label="소리 놀이">
      {/* 진행 표시 */}
      <p className="mb-3 text-xs text-gray-500 dark:text-gray-400" data-testid="pa-progress">
        {index + 1} / {items.length}
      </p>

      {/* 지시문 + 읽어주기(글 못 읽는 아이용) */}
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <p className="text-lg font-semibold text-gray-900 dark:text-gray-100" data-testid="pa-prompt">
          {active.prompt}
        </p>
        <ReadAloudButton text={active.prompt} label="듣기" />
      </div>

      {/* 선택지 */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3" data-testid="pa-choices">
        {choices.map((choice) => (
          <button
            key={choice}
            type="button"
            disabled={locked}
            onClick={() => handleChoice(choice)}
            className="min-h-[56px] rounded-xl border-2 border-emerald-200 bg-white px-4 py-3 text-xl font-bold text-emerald-800 transition hover:border-emerald-400 hover:bg-emerald-50 disabled:opacity-60 dark:border-emerald-800 dark:bg-slate-900 dark:text-emerald-200 dark:hover:bg-slate-800"
          >
            {choice}
          </button>
        ))}
      </div>

      {/* 피드백 — 격려 톤 (틀림 인상 회피) */}
      {feedback && (
        <p
          data-testid="pa-feedback"
          aria-live="polite"
          className="mt-5 text-center text-sm font-medium"
        >
          {feedback === "correct" && <span className="text-emerald-700 dark:text-emerald-300">잘했어요! 🌟</span>}
          {feedback === "retry" && <span className="text-amber-700 dark:text-amber-300">다시 해볼까요? 천천히 골라봐요 🙂</span>}
          {feedback === "moveon" && <span className="text-sky-700 dark:text-sky-300">괜찮아요, 다음 소리로 가볼까요? 👍</span>}
        </p>
      )}
    </section>
  );
}
