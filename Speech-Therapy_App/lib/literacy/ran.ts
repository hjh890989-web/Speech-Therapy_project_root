// FR-C-LIT-01 (CR-2026-007 / REQ-FUNC-CL-10·CL-12) — RAN 측정 + 게이트.
//
// ⚠️ 활성 게이트 (F15/음운인식/해독 선례): 임상 해석/영속/F1-a 연동은 KOPLAC 자문
//    (docs/clinical-consultation-packet_CL08-10_literacy.md CL-10) 통과 전까지 비활성.
//    LITERACY_RAN_ENABLED !== 'true' (default off) → UI 휴면.
// 연령 게이트 (CL-12): 만 5~7세 — literacy 공통 재사용.
//
// 측정: 배열판 완료 **시간**(자동화 속도). 0/1 채점 아님 — 속도(items/sec)·item당 ms.
//   ⚠️ ADR-04: 정상 범위(규준)는 KOPLAC + 데이터 후. 현재는 **시간만 기록 + 격려** (난독/학습장애 라벨 0).
//   기존 조음 진단(diagnosis.ts)과 무관(별도 활동) — F1-a acoustic 연동은 KOPLAC 후.

import { isPaAgeEligible } from "@/lib/literacy/phonological-awareness";

// ----- 활성 플래그 (default off) -----
/// LITERACY_RAN_ENABLED === 'true' 일 때만 RAN 미니게임 활성. KOPLAC 게이트.
export function isRanEnabled(): boolean {
  return process.env.LITERACY_RAN_ENABLED === "true";
}

// ----- 연령 게이트 (만 5~7세, literacy 공통) -----
export function isRanAgeEligible(ageMonths: number): boolean {
  return isPaAgeEligible(ageMonths);
}

// ----- 완료 시간 → 속도 지표 -----
export interface RanResult {
  /// 배열판 항목 수.
  itemCount: number;
  /// 완료 소요(ms).
  elapsedMs: number;
  /// 항목당 평균 ms (elapsedMs/itemCount). itemCount 0 또는 elapsedMs 0 → 0.
  msPerItem: number;
  /// 초당 항목 수(자동화 속도). elapsedMs 0 → 0.
  itemsPerSec: number;
}

/// 완료 시간 → RAN 속도 지표 (결정적 순수 함수). 규준 해석 없음(시간/속도 raw 만).
export function computeRanResult(itemCount: number, elapsedMs: number): RanResult {
  const safeItems = Math.max(0, itemCount);
  const safeMs = Math.max(0, elapsedMs);
  const msPerItem = safeItems > 0 && safeMs > 0 ? safeMs / safeItems : 0;
  const itemsPerSec = safeMs > 0 ? safeItems / (safeMs / 1000) : 0;
  return {
    itemCount: safeItems,
    elapsedMs: safeMs,
    msPerItem: Math.round(msPerItem),
    itemsPerSec: Math.round(itemsPerSec * 100) / 100,
  };
}

/// 부모 표시용 초 (소수점 1자리). ADR-04: 시간만, 평가 단정 없음.
export function formatRanSeconds(elapsedMs: number): string {
  return (Math.max(0, elapsedMs) / 1000).toFixed(1);
}
