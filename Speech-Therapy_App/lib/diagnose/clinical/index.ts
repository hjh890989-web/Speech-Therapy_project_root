// CL-01~04 진단 채점 정밀도 — 임상 구현. KOPLAC 자문 검증 완료(2026-05-30, CR-2026-006,
// docs/clinical-consultation-packet_CL01-04_F15.md).
//
// wiring 상태(부분 활성):
//   - CL-03 (cutoffs)        ✅ 활성 — 결과 페이지 밴드 해석(clinical-interpretation.ts).
//   - CL-02 (developmental)  ✅ 활성(**display-only**) — 부모 표시 밴드/카피 완화. 채점·HITL·저장은
//                               raw 기준(적대적 검증 2026-05-30: floor 의 escalation 회귀 회피).
//   - CL-01/04 (phonological-variation) ⏳ C단계 대기 — ErrorPattern 추론 알고리즘 + atypical 분리
//                               (classifyError) wiring 필요. 현재 활성 채점 미연결.
//
// 구성:
//   - cutoffs.ts             (CL-03) 표준화 검사 절단점 → 밴드 매핑.
//   - developmental.ts       (CL-02) 음소×연령 발달 위계 + 오류 분류.
//   - phonological-variation (CL-01 정상 변동 false-positive / CL-04 단일 변동 우선).

export * from "./cutoffs";
export * from "./developmental";
export * from "./phonological-variation";
