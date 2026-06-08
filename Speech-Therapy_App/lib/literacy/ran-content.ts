// MOCK-LIT-03 (CR-2026-007 / REQ-FUNC-CL-10) — RAN(빠른 자동 이름대기) 배열판 + 자극 (자체 제작).
//
// ⚠️ 저작권·원본성 (SRS §4.1 D CL-12 / tasks/11 §2):
//   자극(사물/색깔)·배열은 **자체 구성**이며 NISE-B·ACT 등 표준화 RAN 보드판을 복제하지 않는다.
//   비문자 자극(사물/색깔)만 사용 → 글자/숫자 학습 의존 배제(만 5~7세 적합, CL-10 Q1). 상업 출시 전
//   원본성 법률검토(OPS-LIT-01).
//
// 임상 구인 (wiki F1a-F4-임상설계-reference §2.C · clinical/entities/RAN-빠른자동이름대기):
//   RAN = 음운 인출 자동화 지표(난독 예측, 이중결손 가설). 측정 = 배열판 완료 시간.
//   ⚠️ 자극 유형·배열·정상 범위는 **KOPLAC 자문 확정 대상**(CL-10 Q1/Q2). 규준 부재 → 시간만 기록.
//
// CON-04: 자녀 친화 + 의료/진단/장애 금칙어 0건. ADR-04: "학습장애/난독" 라벨 미노출.

export interface RanColor {
  key: string;
  label: string;
  /// Tailwind 배경 클래스 (색 swatch 렌더).
  className: string;
}

export interface RanObject {
  key: string;
  label: string;
  emoji: string;
}

/// 색깔 자극 5종 (표준 RAN 색 계열 — 자체 선정).
export const RAN_COLORS: readonly RanColor[] = [
  { key: "red", label: "빨강", className: "bg-red-500" },
  { key: "yellow", label: "노랑", className: "bg-yellow-400" },
  { key: "blue", label: "파랑", className: "bg-blue-500" },
  { key: "green", label: "초록", className: "bg-green-500" },
  { key: "black", label: "검정", className: "bg-gray-900" },
];

/// 사물 자극 5종 (보편 그림 이모지 — 자체 선정, NISE 그림 미복제).
export const RAN_OBJECTS: readonly RanObject[] = [
  { key: "ball", label: "공", emoji: "⚽" },
  { key: "star", label: "별", emoji: "⭐" },
  { key: "flower", label: "꽃", emoji: "🌸" },
  { key: "house", label: "집", emoji: "🏠" },
  { key: "car", label: "차", emoji: "🚗" },
];

export type RanStimulusType = "color" | "object";

export const RAN_STIMULUS_LABEL: Record<RanStimulusType, string> = {
  color: "색깔",
  object: "그림",
};

// ----- 배열판 생성기 -----
export const RAN_ROWS = 5;
export const RAN_COLS = 5;
export const RAN_BOARD_SIZE = RAN_ROWS * RAN_COLS; // 25

/// 배열판 인덱스 생성 (자극 세트 인덱스의 flat 배열, length = rows*cols).
///
/// 결정적 배치: cell(r,c) = (c + r*shift) % n. shift=2(기본)면 가로(±1)·세로(±2) 인접이 항상 다른 자극
/// (n>2). → **인접 중복 0** + 테스트 가능(랜덤 없음). 균등 분포는 KOPLAC 후 보강 대상.
export function generateRanBoardIndices(
  stimulusCount: number,
  rows: number = RAN_ROWS,
  cols: number = RAN_COLS,
  shift = 2,
): number[] {
  if (stimulusCount < 3) {
    throw new Error("generateRanBoardIndices: stimulusCount 는 3 이상이어야 인접 중복 회피 가능");
  }
  const board: number[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      board.push((c + r * shift) % stimulusCount);
    }
  }
  return board;
}
