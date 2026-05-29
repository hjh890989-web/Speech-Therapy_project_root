// REQ-FUNC-CL-07 — 부모 코칭 팁 (미션 4대 핵심기법 가정 적용 안내).
//
// 미션 난이도(6단계 위계)에 맞는 1~3개 기법을 부모용 카드로 노출.
// 순수 표현 컴포넌트 (상태 없음 → server component 호환). CON-04 무위반.
// 임상 근거: wiki 아동언어치료-핵심기법 §4기법.

import { getCoachingTips } from "@/lib/mocks/coaching-tips";

export interface ParentCoachingTipProps {
  level: number;
}

export function ParentCoachingTip({ level }: ParentCoachingTipProps) {
  const tips = getCoachingTips(level);
  if (tips.length === 0) return null;

  return (
    <aside
      data-testid="parent-coaching-tip"
      className="mt-4 rounded-lg border border-sky-200 bg-sky-50 p-4 dark:border-sky-800 dark:bg-sky-950/30"
    >
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-sky-800 dark:text-sky-200">
        부모 코칭 — 이렇게 도와주세요
      </p>
      <ul className="space-y-2">
        {tips.map((tip) => (
          <li
            key={tip.technique}
            data-testid="parent-coaching-tip-item"
            className="text-sm text-gray-700 dark:text-gray-300"
          >
            <strong className="text-sky-900 dark:text-sky-100">{tip.technique}</strong>
            <span className="text-gray-700 dark:text-gray-300"> — {tip.guide}</span>
            <span className="mt-0.5 block text-xs text-gray-500 dark:text-gray-400">
              {tip.example}
            </span>
          </li>
        ))}
      </ul>
    </aside>
  );
}
