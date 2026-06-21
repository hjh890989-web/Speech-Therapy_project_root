// 구강 운동(oral-motor) 측정 — DDK rate · MPT 지속 시간 (CR-2026-007 후속 / 초기 진단 보강).
//
// ⚠️ **측정값만 — 정상/위험 판정·연령 규준 산출 X.**
//    SMST-C(S063)의 연령별 DDK/MPT 규준 연결(밴드 판정)은 원문(.ingest/txt) 정량치 대조 +
//    임상 자문(KOPLAC-style) 통과 후 별도 wiring. 그 전까지는 literacy RAN/유창성과 동일하게
//    '측정값만 기록·표시'(ORAL_MOTOR_NORM_STATUS='deferred'). 기존 3축 채점/HITL/저장과 무관(독립 프로브).
// 비의료(ADR-04): 객관적 운동 '확인'일 뿐 진단 단정 아님.

import { DDK_DURATION_SEC } from "./oral-motor-content";

// ----- 활성 플래그 (default off) -----
/// ORAL_MOTOR_PROBE_ENABLED === 'true' 일 때만 구강 운동 프로브 활성. (규준 미연결 — 측정만.)
export function isOralMotorEnabled(): boolean {
  return process.env.ORAL_MOTOR_PROBE_ENABLED === "true";
}

// ----- 연령 게이트 (만 3~7세 — DDK/MPT 측정 가능 하한) -----
export const ORAL_MOTOR_AGE_MIN_MONTHS = 36; // 만 3세 (SMST-C 표준화 하한과 정합)
export const ORAL_MOTOR_AGE_MAX_MONTHS = 84; // 만 7세 0개월 (앱 진단 상한)

export function isOralMotorAgeEligible(ageMonths: number): boolean {
  return (
    Number.isFinite(ageMonths) &&
    ageMonths >= ORAL_MOTOR_AGE_MIN_MONTHS &&
    ageMonths <= ORAL_MOTOR_AGE_MAX_MONTHS
  );
}

// ----- 규준 상태 -----
/// 'active' = SMST-C(S063) 원문 대조·검증(2026-06-21) 후 연령 규준 **참고 밴드** 연결(oral-motor-norms.ts).
///   단 '참고'(또래 평균 대비)일 뿐 진단 판정 아님 — 점수/HITL/escalation/저장 raw 불변(display-only, ADR-04).
export const ORAL_MOTOR_NORM_STATUS = "active" as const;

// ----- 측정 (결정적 순수 함수, 판정 X) -----
/// DDK 속도(회/초) = 반복 횟수 / 측정 시간(초). 비정상 입력 → null.
export function computeDdkRate(repetitions: number, seconds: number = DDK_DURATION_SEC): number | null {
  if (
    !Number.isFinite(repetitions) ||
    !Number.isFinite(seconds) ||
    seconds <= 0 ||
    repetitions < 0
  ) {
    return null;
  }
  return Math.round((repetitions / seconds) * 100) / 100;
}

/// MPT 지속 시간(초) — 측정값 그대로(소수 1자리). 비정상 입력 → null. (판정 없음.)
export function normalizeMptSeconds(seconds: number): number | null {
  if (!Number.isFinite(seconds) || seconds < 0) return null;
  return Math.round(seconds * 10) / 10;
}

export interface OralMotorMeasurement {
  /// DDK 속도(회/초) 또는 미측정 null.
  ddkRatePerSec: number | null;
  /// MPT 지속(초) 또는 미측정 null.
  mptSeconds: number | null;
}

/// 측정 결과 요약(판정 없이 값만). UI 표시용.
export function summarizeOralMotor(
  ddkRepetitions: number | null,
  mptSeconds: number | null,
  ddkSeconds: number = DDK_DURATION_SEC,
): OralMotorMeasurement {
  return {
    ddkRatePerSec:
      ddkRepetitions === null ? null : computeDdkRate(ddkRepetitions, ddkSeconds),
    mptSeconds: mptSeconds === null ? null : normalizeMptSeconds(mptSeconds),
  };
}
