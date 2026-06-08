// MOCK-LIT-03 (CR-2026-007 / REQ-FUNC-CL-10) — 읽기 유창성 1분 읽기 지문 (자체 제작).
//
// ⚠️ 저작권·원본성 (SRS §4.1 D CL-12 / tasks/11 §2):
//   지문은 **자체 작성**이며 추천도서·교과서·표준화 검사 지문을 인용·복제하지 않는다. 상업 출시 전
//   원본성 법률검토(OPS-LIT-01).
//
// 임상 구인 (wiki F1a-F4-임상설계-reference §2.C):
//   읽기 유창성 = 정확·속도·자동화. 만 6-7세(해독 선행) 대상. 측정 = 분당 정확 음절 수(속도).
//   ⚠️ 규준(정상 범위)은 KOPLAC + 데이터 후. 현재는 속도(음절/분)만 기록 + 격려(ADR-04 라벨 0).
//
// CON-04: 자녀 친화 + 의료/진단/장애 금칙어 0건.

import { countHangulSyllables } from "@/lib/phonetic-similarity";

export type PassageType = "story" | "explanatory";

export interface FluencyPassage {
  id: string;
  type: PassageType;
  /// 1(짧음) / 2(중간). 길이·문장 복잡도 위계 — KOPLAC 보정 대상.
  level: number;
  text: string;
  /// 한글 완성형 음절 수 (countHangulSyllables — 속도 분모). 공백·문장부호 제외.
  syllableCount: number;
}

// 자체 작성 지문 (이야기글 / 설명글 × 레벨). 추천도서 인용 0.
const RAW: ReadonlyArray<Omit<FluencyPassage, "syllableCount">> = [
  {
    id: "rf-1",
    type: "story",
    level: 1,
    text: "토끼가 풀밭에서 뛰어요. 노란 꽃을 보고 활짝 웃어요. 친구 다람쥐도 함께 놀아요.",
  },
  {
    id: "rf-2",
    type: "explanatory",
    level: 1,
    text: "해는 아침에 떠요. 낮에는 하늘 높이 올라가요. 저녁이 되면 천천히 내려가요.",
  },
  {
    id: "rf-3",
    type: "story",
    level: 2,
    text: "작은 새가 나무 위에 앉아 있어요. 아침 햇살이 따뜻하게 비쳐요. 새는 즐겁게 노래를 불러요. 친구 새들도 하나둘 모여들어요.",
  },
  {
    id: "rf-4",
    type: "explanatory",
    level: 2,
    text: "비가 오면 땅이 촉촉해져요. 나무와 풀은 물을 마셔요. 그래서 쑥쑥 자라요. 비가 그치면 하늘에 무지개가 떠요.",
  },
];

/// 전체 지문 (음절 수 = countHangulSyllables 로 산출 — 단일 진실 소스).
export const FLUENCY_PASSAGES: readonly FluencyPassage[] = RAW.map((p) => ({
  ...p,
  syllableCount: countHangulSyllables(p.text),
}));

export const PASSAGE_TYPE_LABEL: Record<PassageType, string> = {
  story: "이야기글",
  explanatory: "설명글",
};

/// 레벨의 첫 지문 (결정적). UI 기본 지문 선택.
export function pickFluencyPassage(level = 1): FluencyPassage {
  return FLUENCY_PASSAGES.find((p) => p.level === level) ?? FLUENCY_PASSAGES[0];
}
