"use client";

// FR-Q-003-CONTENT — 난이도 2 (단어 빈칸 채우기) Client Component.
//
// 책임:
//   - 단어 카드를 1개씩 순차 표시 (blank + hint → "정답 보기" → full → "다음")
//   - 모든 단어 완료 시 onComplete 호출 (부모가 MissionRunner.finish 트리거)
//   - 진행률 (1/5, 2/5, ...) 표시
//   - CON-04 의료 금칙어 0건 (격려조 카피만)
//
// MissionRunner 와 결합 시: running phase 의 children 으로 inject 되어 timer/progress 아래 렌더.

import { useState } from "react";
import type { MissionWord } from "@/lib/mocks/mission-content";

export interface MissionWordFillProps {
  phoneme: string;
  words: MissionWord[];
  onComplete?: () => void;
}

export function MissionWordFill({ phoneme, words, onComplete }: MissionWordFillProps) {
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
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
        data-testid="mission-word-fill-done"
        className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-100"
      >
        <p className="mb-1 font-medium">잘 했어요! 모든 단어를 만나봤어요.</p>
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
    setRevealed(false);
  };

  return (
    <div
      data-testid="mission-word-fill"
      className="space-y-3 rounded-md border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900"
    >
      <div className="flex items-baseline justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
          {phoneme} 소리 빈칸 채우기
        </p>
        <p
          className="text-xs text-gray-500 dark:text-gray-400"
          data-testid="mission-word-fill-progress"
          aria-label={`진행 ${index + 1} / ${total}`}
        >
          {index + 1} / {total}
        </p>
      </div>

      <p className="text-3xl font-bold tabular-nums sm:text-4xl" data-testid="mission-word-display">
        {revealed ? current.full : current.blank}
      </p>

      <p className="text-sm text-gray-700 dark:text-gray-300">
        힌트: {current.hint}
      </p>

      <div className="flex gap-2">
        {!revealed ? (
          <button
            type="button"
            onClick={() => setRevealed(true)}
            data-testid="mission-word-reveal"
            className="min-h-[44px] flex-1 rounded-md border border-emerald-500 px-4 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-50 dark:text-emerald-300 dark:hover:bg-emerald-950/30"
          >
            정답 보기
          </button>
        ) : (
          <button
            type="button"
            onClick={handleNext}
            data-testid="mission-word-next"
            className="min-h-[44px] flex-1 rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
          >
            {index + 1 >= total ? "마지막 단어예요" : "다음 단어"}
          </button>
        )}
      </div>
    </div>
  );
}
