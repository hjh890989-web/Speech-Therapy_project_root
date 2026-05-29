"use client";

// REQ-FUNC-CL-05 — L6 (대화) Client Component.
//
// 책임:
//   - 부모가 던지는 질문(prompt)을 1개씩 순차 표시 + 턴테이킹 안내(turnHint)
//   - "다음 질문" 버튼 → index 증가
//   - 모든 질문 완료 시 onComplete 호출 + done UI
//   - 진행률 (1/N) 표시
//   - CON-04 의료 금칙어 0건
//
// 위계상 최상 단계 — 단어/문장을 넘어 주고받는 대화로 자연 발화 유도.
// 임상 근거: wiki 아동언어치료-핵심기법 §반응적 상호작용 + 기다리기 (REQ-FUNC-CL-07 연계).

import { useState } from "react";
import type { MissionConversation as Conversation } from "@/lib/mocks/mission-content";

export interface MissionConversationProps {
  phoneme: string;
  conversations: Conversation[];
  onComplete?: () => void;
}

export function MissionConversation({
  phoneme,
  conversations,
  onComplete,
}: MissionConversationProps) {
  const [index, setIndex] = useState(0);
  const [done, setDone] = useState(false);

  const total = conversations.length;
  const current = conversations[index];

  if (!current) {
    return (
      <p className="rounded-md border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200">
        준비된 대화가 없어요.
      </p>
    );
  }

  if (done) {
    return (
      <div
        data-testid="mission-conversation-done"
        className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-100"
      >
        <p className="mb-1 font-medium">잘 했어요! 아이와 도란도란 이야기 나눴어요.</p>
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
      data-testid="mission-conversation"
      className="space-y-3 rounded-md border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900"
    >
      <div className="flex items-baseline justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
          {phoneme} 소리 대화 나누기
        </p>
        <p
          className="text-xs text-gray-500 dark:text-gray-400"
          data-testid="mission-conversation-progress"
          aria-label={`진행 ${index + 1} / ${total}`}
        >
          {index + 1} / {total}
        </p>
      </div>

      <p
        className="text-2xl font-semibold sm:text-3xl"
        data-testid="mission-conversation-text"
      >
        “{current.prompt}”
      </p>

      <p
        className="rounded-md bg-sky-50 px-3 py-2 text-sm text-sky-900 dark:bg-sky-950/40 dark:text-sky-100"
        data-testid="mission-conversation-hint"
      >
        💡 {current.turnHint}
      </p>

      <button
        type="button"
        onClick={handleNext}
        data-testid="mission-conversation-next"
        className="min-h-[44px] w-full rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
      >
        {index + 1 >= total ? "마지막 질문이에요" : "다음 질문"}
      </button>
    </div>
  );
}
