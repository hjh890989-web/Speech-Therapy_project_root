"use client";

// REQ-FUNC-CL-05 — L4 (구) Client Component.
//
// 책임:
//   - 짧은 구 카드를 1개씩 순차 표시 (phrase + focusWord 강조 + reading 가이드)
//   - "다 했어요" 버튼 → 다음 구
//   - 모든 구 완료 시 onComplete 호출 + done UI
//   - 진행률 (1/N) 표시
//   - CON-04 의료 금칙어 0건
//
// 위계: 단어(L3)와 문장(L5) 사이 — 단어를 짧은 구로 확장 (빨간 사과).
// 디자인 패턴: MissionSentenceBuild 와 일관 (focusWord 강조).

import { useState, type ReactNode } from "react";
import type { MissionPhrase as Phrase } from "@/lib/mocks/mission-content";

export interface MissionPhraseProps {
  phoneme: string;
  phrases: Phrase[];
  onComplete?: () => void;
}

/// `phrase` 안에서 `focusWord` 만 강조 마크업으로 감싸 렌더링. 일치 없으면 plain.
function highlightFocus(phrase: string, focusWord: string): ReactNode {
  const idx = phrase.indexOf(focusWord);
  if (idx < 0) return phrase;
  const before = phrase.slice(0, idx);
  const after = phrase.slice(idx + focusWord.length);
  return (
    <>
      {before}
      <strong
        className="rounded bg-emerald-100 px-1 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-100"
        data-testid="mission-phrase-focus"
      >
        {focusWord}
      </strong>
      {after}
    </>
  );
}

export function MissionPhrase({ phoneme, phrases, onComplete }: MissionPhraseProps) {
  const [index, setIndex] = useState(0);
  const [done, setDone] = useState(false);

  const total = phrases.length;
  const current = phrases[index];

  if (!current) {
    return (
      <p className="rounded-md border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200">
        준비된 구가 없어요.
      </p>
    );
  }

  if (done) {
    return (
      <div
        data-testid="mission-phrase-done"
        className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-100"
      >
        <p className="mb-1 font-medium">잘 했어요! 모든 구를 함께 말해봤어요.</p>
        <p className="text-xs">아래 &quot;완료&quot; 버튼을 눌러 마무리해 주세요.</p>
      </div>
    );
  }

  const handleNext = () => {
    if (index + 1 >= total) {
      setDone(true);
      onComplete?.();
      return;
    }
    setIndex(index + 1);
  };

  return (
    <div
      data-testid="mission-phrase"
      className="space-y-3 rounded-md border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900"
    >
      <div className="flex items-baseline justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
          {phoneme} 소리 구 만들기
        </p>
        <p
          className="text-xs text-gray-500 dark:text-gray-400"
          data-testid="mission-phrase-progress"
          aria-label={`진행 ${index + 1} / ${total}`}
        >
          {index + 1} / {total}
        </p>
      </div>

      <p className="text-2xl font-semibold sm:text-3xl" data-testid="mission-phrase-text">
        {highlightFocus(current.phrase, current.focusWord)}
      </p>

      <p
        className="text-sm text-gray-700 dark:text-gray-300"
        data-testid="mission-phrase-reading"
      >
        발음 가이드: <span className="font-mono">{current.reading}</span>
      </p>

      <button
        type="button"
        onClick={handleNext}
        data-testid="mission-phrase-next"
        className="min-h-[44px] w-full rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
      >
        {index + 1 >= total ? "마지막 구예요" : "다 했어요"}
      </button>
    </div>
  );
}
