// FR-C-LIT-01 (CR-2026-007 / REQ-FUNC-CL-10·CL-12) — 읽기 유창성 측정 + 게이트.
//
// ⚠️ 활성 게이트 (음운인식/해독/RAN 선례): 임상 해석/영속/F1-a 연동은 KOPLAC 자문
//    (docs/clinical-consultation-packet_CL08-10_literacy.md CL-10) 통과 전까지 비활성.
//    LITERACY_FLUENCY_ENABLED !== 'true' (default off) → UI 휴면.
// 연령 게이트 (CL-12): **만 6-7세**(해독 선행 필요 — 음운인식/해독/RAN의 만 5-7세보다 상향).
//
// 측정: 지문 완독 **시간** → 분당 음절 수(읽기 속도/자동화). RAN 과 동일 타이머 패턴.
//   ⚠️ ADR-04: 규준(정상 범위)은 KOPLAC + 데이터 후. 현재는 속도만 기록 + 격려(난독/학습장애 라벨 0).
//   기존 조음 진단(diagnosis.ts)과 무관 — F1-a acoustic 연동은 KOPLAC 후.

// ----- 활성 플래그 (default off) -----
/// LITERACY_FLUENCY_ENABLED === 'true' 일 때만 읽기 유창성 미니게임 활성. KOPLAC 게이트.
export function isFluencyEnabled(): boolean {
  return process.env.LITERACY_FLUENCY_ENABLED === "true";
}

// ----- 연령 게이트 (만 6-7세, 해독 선행) -----
export const FLUENCY_AGE_MIN_MONTHS = 72; // 만 6세
export const FLUENCY_AGE_MAX_MONTHS = 84; // 만 7세 0개월 (앱 진단 상한)

/// 읽기 유창성 연령 적격 — 해독 선행 필요로 만 6-7세 한정(CL-10).
export function isFluencyAgeEligible(ageMonths: number): boolean {
  return (
    Number.isFinite(ageMonths) &&
    ageMonths >= FLUENCY_AGE_MIN_MONTHS &&
    ageMonths <= FLUENCY_AGE_MAX_MONTHS
  );
}

// ----- 완독 시간 → 읽기 속도 -----
export interface FluencyResult {
  syllableCount: number;
  elapsedMs: number;
  /// 분당 음절 수(읽기 속도). elapsedMs 0 → 0.
  syllablesPerMin: number;
}

/// 음절 수 + 완독 시간 → 읽기 속도 (결정적 순수 함수). 규준 해석 없음(속도 raw 만).
export function computeFluencyResult(syllableCount: number, elapsedMs: number): FluencyResult {
  const s = Math.max(0, syllableCount);
  const ms = Math.max(0, elapsedMs);
  const syllablesPerMin = ms > 0 ? Math.round((s / (ms / 60_000)) * 10) / 10 : 0;
  return { syllableCount: s, elapsedMs: ms, syllablesPerMin };
}

/// 부모 표시용 초 (소수점 1자리).
export function formatFluencySeconds(elapsedMs: number): string {
  return (Math.max(0, elapsedMs) / 1000).toFixed(1);
}
