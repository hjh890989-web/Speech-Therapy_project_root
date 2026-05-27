"use client";

// FR-Q-003-CONTENT — 난이도 3 (짧은 문장 만들기) Client Component.
//
// 책임:
//   - 문장 카드를 1개씩 순차 표시 (template + focusWord 강조 + reading 발음 가이드)
//   - "다 했어요" 버튼 → 다음 문장
//   - 모든 문장 완료 시 onComplete 호출
//   - 진행률 (1/4, 2/4, ...) 표시
//   - CON-04 의료 금칙어 0건

import { useState, type ReactNode } from "react";
import type { MissionSentence } from "@/lib/mocks/mission-content";

export interface MissionSentenceBuildProps {
  phoneme: string;
  sentences: MissionSentence[];
  onComplete?: () => void;
}

/// `template` 안에서 `focusWord` 만 강조 마크업으로 감싸 렌더링.
/// 일치 없으면 plain 텍스트 그대로.
function highlightFocus(template: string, focusWord: string): ReactNode {
  const idx = template.indexOf(focusWord);
  if (idx < 0) return template;
  const before = template.slice(0, idx);
  const after = template.slice(idx + focusWord.length);
  return (
    <>
      {before}
      <strong
        className="rounded bg-emerald-100 px-1 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-100"
        data-testid="mission-sentence-focus"
      >
        {focusWord}
      </strong>
      {after}
    </>
  );
}

export function MissionSentenceBuild({
  phoneme,
  sentences,
  onComplete,
}: MissionSentenceBuildProps) {
  const [index, setIndex] = useState(0);
  const [done, setDone] = useState(false);

  const total = sentences.length;
  const current = sentences[index];

  if (!current) {
    return (
      <p className="rounded-md border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200">
        준비된 문장이 없어요.
      </p>
    );
  }

  if (done) {
    return (
      <div
        data-testid="mission-sentence-build-done"
        className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-100"
      >
        <p className="mb-1 font-medium">잘 했어요! 모든 문장을 함께 말해봤어요.</p>
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
      data-testid="mission-sentence-build"
      className="space-y-3 rounded-md border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900"
    >
      <div className="flex items-baseline justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
          {phoneme} 소리 문장 만들기
        </p>
        <p
          className="text-xs text-gray-500 dark:text-gray-400"
          data-testid="mission-sentence-build-progress"
          aria-label={`진행 ${index + 1} / ${total}`}
        >
          {index + 1} / {total}
        </p>
      </div>

      <p className="text-2xl font-semibold sm:text-3xl" data-testid="mission-sentence-template">
        {highlightFocus(current.template, current.focusWord)}
      </p>

      <p
        className="text-sm text-gray-700 dark:text-gray-300"
        data-testid="mission-sentence-reading"
      >
        발음 가이드: <span className="font-mono">{current.reading}</span>
      </p>

      <button
        type="button"
        onClick={handleNext}
        data-testid="mission-sentence-next"
        className="min-h-[44px] w-full rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
      >
        {index + 1 >= total ? "마지막 문장이에요" : "다 했어요"}
      </button>
    </div>
  );
}
