"use client";

// REQ-FUNC-CL-05 — L1 (단독 음소) Client Component.
//
// 책임:
//   - 대상 음소 1개를 크게 표시 + 입모양/발성 힌트 (mouthHint)
//   - "소리 내봤어요" 버튼 → onComplete 호출 + done UI
//   - CON-04 의료 금칙어 0건 (격려조 카피만)
//
// 위계상 최하 단계 — 단일 음소 발성 연습 (단어/문장 전 음소 자체에 익숙해지기).
// 디자인 패턴: MissionWordRepeat / MissionSentenceBuild 와 일관.

import { useState } from "react";
import type { MissionPhonemeIsolation as Isolation } from "@/lib/mocks/mission-content";

export interface MissionPhonemeIsolationProps {
  phoneme: string;
  isolation: Isolation;
  onComplete?: () => void;
}

export function MissionPhonemeIsolation({
  phoneme,
  isolation,
  onComplete,
}: MissionPhonemeIsolationProps) {
  const [done, setDone] = useState(false);

  if (done) {
    return (
      <div
        data-testid="mission-phoneme-isolation-done"
        className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-100"
      >
        <p className="mb-1 font-medium">잘 했어요! {phoneme} 소리를 내봤어요.</p>
        <p className="text-xs">아래 &quot;완료&quot; 버튼을 눌러 마무리해 주세요.</p>
      </div>
    );
  }

  const handleDone = () => {
    setDone(true);
    onComplete?.();
  };

  return (
    <div
      data-testid="mission-phoneme-isolation"
      className="space-y-3 rounded-md border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900"
    >
      <p className="text-xs font-medium uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
        {phoneme} 소리 내기
      </p>

      <p
        className="text-5xl font-bold sm:text-6xl"
        data-testid="mission-phoneme-isolation-text"
      >
        {isolation.phoneme}
      </p>

      <p
        className="text-sm text-gray-700 dark:text-gray-300"
        data-testid="mission-phoneme-isolation-hint"
      >
        {isolation.mouthHint}
      </p>

      <button
        type="button"
        onClick={handleDone}
        data-testid="mission-phoneme-isolation-next"
        className="min-h-[44px] w-full rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
      >
        소리 내봤어요
      </button>
    </div>
  );
}
