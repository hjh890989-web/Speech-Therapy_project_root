// FR-C-LIT-01 / API-LIT-01 (CR-2026-007 / REQ-FUNC-CL-11·CL-12) — 추론 4수준 게이트 + F15 prompt.
//
// ⚠️ 활성 게이트 (음운인식/해독/RAN/유창성 선례 + ADR-14 F15 안전 게이트):
//    임상 활성/LLM 챗봇 통합은 KOPLAC 자문(docs/clinical-consultation-packet_CL08-10_literacy.md CL-11)
//    통과 전까지 비활성. LITERACY_INFERENCE_ENABLED !== 'true' (default off) → UI 휴면.
// 연령 게이트 (CL-12): 만 5-7세 — literacy 공통 재사용.
//
// 본 v1 = **자체 시나리오 가이드형**(LLM 자유생성 X — 아이 대상 안전 + 통제). buildInferencePrompt 는
//   향후 F15 LLM 챗봇 통합(API-LIT-01)용 prompt 빌더(현재 미배선). 평가·채점 X — 유도(elicitation)만.

import { isPaAgeEligible } from "@/lib/literacy/phonological-awareness";
import {
  INFERENCE_LEVEL_LABEL,
  type InferenceScenario,
} from "@/lib/literacy/inference-content";

// ----- 활성 플래그 (default off) -----
/// LITERACY_INFERENCE_ENABLED === 'true' 일 때만 추론 미니게임 활성. KOPLAC 게이트.
export function isInferenceEnabled(): boolean {
  return process.env.LITERACY_INFERENCE_ENABLED === "true";
}

// ----- 연령 게이트 (만 5-7세, literacy 공통) -----
export function isInferenceAgeEligible(ageMonths: number): boolean {
  return isPaAgeEligible(ageMonths);
}

// ----- F15 LLM 프롬프트 빌더 (API-LIT-01, 향후 챗봇 통합용) -----
/// 시나리오 + 4수준 질문(순서대로) → F15 '이야기 친구' 시스템 프롬프트 add-on.
/// **유도만 — 채점/정답 단정 X**(F15 chat-system-prompt 철학). ADR-04 금칙어 0.
/// 결정적 순수 함수. (현재는 가이드형 UI 가 콘텐츠를 직접 사용 — 본 빌더는 LLM 통합 시 소비.)
export function buildInferencePrompt(scenario: InferenceScenario): string {
  const questions = scenario.questions
    .map((q, i) => `${i + 1}. (${INFERENCE_LEVEL_LABEL[q.level]}) ${q.prompt}`)
    .join("\n");
  return [
    "너는 아이와 짧은 이야기로 생각을 나누는 '이야기 친구'야.",
    "아래 상황을 아이에게 들려주고, 이어지는 질문을 1번부터 순서대로 하나씩 물어봐.",
    "아이의 대답을 채점하거나 '틀렸다'고 하지 말고, 따뜻하게 호응하며 다음 질문으로 이어가(유도만).",
    "쉬운 말로, 한 번에 한 질문만 해. 의료적인 말은 쓰지 않아.",
    "",
    `[상황] ${scenario.situation}`,
    "",
    "[질문 — 순서대로]",
    questions,
  ].join("\n");
}
