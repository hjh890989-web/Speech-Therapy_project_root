// API-020 — F16 푸시 일일 발화 유도 카피 (CON-04-safe, 날짜 기반 회전).
//
// 정책:
//   - 모든 카피에 "치료/진단/장애" + ADR-04 확장 금칙어 0건 — "발음 발달" / "함께 이야기" 표현만.
//     (lib/push/send.ts 가 발송 직전 hasBannedTerm 으로 한 번 더 fail-closed 검증 — 이중 방어.)
//   - 일상 발화 유도 (REQ-FUNC-040) — 식사 / 놀이 시점 짧은 한마디.
//   - url → /missions (W-AUR 미션 완수 유도 — 북극성 KPI).
//
// 회전: now 의 epoch-day 기준 모듈로 — 매일 다른 카피 (결정적, 테스트 가능).

import type { PushPayload } from "./send";

/// 발화 유도 카피 풀 — CON-04 무위반. 추가 시 금칙어 재확인.
export const DAILY_PUSH_COPIES: ReadonlyArray<{
  title: string;
  body: string;
}> = [
  {
    title: "오늘도 한마디 같이 해봐요",
    body: "저녁 먹을 때 '맛있어요' 한번 말해볼까요?",
  },
  {
    title: "발음 놀이 시간이에요",
    body: "오늘은 '사과'를 또박또박 함께 말해봐요.",
  },
  {
    title: "함께 이야기해요",
    body: "좋아하는 간식 이름을 소리 내어 말해볼까요?",
  },
  {
    title: "오늘의 발음 한 입",
    body: "'바나나'를 세 번 말하면 참 잘했어요!",
  },
  {
    title: "말하기 미션이 도착했어요",
    body: "가족과 '안녕' 인사를 또렷하게 해봐요.",
  },
];

/// 하루 길이 (ms).
const MS_PER_DAY = 86_400_000;

/**
 * 주어진 시각의 epoch-day 기준으로 일일 카피 1건 선택 (결정적 회전).
 *
 * @param now 발송 기준 시각 (dispatch Cron 의 호출 시점).
 * @returns PushPayload — title / body / url('/missions').
 */
export function pickDailyPushCopy(now: Date): PushPayload {
  const dayIndex =
    Math.floor(now.getTime() / MS_PER_DAY) % DAILY_PUSH_COPIES.length;
  const copy = DAILY_PUSH_COPIES[dayIndex];
  return { title: copy.title, body: copy.body, url: "/missions" };
}
