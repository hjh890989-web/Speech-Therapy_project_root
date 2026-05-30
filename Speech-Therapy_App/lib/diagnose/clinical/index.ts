// CL-01~04 진단 채점 정밀도 — 임상 구현. KOPLAC 자문 검증 완료(2026-05-30, CR-2026-006,
// docs/clinical-consultation-packet_CL01-04_F15.md).
//
// wiring 상태(모두 display-only — 채점/HITL/escalation/저장은 raw 불변):
//   - CL-03 (cutoffs)        ✅ 활성 — 결과 페이지 밴드 해석(clinical-interpretation.ts).
//   - CL-02 (developmental)  ✅ 활성 — 부모 표시 밴드/카피 발달 위계 완화(applyDevelopmentalAdjustment).
//   - CL-04 (phonological-variation) ✅ 활성 — detectVariation 슬롯 정렬 단일 변동 탐지 → 발달 보정
//                               게이팅(atypical skip + 음소 scoping). 채점 raw 0줄 수정.
//   - CL-01 (정상 변동 정규화) ⏸ 단일 단어 dormant — 비음화/연음은 단어경계 의존(시드 미트리거).
//                               NORMAL_VARIATION_RULES 데이터 보존; 점수 정규화는 구/문장 확장 시 별도 CR.
//   잔여(별도 CR): labialization/regressive 자모 규칙 KOPLAC 미확정(미탐지) · errorPattern durable DB 저장.
//
// 구성:
//   - cutoffs.ts             (CL-03) 표준화 검사 절단점 → 밴드 매핑.
//   - developmental.ts       (CL-02) 음소×연령 발달 위계 + 오류 분류.
//   - phonological-variation (CL-01 정상 변동 false-positive / CL-04 단일 변동 우선).

export * from "./cutoffs";
export * from "./developmental";
export * from "./phonological-variation";
