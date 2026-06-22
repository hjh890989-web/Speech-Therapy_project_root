// 구강 운동(oral-motor) 프로브 콘텐츠 — DDK(조음교대운동)·MPT(최대발성지속) 과제 (자체 제작).
//
// ⚠️ 저작권·원본성 (OPS-LIT-01): 과제 음절·문구는 자체 작성. 표준화 검사(SMST-C 등)의 문항·규준
//    미복제. SMST-C(S063)는 '구인(DDK/MPT 측정 방식)'의 영감만 차용.
//
// 임상 구인 (외부 wiki 근거 — ../Speech_Therapy_Wiki/my-healthcare-workbase/wiki/, source S063):
//   DDK = 빠른 조음 교대 운동 속도(/퍼/·/퍼터커/), MPT = 모음 최대 연장 발성 지속 시간(/아~/).
//   조음 기관의 운동 기능을 객관적으로 '측정'(연습/확인)만 — **판정·규준 산출 X**.
//
// CON-04: 의료/진단/장애 금칙어 0건. 부모가 함께 측정(탭/스톱워치).

export interface DdkTask {
  id: string;
  /// 부모/아이용 과제 이름.
  label: string;
  /// 반복할 음절(자체 작성).
  syllables: string;
  /// 안내 문구.
  hint: string;
}

/// DDK 과제 — 단음절 반복(AMR) + 교대(SMR). 결정적 순서.
export const DDK_TASKS: readonly DdkTask[] = [
  { id: "ddk-pa", label: "퍼 빠르게", syllables: "퍼", hint: "“퍼퍼퍼…”를 5초 동안 최대한 빠르고 또렷하게 반복해요." },
  { id: "ddk-ta", label: "터 빠르게", syllables: "터", hint: "“터터터…”를 5초 동안 최대한 빠르고 또렷하게 반복해요." },
  { id: "ddk-pataka", label: "퍼터커 빠르게", syllables: "퍼터커", hint: "“퍼터커”를 5초 동안 순서대로 빠르게 반복해요." },
];

/// MPT 과제 — 모음 연장.
export const MPT_TASK = {
  id: "mpt-a",
  label: "아~ 길게",
  sound: "아",
  hint: "숨을 크게 들이쉬고 “아~”를 가능한 한 길게 이어서 소리 내요.",
} as const;

/// DDK 측정 창(초) — 표준 5초.
export const DDK_DURATION_SEC = 5;
