// REQ-FUNC-CL-07 — 미션 4대 핵심기법 부모 코칭 데이터.
//
// wiki clinical/concepts/아동언어치료-핵심기법 §4기법:
//   평행 발화 / 확장 / 기다리기(3~5초) / 반응적 상호작용 — "모든 활동의 토대".
//
// 본 데이터는 미션 플레이 UI 의 부모 코칭 팁으로 노출 (가정 적용 안내).
// 채점 로직 무관 (텍스트 가이드) → 임상 자문 게이트 없음. F15 챗봇 적용은 별개(ADR-14).
// CON-04: 의료/진단/장애 금칙어 0건.

export interface CoachingTip {
  /// 기법명.
  technique: string;
  /// 부모 적용 가이드.
  guide: string;
  /// 가정 예시.
  example: string;
}

const PARALLEL_TALK: CoachingTip = {
  technique: "평행 발화",
  guide: "아이가 하는 행동을 옆에서 말로 표현해 주세요.",
  example: "“우리 ○○이가 사과를 들고 있네!”",
};

const EXPANSION: CoachingTip = {
  technique: "확장",
  guide: "아이가 한 말을 조금 더 길게 늘려 들려주세요.",
  example: "아이가 “차!” 하면 → “응, 빨간 차가 쌩쌩 달려가네.”",
};

const WAITING: CoachingTip = {
  technique: "기다리기",
  guide: "아이가 스스로 말할 수 있도록 3~5초 기다려 주세요.",
  example: "질문한 뒤 마음속으로 천천히 다섯까지 세어 보세요.",
};

const RESPONSIVE: CoachingTip = {
  technique: "반응적 상호작용",
  guide: "아이가 관심을 보이는 것에 바로 반응해 주세요.",
  example: "아이가 고양이를 보면 → “고양이다! 야옹~”",
};

/// 4대 핵심기법 정본.
export const COACHING_TECHNIQUES: readonly CoachingTip[] = [
  PARALLEL_TALK,
  EXPANSION,
  WAITING,
  RESPONSIVE,
];

/**
 * 미션 난이도(6단계 위계, REQ-FUNC-CL-05) 별 관련 기법 1~3개.
 * 기다리기는 전 레벨 공통 (모든 발화 유도의 토대).
 *   1~2 단독음소/음절 → 기다리기 + 반응적 상호작용
 *   3~4 단어/구       → 기다리기 + 평행 발화 + 확장
 *   5~6 문장/대화     → 기다리기 + 확장 + 반응적 상호작용
 */
export function getCoachingTips(level: number): CoachingTip[] {
  // 범위 밖(< 1 또는 > 6) → 빈 배열 (ParentCoachingTip 가 null 렌더). 방어적 가드.
  if (level < 1 || level > 6) return [];
  if (level <= 2) return [WAITING, RESPONSIVE];
  if (level <= 4) return [WAITING, PARALLEL_TALK, EXPANSION];
  return [WAITING, EXPANSION, RESPONSIVE]; // 5~6
}
