// MOCK-LIT-04 (CR-2026-007 / REQ-FUNC-CL-11) — 추론 4수준 시나리오 (자체 제작).
//
// ⚠️ 저작권·원본성 (SRS §4.1 D CL-12 / tasks/11 §2):
//   시나리오·질문은 **자체 작성**이며 NISE-B·ACT 등 표준화 검사의 지문·문항을 인용·복제하지 않는다.
//   상업 출시 전 원본성 법률검토(OPS-LIT-01).
//
// 임상 구인 (wiki F1a-F4-임상설계-reference §2.D · clinical/concepts/내러티브-담화-추론-중재):
//   읽기이해/담화 추론 4수준 위계 — 사실 → 추론 → 비판 → 평가. **유도(elicitation)만, 평가·채점 X**
//   (F15 "이야기 친구" 철학 = lib/ai/chat-system-prompt 정합). 만 5-7세.
//
// CON-04: 자녀 친화 + 의료/진단/장애 금칙어 0건. ADR-04: 정답 단정 없이 "어떻게 생각해?" 톤.

export type InferenceLevel = "fact" | "inference" | "critique" | "evaluation";

/// 4수준 위계 순서 (사실 → 추론 → 비판 → 평가).
export const INFERENCE_LEVELS: readonly InferenceLevel[] = [
  "fact",
  "inference",
  "critique",
  "evaluation",
];

/// 수준 라벨 (부모/아이용 — 금칙어 0).
export const INFERENCE_LEVEL_LABEL: Record<InferenceLevel, string> = {
  fact: "무슨 일이 있었나요?",
  inference: "왜 그럴까요?",
  critique: "괜찮은 행동일까요?",
  evaluation: "나라면 어떻게 할까요?",
};

export interface InferenceQuestion {
  level: InferenceLevel;
  prompt: string;
}

export interface InferenceScenario {
  id: string;
  /// 짧은 상황(자체 작성).
  situation: string;
  /// 4수준 질문 (사실→추론→비판→평가 순서, 각 수준 1개).
  questions: InferenceQuestion[];
}

// 자체 작성 시나리오 3종. 각 4수준 질문(유도형 — 정답 단정 없음).
export const INFERENCE_SCENARIOS: readonly InferenceScenario[] = [
  {
    id: "inf-1",
    situation: "민수가 우산을 안 가지고 나갔는데, 갑자기 비가 내렸어요.",
    questions: [
      { level: "fact", prompt: "민수에게 무슨 일이 있었나요?" },
      { level: "inference", prompt: "민수는 지금 기분이 어떨까요? 왜 그렇게 생각해요?" },
      { level: "critique", prompt: "우산을 안 가져간 건 어땠을까요?" },
      { level: "evaluation", prompt: "내가 민수라면 다음엔 어떻게 할까요?" },
    ],
  },
  {
    id: "inf-2",
    situation: "지우가 친구에게 아끼는 장난감을 먼저 빌려줬어요.",
    questions: [
      { level: "fact", prompt: "지우가 무엇을 했나요?" },
      { level: "inference", prompt: "장난감을 빌린 친구는 어떤 마음일까요?" },
      { level: "critique", prompt: "장난감을 빌려주는 건 어떤 행동일까요?" },
      { level: "evaluation", prompt: "친구가 장난감을 안 돌려주면 나는 어떻게 할까요?" },
    ],
  },
  {
    id: "inf-3",
    situation: "동생이 블록으로 높은 탑을 쌓다가 와르르 무너졌어요.",
    questions: [
      { level: "fact", prompt: "동생에게 무슨 일이 있었나요?" },
      { level: "inference", prompt: "탑은 왜 무너졌을까요?" },
      { level: "critique", prompt: "다시 쌓아보는 건 어떨까요?" },
      { level: "evaluation", prompt: "내가 동생을 도와준다면 어떻게 할까요?" },
    ],
  },
];

/// 시나리오 조회 (결정적). 기본 = 첫 시나리오.
export function pickInferenceScenario(index = 0): InferenceScenario {
  return INFERENCE_SCENARIOS[Math.max(0, Math.min(INFERENCE_SCENARIOS.length - 1, index))];
}
