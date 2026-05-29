// REQ-FUNC-CL-06 — ABA 6변수 적응형 난이도 모델.
//
// wiki product/concepts/MVP-clinical-foundation §3.1 (Tye-Murray Ch4):
//   난이도는 6개 변수로 조절 — 자극 형태 / 자극 단위 / 유사성 / 맥락 / 과제 / 신호대잡음비.
//   임계: 정확도 80%+ → 상향 / 50% 미만 → 하향.
//
// 본 모듈은 6단계 위계(REQ-FUNC-CL-05)를 6변수로 기술 + 정확도 밴드 분류.
// 진단 채점(CL-01~04) 무관 — 미션 추천 엔진 보조 (임상 자문 게이트 없음).

/// 난이도 레벨의 ABA 6변수 프로파일. 값은 쉬움 → 어려움 진행을 기술하는 라벨.
export interface AbaProfile {
  level: number;
  /// 자극 형태: 폐쇄형(보기 제시) ↔ 개방형(자유 산출).
  stimulusForm: "폐쇄형" | "제한형" | "개방형";
  /// 자극 단위: 6단계 위계와 1:1.
  stimulusUnit: "단독 음소" | "음절" | "단어" | "구" | "문장" | "대화";
  /// 자극 유사성: 낮음(서로 다른 소리) ↔ 높음(혼동되는 소리).
  similarity: "낮음" | "중간" | "높음";
  /// 맥락 단서: 높음(그림/힌트 많음) ↔ 낮음.
  context: "높음" | "중간" | "낮음";
  /// 과제 구조: 구조화(정해진 틀) ↔ 자연(일상 대화).
  task: "구조화" | "반구조화" | "자연";
  /// 신호대잡음비: 좋음(조용) ↔ 나쁨(소음).
  snr: "좋음" | "보통" | "나쁨";
}

const PROFILES: Record<number, AbaProfile> = {
  1: { level: 1, stimulusForm: "폐쇄형", stimulusUnit: "단독 음소", similarity: "낮음", context: "높음", task: "구조화", snr: "좋음" },
  2: { level: 2, stimulusForm: "폐쇄형", stimulusUnit: "음절", similarity: "낮음", context: "높음", task: "구조화", snr: "좋음" },
  3: { level: 3, stimulusForm: "제한형", stimulusUnit: "단어", similarity: "중간", context: "중간", task: "구조화", snr: "좋음" },
  4: { level: 4, stimulusForm: "제한형", stimulusUnit: "구", similarity: "중간", context: "중간", task: "반구조화", snr: "보통" },
  5: { level: 5, stimulusForm: "개방형", stimulusUnit: "문장", similarity: "높음", context: "낮음", task: "자연", snr: "보통" },
  6: { level: 6, stimulusForm: "개방형", stimulusUnit: "대화", similarity: "높음", context: "낮음", task: "자연", snr: "나쁨" },
};

/// 난이도 레벨(1~6)의 ABA 6변수 프로파일. 범위 밖이면 undefined.
export function getAbaProfile(level: number): AbaProfile | undefined {
  return PROFILES[level];
}

/// 정확도 기반 난이도 조절 밴드 (wiki §3.1 임계 80% / 50%).
export type AccuracyBand = "advance" | "maintain" | "reduce";

/**
 * 정확도(0~100) → 조절 밴드.
 *   ≥ 80  → advance (상향)
 *   < 50  → reduce  (하향)
 *   그 외 → maintain
 */
export function classifyAccuracy(accuracyPct: number): AccuracyBand {
  if (accuracyPct >= 80) return "advance";
  if (accuracyPct < 50) return "reduce";
  return "maintain";
}

export const ABA_THRESHOLDS = { ADVANCE_PCT: 80, REDUCE_PCT: 50 } as const;
