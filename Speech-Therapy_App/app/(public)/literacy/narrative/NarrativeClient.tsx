"use client";

// 이야기 놀이 클라이언트 (가이드형) — CR-2026-007 후속.
//
// 흐름: ① 이야기 읽기 — 7장면을 차례로 함께 봄 → ② 다시 말하기 — 이야기문법 7요소 질문을 하나씩
//   주며 아이가 차례대로 다시 말함(부모에게 장면 단서 제공) → 끝. **채점/정답 단정 없이 유도만**.
// LLM 없음(자체 이야기). 타이머/Date.now 없음. CON-04 금칙어 0.

import { useState } from "react";

import { buildRetellSteps } from "@/lib/literacy/narrative";
import { NARRATIVE_STORIES } from "@/lib/literacy/narrative-content";
import { useSaveLiteracyResultOnce } from "@/lib/literacy/use-save-result";

type Phase = "read" | "retell" | "done";

export function NarrativeClient() {
  const [storyIdx, setStoryIdx] = useState(0);
  const [phase, setPhase] = useState<Phase>("read");
  const [step, setStep] = useState(0);

  const story = NARRATIVE_STORIES[storyIdx];
  const steps = buildRetellSteps(story);

  useSaveLiteracyResultOnce({ done: phase === "done", gameSlug: "narrative", rawScore: 1, rawTotal: null });

  function restart() {
    setPhase("read");
    setStep(0);
  }
  function nextStory() {
    setStoryIdx((i) => (i + 1) % NARRATIVE_STORIES.length);
    setPhase("read");
    setStep(0);
  }

  // ── 1) 이야기 읽기 ──
  if (phase === "read") {
    return (
      <section data-testid="narrative-game" aria-label="이야기 읽기">
        <h2 className="mb-4 text-center text-lg font-bold text-gray-900 dark:text-gray-100" data-testid="narrative-title">
          {story.title}
        </h2>
        <ol className="mb-6 space-y-2" data-testid="narrative-scenes">
          {story.scenes.map((s, i) => (
            <li
              key={s.element}
              className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-800 dark:bg-emerald-950/30"
            >
              <span className="text-xs text-emerald-700 dark:text-emerald-300">{i + 1}</span>
              <span className="text-3xl" aria-hidden="true">{s.emoji}</span>
              <span className="text-sm text-gray-800 dark:text-gray-200">{s.caption}</span>
            </li>
          ))}
        </ol>
        <div className="text-center">
          <button
            type="button"
            data-testid="narrative-start-retell"
            onClick={() => {
              setStep(0);
              setPhase("retell");
            }}
            className="min-h-[56px] rounded-full bg-emerald-600 px-10 py-3 text-lg font-bold text-white transition hover:bg-emerald-700"
          >
            차례대로 다시 말하기 ▶
          </button>
        </div>
      </section>
    );
  }

  // ── 2) 다시 말하기 (7요소 스캐폴딩) ──
  if (phase === "retell") {
    const s = steps[step];
    const last = step >= steps.length - 1;
    return (
      <section data-testid="narrative-game" aria-label="다시 말하기" aria-live="polite">
        <p className="mb-2 text-center text-xs text-gray-500 dark:text-gray-400">
          다시 말하기 · {step + 1} / {steps.length}
        </p>
        <div className="mb-5 flex flex-col items-center rounded-2xl border-2 border-emerald-200 bg-emerald-50 p-6 dark:border-emerald-800 dark:bg-emerald-950/30">
          <span className="text-5xl" aria-hidden="true">{s.emoji}</span>
          <p className="mt-3 text-xl font-semibold text-gray-900 dark:text-gray-100" data-testid="narrative-prompt">
            {s.label}
          </p>
        </div>
        <p className="mb-5 text-center text-sm text-gray-500 dark:text-gray-400">
          아이가 자유롭게 이야기하면 따뜻하게 들어주세요. (단서: {s.caption})
        </p>
        <div className="text-center">
          <button
            type="button"
            data-testid="narrative-next"
            onClick={() => {
              if (last) setPhase("done");
              else setStep((n) => n + 1);
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
    <section data-testid="narrative-done" aria-live="polite" className="text-center">
      <p className="text-4xl" aria-hidden="true">🌟</p>
      <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
        이야기를 차례대로 멋지게 말했어요. 잘했어요!
      </p>
      <div className="mt-4 flex flex-col items-center gap-2 sm:flex-row sm:justify-center">
        <button
          type="button"
          onClick={nextStory}
          data-testid="narrative-next-story"
          className="min-h-[44px] rounded-full bg-emerald-600 px-6 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
        >
          다른 이야기 →
        </button>
        <button
          type="button"
          onClick={restart}
          data-testid="narrative-restart"
          className="min-h-[44px] rounded-full border border-emerald-600 px-6 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50 dark:text-emerald-300 dark:hover:bg-slate-800"
        >
          다시 해보기
        </button>
      </div>
    </section>
  );
}
