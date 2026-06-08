// MOCK-LIT-01 (CR-2026-007 / REQ-FUNC-CL-08) — 음운 인식 미니게임 아이템 풀 (자체 제작).
//
// ⚠️ 저작권·원본성 (SRS §4.1 D CL-12 / 통합설계 tasks/11 §2):
//   본 아이템(단어·지시문·선택지)은 **전부 자체 제작**이다. NISE-B·ACT 등 표준화 검사의
//   문항·단어목록·순서·지문을 복사·변형 사용하지 않는다. 측정하려는 **구인**(음절 인식 =
//   분야 표준 지식)만 근거로 한국어 고빈도 단어로 직접 구성. 상업 출시 전 원본성 법률검토(OPS-LIT-01).
//
// 임상 구인 (wiki product/concepts/F1a-F4-임상설계-reference §2.A · clinical/concepts/학습장애-언어재활):
//   음운 인식 = 음절/음소 합성·탈락·대치 능력 → 읽기 발달 핵심 선행 지표.
//   ⚠️ 잠정 난이도 위계(합성 1 < 탈락 2 < 대치 3) + 음절 단위 — **KOPLAC 자문 확정 대상**(CL-08 Q1/Q2).
//
// CON-04: 모든 콘텐츠 자녀 친화 + 의료/진단/장애 금칙어 0건.

export type PaTaskType = "blending" | "deletion" | "substitution";

export interface PaItem {
  id: string;
  type: PaTaskType;
  /// 잠정 난이도 위계 (1 합성 / 2 탈락 / 3 대치 — KOPLAC 확정 대상).
  level: number;
  /// 캐릭터가 읽어줄 지시문 (자체 작성). TTS 또는 텍스트 표시.
  prompt: string;
  /// 정답.
  answer: string;
  /// 선택지 (정답 1 + 오답 2). answer 를 반드시 포함. 표시 순서 셔플은 UI 책임.
  choices: [string, string, string];
}

/// 음절 합성 (분절 음절 듣고 단어 만들기) — 잠정 level 1.
const BLENDING: ReadonlyArray<Omit<PaItem, "type" | "level">> = [
  { id: "pa-bl-1", prompt: "「사」하고 「과」를 합치면 무슨 말이 될까요?", answer: "사과", choices: ["사과", "과사", "가사"] },
  { id: "pa-bl-2", prompt: "「나」하고 「무」를 합치면 무슨 말이 될까요?", answer: "나무", choices: ["나무", "무나", "마무"] },
  { id: "pa-bl-3", prompt: "「바」하고 「다」를 합치면 무슨 말이 될까요?", answer: "바다", choices: ["바다", "다바", "바도"] },
  { id: "pa-bl-4", prompt: "「구」하고 「름」을 합치면 무슨 말이 될까요?", answer: "구름", choices: ["구름", "름구", "구를"] },
  { id: "pa-bl-5", prompt: "「토」하고 「끼」를 합치면 무슨 말이 될까요?", answer: "토끼", choices: ["토끼", "끼토", "토키"] },
];

/// 음절 탈락 (특정 음절 빼기) — 잠정 level 2.
const DELETION: ReadonlyArray<Omit<PaItem, "type" | "level">> = [
  { id: "pa-de-1", prompt: "「사과」에서 「과」를 빼면 무엇이 남을까요?", answer: "사", choices: ["사", "과", "사과"] },
  { id: "pa-de-2", prompt: "「나무」에서 「나」를 빼면 무엇이 남을까요?", answer: "무", choices: ["무", "나", "나무"] },
  { id: "pa-de-3", prompt: "「바나나」에서 맨 앞 「바」를 빼면 무엇이 남을까요?", answer: "나나", choices: ["나나", "바나", "바나나"] },
  { id: "pa-de-4", prompt: "「우산」에서 「산」을 빼면 무엇이 남을까요?", answer: "우", choices: ["우", "산", "우산"] },
  { id: "pa-de-5", prompt: "「기차」에서 「차」를 빼면 무엇이 남을까요?", answer: "기", choices: ["기", "차", "기차"] },
];

/// 음절 대치 (특정 음절 바꾸기) — 잠정 level 3.
const SUBSTITUTION: ReadonlyArray<Omit<PaItem, "type" | "level">> = [
  { id: "pa-su-1", prompt: "「사과」에서 「사」를 「포」로 바꾸면 무슨 말이 될까요?", answer: "포과", choices: ["포과", "사포", "포사"] },
  { id: "pa-su-2", prompt: "「나무」에서 「무」를 「비」로 바꾸면 무슨 말이 될까요?", answer: "나비", choices: ["나비", "비무", "무비"] },
  { id: "pa-su-3", prompt: "「바다」에서 「바」를 「나」로 바꾸면 무슨 말이 될까요?", answer: "나다", choices: ["나다", "바나", "다나"] },
  { id: "pa-su-4", prompt: "「구름」에서 「구」를 「보」로 바꾸면 무슨 말이 될까요?", answer: "보름", choices: ["보름", "구보", "보구"] },
  { id: "pa-su-5", prompt: "「머리」에서 「머」를 「꼬」로 바꾸면 무슨 말이 될까요?", answer: "꼬리", choices: ["꼬리", "머꼬", "리꼬"] },
];

/// 전체 아이템 풀 (15 = 합성 5 + 탈락 5 + 대치 5). type/level 부여.
export const PA_ITEMS: readonly PaItem[] = [
  ...BLENDING.map((i) => ({ ...i, type: "blending" as const, level: 1 })),
  ...DELETION.map((i) => ({ ...i, type: "deletion" as const, level: 2 })),
  ...SUBSTITUTION.map((i) => ({ ...i, type: "substitution" as const, level: 3 })),
];

export const PA_TASK_TYPES: readonly PaTaskType[] = ["blending", "deletion", "substitution"];

/// 과제 유형 라벨 (부모용 — 금칙어 0).
export const PA_TASK_LABEL: Record<PaTaskType, string> = {
  blending: "소리 합치기",
  deletion: "소리 빼기",
  substitution: "소리 바꾸기",
};
