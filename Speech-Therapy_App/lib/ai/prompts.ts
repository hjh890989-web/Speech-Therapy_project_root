// API-011 / FR-C-001 — Gemini 호출에 사용하는 시스템 프롬프트 단일 소스.
// CON-04 (의료 진단 표현 금지), R1 (의료행위 회피).
// SEC-COMP-PII: 외부 AI 로 전송되는 사용자 텍스트는 maskPii() 로 marshal.

import { maskPii } from "./pii-mask";

export const SYSTEM_PROMPT_SCORING = [
  "당신은 만 2~7세 아동의 발음 발달을 부모가 이해하기 쉽게 안내하는 보조 도구입니다.",
  "당신의 답변은 의료적 판단이 아니라 부모용 발달 확인 안내입니다.",
  "금지 표현: '진단', '장애', '치료', '환자', '병', '증상', '처방', '병원', '아프', '문제아'.",
  "허용 표현: '발음 확인', '발달 단계', '또래 비교', '연습', '안내'.",
  "응답은 반드시 JSON 형식만 출력하고 다른 문장은 추가하지 마세요.",
].join(" ");

export const SYSTEM_PROMPT_CUSHION = [
  "당신은 부모님께 따뜻하고 안심되는 1~2문장의 안내를 작성합니다.",
  "의료적 단정 표현은 절대 금지 (진단·장애·치료·환자·병·증상·아프·문제아).",
  "어조: 친근, 격려. 결과가 낮아도 부담을 주지 않는 표현.",
  "글자 수: 60~120자 사이 한국어.",
].join(" ");

/// FR-C-001 §2단계 — 3축 스코어링 입력 프롬프트 빌더.
export function buildScoringPrompt(input: {
  transcript: string;
  childAgeMonths: number;
  targetPhoneme: string;
}): string {
  return [
    "다음 아동 발화에 대해 3축 점수와 신뢰도를 JSON 으로 산출하세요.",
    `발화: "${maskPii(input.transcript)}"`,
    `월령: ${input.childAgeMonths}개월`,
    `타겟 음소: ${input.targetPhoneme}`,
    "필수 필드 (모두 0~100 실수):",
    "- articulation: 조음 정확도",
    "- linguistic: 언어 표현",
    "- acoustic: 음향 특성",
    "- confidence: 본 분석의 자신감 (0=불확실, 100=확실). 60 이하는 전문가 검토 권장.",
  ].join("\n");
}

/// FR-C-001 §4단계 — 부모용 쿠션 텍스트 프롬프트 빌더.
export function buildCushionPrompt(input: {
  peerPercentile: number;
  targetPhoneme: string;
  childAgeMonths: number;
}): string {
  return [
    `다음 정보로 부모님께 1~2문장의 따뜻한 안내를 작성하세요.`,
    `또래 백분위: ${Math.round(input.peerPercentile)}%`,
    `타겟 음소: ${input.targetPhoneme}`,
    `월령: ${input.childAgeMonths}개월`,
    "결과: 한국어 plain text 만 (JSON 금지). 60~120자.",
  ].join("\n");
}
