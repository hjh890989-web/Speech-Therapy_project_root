"use client";

// FR-Q-003-CONTENT-V2 — 난이도 1 (단어 따라하기) Client Component.
//
// 책임:
//   - 단어 카드를 1개씩 순차 표시 (text + reading 음절 분리 가이드)
//   - "다음 단어" 버튼 → index 증가
//   - 모든 단어 완료 시 onComplete 호출 (부모가 MissionRunner.finish 트리거)
//   - 진행률 (1/N, 2/N, ...) 표시
//   - CON-04 의료 금칙어 0건 (격려조 카피만)
//
// MissionRunner 와 결합 시: running phase 의 children 으로 inject 되어 timer/progress 아래 렌더.
// 디자인 패턴: MissionWordFill / MissionSentenceBuild 와 일관 (Tailwind, emerald accent, min-h-[44px]).

import { useState } from "react";
import type { MissionWordSimple } from "@/lib/mocks/mission-content";

export interface MissionWordRepeatProps {
  phoneme: string;
  words: MissionWordSimple[];
  onComplete?: () => void;
}

export function MissionWordRepeat({ phoneme, words, onComplete }: MissionWordRepeatProps) {
  const [index, setIndex] = useState(0);
  const [done, setDone] = useState(false);

  const total = words.length;
  const current = words[index];

  // 빈 배열 — 방어적 분기 (정상 호출엔 발생 안 함).
  if (!current) {
    return (
      <p className="rounded-md border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200">
        준비된 단어가 없어요.
      </p>
    );
  }

  if (done) {
    return (
      <div
        data-testid="mission-word-repeat-done"
        className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-100"
      >
        <p className="mb-1 font-medium">잘 했어요! 모든 단어를 따라 말해봤어요.</p>
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
      data-testid="mission-word-repeat"
      className="space-y-3 rounded-md border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900"
    >
      <div className="flex items-baseline justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
          {phoneme} 소리 따라하기
        </p>
        <p
          className="text-xs text-gray-500 dark:text-gray-400"
          data-testid="mission-word-repeat-progress"
          aria-label={`진행 ${index + 1} / ${total}`}
        >
          {index + 1} / {total}
        </p>
      </div>

      <p
        className="text-3xl font-bold tabular-nums sm:text-4xl"
        data-testid="mission-word-repeat-text"
      >
        {current.text}
      </p>

      <p
        className="text-sm text-gray-700 dark:text-gray-300"
        data-testid="mission-word-repeat-reading"
      >
        발음 가이드: <span className="font-mono">{current.reading}</span>
      </p>

      <button
        type="button"
        onClick={handleNext}
        data-testid="mission-word-repeat-next"
        className="min-h-[44px] w-full rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
      >
        {index + 1 >= total ? "마지막 단어예요" : "다음 단어"}
      </button>
    </div>
  );
}
