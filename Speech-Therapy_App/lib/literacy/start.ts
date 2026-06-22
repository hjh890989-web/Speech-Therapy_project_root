// 문해력 시작(stage 라우팅) 헬퍼 — CR-2026-009.
// 월령 유무에 따라 단계별/전체 활성 놀이를 고르는 결정적 순수 함수(페이지에서 분리해 테스트 용이).

import {
  enabledGamesForAge,
  enabledLiteracyGames,
  type LiteracyGameMeta,
} from "./registry";

/// 월령을 알면 그 발달 단계의 활성 놀이, 모르면(null) 전체 활성 놀이.
/// 월령을 알지만 도메인(24~144) 밖이면 빈 목록(→ '준비 중').
export function enabledGamesForAgeOrAll(
  ageMonths: number | null,
): LiteracyGameMeta[] {
  if (ageMonths === null) return enabledLiteracyGames();
  return enabledGamesForAge(ageMonths);
}
