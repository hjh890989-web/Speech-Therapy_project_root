// FR-C-LIT-01 (CR-2026-007 / REQ-FUNC-CL-08·CL-12) — 음운 인식 채점 + 게이트 + 세션 구성.
//
// ⚠️ 활성 게이트 (F15 선례와 동일): 채점의 **임상 해석/영속/F1-a·F4 연동**은 KOPLAC 임상 자문
//    (docs/clinical-consultation-packet_CL08-10_literacy.md) 통과 전까지 비활성.
//    - LITERACY_PA_ENABLED !== 'true' (default off) → UI 휴면("준비 중"), 채점 결과 미영속.
//    - 본 모듈의 순수 함수(채점·세션)는 선배선 — 게이트 ON 시 즉시 작동 + 테스트 가능.
// 연령 게이트 (CL-12): 만 5~7세(60~84개월 — 앱 진단 상한 84)에만 노출.
// 자기교정(SC, CL-08): 첫 응답 오답이라도 3초 내 정답 교정 시 credit.
//
// display/채점 분리: 본 채점은 미니게임 자체 0/1 — 기존 조음 진단(diagnosis.ts)의 raw 점수·HITL
//   escalation 과 무관(별도 활동). F1-a/F4 연동은 KOPLAC 후 별도 wiring.

import { PA_ITEMS, PA_TASK_TYPES, type PaItem, type PaTaskType } from "./pa-content";

// ----- 활성 플래그 (default off) -----
/// LITERACY_PA_ENABLED === 'true' 일 때만 음운 인식 미니게임 활성. KOPLAC 게이트.
export function isPhonologicalAwarenessEnabled(): boolean {
  return process.env.LITERACY_PA_ENABLED === "true";
}

// ----- 연령 게이트 (만 5~7세) -----
export const PA_AGE_MIN_MONTHS = 60; // 만 5세
export const PA_AGE_MAX_MONTHS = 84; // 만 7세 0개월 (앱 진단 childAgeMonths 상한)

/// 음운 인식 미니게임 연령 적격 여부 (CL-12 — 만 5~7세만).
export function isPaAgeEligible(ageMonths: number): boolean {
  return (
    Number.isFinite(ageMonths) &&
    ageMonths >= PA_AGE_MIN_MONTHS &&
    ageMonths <= PA_AGE_MAX_MONTHS
  );
}

// ----- 자기교정(SC) 창 -----
export const SELF_CORRECTION_WINDOW_MS = 3000;

/// 첫 오답 후 정답 교정까지 경과(ms)가 SC 창(3초) 내인가.
export function isWithinSelfCorrectionWindow(elapsedMs: number): boolean {
  return elapsedMs >= 0 && elapsedMs <= SELF_CORRECTION_WINDOW_MS;
}

// ----- 채점 (0/1 + SC) -----
export interface PaAttempt {
  item: PaItem;
  /// 첫 응답(선택지).
  firstAnswer: string;
  /// 첫 응답이 오답일 때 그 뒤 교정한 응답(없으면 미교정).
  correctedAnswer?: string;
  /// 첫 오답 → 교정까지 경과(ms). SC 창 판정용(없으면 SC 불인정).
  selfCorrectionElapsedMs?: number;
}

export interface PaScore {
  /// 0 = 오답 / 1 = 정답(첫 응답 정답 또는 SC 창 내 교정).
  correct: 0 | 1;
  /// 첫 응답 오답 → SC 창 내 정답 교정으로 credit 된 경우 true.
  selfCorrected: boolean;
}

/// 단일 시도 채점 (결정적 순수 함수, CL-08).
///  - 첫 응답 정답 → 1.
///  - 첫 응답 오답 + 3초 내 정답 교정 → 1 (selfCorrected).
///  - 그 외 → 0.
export function scorePaAttempt(attempt: PaAttempt): PaScore {
  const { item, firstAnswer, correctedAnswer, selfCorrectionElapsedMs } = attempt;
  if (firstAnswer === item.answer) return { correct: 1, selfCorrected: false };
  if (
    correctedAnswer === item.answer &&
    selfCorrectionElapsedMs !== undefined &&
    isWithinSelfCorrectionWindow(selfCorrectionElapsedMs)
  ) {
    return { correct: 1, selfCorrected: true };
  }
  return { correct: 0, selfCorrected: false };
}

// ----- 세션 요약 -----
export interface PaSessionSummary {
  total: number;
  correct: number;
  selfCorrected: number;
}

/// 시도 배열 → 세션 요약 (결정적 순수 함수).
export function summarizePaSession(scores: readonly PaScore[]): PaSessionSummary {
  return {
    total: scores.length,
    correct: scores.filter((s) => s.correct === 1).length,
    selfCorrected: scores.filter((s) => s.selfCorrected).length,
  };
}

// ----- 세션 구성 -----
/// 유형별 앞 N개를 합성→탈락→대치 순(잠정 위계)으로 배치한 결정적 세션. UI 입력.
export function buildPaSession(perType = 2): PaItem[] {
  return PA_TASK_TYPES.flatMap((type: PaTaskType) =>
    PA_ITEMS.filter((i) => i.type === type).slice(0, Math.max(0, perType)),
  );
}
