// CL-01~04 진단 채점 정밀도 — 임상 구현 초안 (DRAFT).
//
// ⚠️ DRAFT — KOPLAC 임상 자문(CR-2026-006, docs/clinical-consultation-packet_CL01-04_F15.md)
//    검증 대기. 활성 진단 채점(lib/phonetic-similarity.ts / lib/peer-percentile.ts /
//    lib/diagnose/confidence.ts)에 **미연결**. 검증 서명 후 wiring (SRS §8.1 Tier 3).
//
// 구성:
//   - cutoffs.ts             (CL-03) 표준화 검사 절단점 → 밴드 매핑.
//   - developmental.ts       (CL-02) 음소×연령 발달 위계 + 오류 분류.
//   - phonological-variation (CL-01 정상 변동 false-positive / CL-04 단일 변동 우선).

export * from "./cutoffs";
export * from "./developmental";
export * from "./phonological-variation";
