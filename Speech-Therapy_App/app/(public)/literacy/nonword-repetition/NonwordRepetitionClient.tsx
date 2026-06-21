"use client";

// 비단어 따라말하기 클라이언트 (가이드형, 부모 매개) — CR-2026-007 후속.
//
// 흐름: 부모가 무의미 음절열을 천천히 한 번 들려줌 → 아이가 똑같이 따라 말함 → 부모 '다음' →
//   음절 길이가 점점 늘어남. **채점/정답 단정 없이 유도만**(inference·F15 철학).
// 아이는 '소리'로 듣고 따라 말하도록 — 글자 카드는 부모용(원하면 가리기 토글). 타이머/Date.now 없음.
// CON-04 금칙어 0.

import { useState } from "react";

import { buildNwrSession } from "@/lib/literacy/nonword-repetition";

const SESSION = buildNwrSession();

export function NonwordRepetitionClient() {
  const [idx, setIdx] = useState(0);
  const [hidden, setHidden] = useState(false);
  const [done, setDone] = useState(false);

  function restart() {
    setIdx(0);
    setDone(false);
  }

  if (done) {
    return (
      <section data-testid="nwr-done" aria-live="polite" className="text-center">
        <p className="text-4xl" aria-hidden="true">🌟</p>
        <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
          소리를 잘 기억해 따라 말했어요. 잘했어요!
        </p>
        <div className="mt-4">
          <button
            type="button"
            onClick={restart}
            data-testid="nwr-restart"
            className="min-h-[44px] rounded-full border border-emerald-600 px-6 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50 dark:text-emerald-300 dark:hover:bg-slate-800"
          >
            다시 해보기
          </button>
        </div>
      </section>
    );
  }

  const item = SESSION[idx];
  const last = idx >= SESSION.length - 1;

  return (
    <section data-testid="nwr-game" aria-label="소리 따라 말하기">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {idx + 1} / {SESSION.length} · 소리 {item.length}개
        </p>
        <button
          type="button"
          data-testid="nwr-toggle-hide"
          aria-pressed={hidden}
          onClick={() => setHidden((h) => !h)}
          className="rounded-full border border-gray-300 px-3 py-1 text-xs text-gray-600 transition hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-slate-800"
        >
          {hidden ? "글자 보기" : "글자 가리기"}
        </button>
      </div>

      <div className="mb-6 flex min-h-[140px] flex-col items-center justify-center rounded-2xl border-2 border-emerald-200 bg-emerald-50 p-8 dark:border-emerald-800 dark:bg-emerald-950/30">
        {hidden ? (
          <span className="text-5xl" aria-hidden="true" data-testid="nwr-hidden">🔊</span>
        ) : (
          <p
            className="text-4xl font-bold tracking-wide text-gray-900 dark:text-gray-100"
            data-testid="nwr-syllables"
          >
            {item.syllables}
          </p>
        )}
      </div>

      <p className="mb-5 text-center text-sm text-gray-500 dark:text-gray-400">
        부모님이 천천히 한 번 들려주면, 아이가 똑같이 따라 말해요. 어떤 소리든 즐겁게 호응해 주세요.
      </p>
      <div className="text-center">
        <button
          type="button"
          data-testid="nwr-next"
          onClick={() => {
            if (last) setDone(true);
            else setIdx((i) => i + 1);
          }}
          className="min-h-[56px] rounded-full bg-emerald-600 px-10 py-3 text-lg font-bold text-white transition hover:bg-emerald-700"
        >
          {last ? "다 했어요! 🎉" : "다음 →"}
        </button>
      </div>
    </section>
  );
}
