// 다중 단어/위치 조음 프로브 콘텐츠 — 음소별 위치 태깅 단어셋 (자체 제작).
//
// ⚠️ 저작권·원본성 (OPS-LIT-01): 단어는 일상 고빈도 명사 자체 선정. U-TAP/APAC 등의 문항·그림·규준
//    미복제 — '위치별 자음 표집(어두/어중)' 구인 영감만(말소리장애 평가 표준 방식).
//
// 임상 구인 (외부 wiki 근거 — ../Speech_Therapy_Wiki/my-healthcare-workbase/wiki/, maps/말소리장애):
//   단일 단어가 아니라 목표 자음을 **여러 단어·여러 어절 위치(어두/어중)에서 표집**하면 조음 신호가
//   안정화됨. 위치는 목표 자음이 '초성(onset)'으로 나타나는 음절의 단어 내 위치(첫음절=어두 / 이후=어중).
//   **연습/측정만 — 점수는 기존 phonetic-similarity 재사용, 별도 판정/규준 X.** 기존 단일단어 진단 불변.
//
// CON-04: 자녀 친화 + 의료/진단/장애 금칙어 0건. 앱 진단 음소(ㄱ/ㄴ/ㅅ/ㅈ/ㄹ)와 동일.

export type ProbePosition = "initial" | "medial";

/// 위치 라벨 (부모/아이용, 금칙어 0).
export const PROBE_POSITION_LABEL: Record<ProbePosition, string> = {
  initial: "첫소리",
  medial: "이어지는 소리",
};

export interface ProbeWord {
  /// 발화할 단어(자체 선정 고빈도 명사).
  word: string;
  /// 목표 자음이 초성으로 나타나는 위치(어두=initial / 비어두=medial).
  position: ProbePosition;
}

/// 앱 진단 음소(ㄱ/ㄴ/ㅅ/ㅈ/ㄹ). 다른 음소는 빈 셋.
export const PROBE_PHONEMES = ["ㄱ", "ㄴ", "ㅅ", "ㅈ", "ㄹ"] as const;

// 음소별 위치 태깅 단어 — 어두 2 + 어중 2 (목표 자음이 해당 음절 초성으로 나타남).
export const ARTICULATION_PROBE_WORDS: Record<string, ProbeWord[]> = {
  ㄱ: [
    { word: "가방", position: "initial" },
    { word: "가위", position: "initial" },
    { word: "아기", position: "medial" },
    { word: "모기", position: "medial" },
  ],
  ㄴ: [
    { word: "나무", position: "initial" },
    { word: "나비", position: "initial" },
    { word: "바나나", position: "medial" },
    { word: "하나", position: "medial" },
  ],
  ㅅ: [
    { word: "사과", position: "initial" },
    { word: "사자", position: "initial" },
    { word: "가수", position: "medial" },
    { word: "약속", position: "medial" },
  ],
  ㅈ: [
    { word: "자전거", position: "initial" },
    { word: "자동차", position: "initial" },
    { word: "모자", position: "medial" },
    { word: "바지", position: "medial" },
  ],
  ㄹ: [
    { word: "라디오", position: "initial" },
    { word: "리본", position: "initial" },
    { word: "오리", position: "medial" },
    { word: "머리", position: "medial" },
  ],
};

/// 음소의 프로브 단어 목록(미지원 음소 → 빈 배열). 결정적.
export function getProbeWords(phoneme: string): ProbeWord[] {
  return ARTICULATION_PROBE_WORDS[phoneme] ?? [];
}
