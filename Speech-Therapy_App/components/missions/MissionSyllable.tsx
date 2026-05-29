"use client";

// REQ-FUNC-CL-05 — L2 (음절) Client Component.
//
// 책임:
//   - 음절 카드를 1개씩 순차 표시 (가 / 사 / 라 등 단음절)
//   - "다음 음절" 버튼 → index 증가
//   - 모든 음절 완료 시 onComplete 호출 + done UI
//   - 진행률 (1/N) 표시
//   - CON-04 의료 금칙어 0건
//
// 위계: 단독 음소(L1)와 단어(L3) 사이 — 음소를 음절로 결합하는 연습.
// 디자인 패턴: MissionWordRepeat 와 일관.

import { useState } from "react";
import type { MissionSyllable as Syllable } from "@/lib/mocks/mission-content";

export interface MissionSyllableProps {
  phoneme: string;
  syllables: Syllable[];
  onComplete?: () => void;
}

export function MissionSyllable({ phoneme, syllables, onComplete }: MissionSyllableProps) {
  const [index, setIndex] = useState(0);
  const [done, setDone] = useState(false);

  const total = syllables.length;
  const current = syllables[index];

  if (!current) {
    return (
      <p className="rounded-md border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200">
        준비된 음절이 없어요.
      </p>
    );
  }

  if (done) {
    return (
      <div
        data-testid="mission-syllable-done"
        className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-100"
      >
        <p className="mb-1 font-medium">잘 했어요! 모든 음절을 따라 말해봤어요.</p>
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
      data-testid="mission-syllable"
      className="space-y-3 rounded-md border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900"
    >
      <div className="flex items-baseline justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
          {phoneme} 소리 음절 따라하기
        </p>
        <p
          className="text-xs text-gray-500 dark:text-gray-400"
          data-testid="mission-syllable-progress"
          aria-label={`진행 ${index + 1} / ${total}`}
        >
          {index + 1} / {total}
        </p>
      </div>

      <p
        className="text-4xl font-bold sm:text-5xl"
        data-testid="mission-syllable-text"
      >
        {current.text}
      </p>

      <button
        type="button"
        onClick={handleNext}
        data-testid="mission-syllable-next"
        className="min-h-[44px] w-full rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
      >
        {index + 1 >= total ? "마지막 음절이에요" : "다음 음절"}
      </button>
    </div>
  );
}
