"use client";

// 어휘 놀이 클라이언트 (가이드형) — CR-2026-007 후속.
//
// 흐름: ① 낱말 말하기(명명) — 그림+낱말 보여주고 아이가 소리 내어 이름 말하기 → 부모 '다음' →
//   ② 같은 것 찾기(범주) — 한 종류를 함께 고르기. **채점/정답 단정 없이 유도만**(inference·F15 철학).
// LLM 없음(자체 콘텐츠). 타이머/Date.now 없음. CON-04 금칙어 0.

import { useState } from "react";

import {
  buildVocabNamingSession,
  buildVocabSortingRounds,
} from "@/lib/literacy/vocabulary";
import { VOCAB_CATEGORY_LABEL } from "@/lib/literacy/vocabulary-content";

const NAMING = buildVocabNamingSession();
const SORTING = buildVocabSortingRounds();

type Phase = "naming" | "sorting" | "done";

export function VocabularyClient() {
  const [phase, setPhase] = useState<Phase>("naming");
  const [namingIdx, setNamingIdx] = useState(0);
  const [sortingIdx, setSortingIdx] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);

  function restart() {
    setPhase("naming");
    setNamingIdx(0);
    setSortingIdx(0);
    setPicked(null);
  }

  // ── 1) 낱말 말하기 ──
  if (phase === "naming") {
    const item = NAMING[namingIdx];
    const last = namingIdx >= NAMING.length - 1;
    return (
      <section data-testid="vocabulary-game" aria-label="낱말 놀이">
        <p className="mb-2 text-center text-xs text-gray-500 dark:text-gray-400">
          낱말 말하기 · {namingIdx + 1} / {NAMING.length}
        </p>
        <div
          className="mb-6 flex flex-col items-center rounded-2xl border-2 border-emerald-200 bg-emerald-50 p-8 dark:border-emerald-800 dark:bg-emerald-950/30"
          data-testid="vocabulary-naming-card"
        >
          <span className="text-7xl" aria-hidden="true">{item.emoji}</span>
          <p className="mt-4 text-2xl font-bold text-gray-900 dark:text-gray-100" data-testid="vocabulary-word">
            {item.word}
          </p>
        </div>
        <p className="mb-5 text-center text-sm text-gray-500 dark:text-gray-400">
          그림을 보고 아이가 이름을 소리 내어 말하면, 따뜻하게 호응하고 다음으로 넘어가요.
        </p>
        <div className="text-center">
          <button
            type="button"
            data-testid="vocabulary-naming-next"
            onClick={() => {
              if (last) setPhase("sorting");
              else setNamingIdx((i) => i + 1);
            }}
            className="min-h-[56px] rounded-full bg-emerald-600 px-10 py-3 text-lg font-bold text-white transition hover:bg-emerald-700"
          >
            {last ? "같은 것 찾기 ▶" : "다음 →"}
          </button>
        </div>
      </section>
    );
  }

  // ── 2) 같은 것 찾기 (범주) ──
  if (phase === "sorting") {
    const round = SORTING[sortingIdx];
    const last = sortingIdx >= SORTING.length - 1;
    return (
      <section data-testid="vocabulary-game" aria-label="같은 것 찾기">
        <p className="mb-2 text-center text-xs text-gray-500 dark:text-gray-400">
          같은 것 찾기 · {sortingIdx + 1} / {SORTING.length}
        </p>
        <p className="mb-5 text-center text-xl font-semibold text-gray-900 dark:text-gray-100" data-testid="vocabulary-sorting-prompt">
          <strong>{VOCAB_CATEGORY_LABEL[round.target]}</strong>은 어느 것일까요?
        </p>
        <div className="mb-5 flex justify-center gap-3" role="group" aria-label="보기">
          {round.choices.map((c) => {
            const isTarget = c.category === round.target;
            const isPicked = picked === c.id;
            return (
              <button
                key={c.id}
                type="button"
                data-testid="vocabulary-choice"
                data-correct={isTarget ? "true" : "false"}
                aria-pressed={isPicked}
                onClick={() => setPicked(c.id)}
                className={`flex min-h-[88px] min-w-[88px] flex-col items-center rounded-2xl border-2 p-3 transition ${
                  isPicked
                    ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40"
                    : "border-gray-200 bg-white hover:border-emerald-300 dark:border-gray-700 dark:bg-slate-900"
                }`}
              >
                <span className="text-4xl" aria-hidden="true">{c.emoji}</span>
                <span className="mt-1 text-sm text-gray-700 dark:text-gray-300">{c.word}</span>
              </button>
            );
          })}
        </div>
        <p className="mb-5 text-center text-sm text-gray-500 dark:text-gray-400">
          아이와 함께 골라 보아요. 어떤 답이든 까닭을 들어주면 좋아요.
        </p>
        <div className="text-center">
          <button
            type="button"
            data-testid="vocabulary-sorting-next"
            onClick={() => {
              setPicked(null);
              if (last) setPhase("done");
              else setSortingIdx((i) => i + 1);
            }}
            className="min-h-[56px] rounded-full bg-emerald-600 px-10 py-3 text-lg font-bold text-white transition hover:bg-emerald-700"
          >
            {last ? "다 했어요! 🎉" : "다음 →"}
          </button>
        </div>
      </section>
    );
  }

  // ── 완료 ──
  return (
    <section data-testid="vocabulary-done" aria-live="polite" className="text-center">
      <p className="text-4xl" aria-hidden="true">🌟</p>
      <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
        낱말 놀이를 즐겁게 마쳤어요. 잘했어요!
      </p>
      <div className="mt-4">
        <button
          type="button"
          onClick={restart}
          data-testid="vocabulary-restart"
          className="min-h-[44px] rounded-full border border-emerald-600 px-6 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50 dark:text-emerald-300 dark:hover:bg-slate-800"
        >
          다시 해보기
        </button>
      </div>
    </section>
  );
}
