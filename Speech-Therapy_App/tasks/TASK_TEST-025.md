---
name: Feature Task
about: SRS V07 기반 Speech-Therapy Platform 개발 태스크 명세
title: "[Test] TEST-025: F18 EXP-2 검증 — Amplitude 코호트 익월 결제 유지율 차이 ≥ 20%p"
labels: 'phase:p1, mode:active, domain:test, epic:f18-exp2, sprint:p1'
assignees: ''
---

## 🎯 Summary
- **Task ID**: TEST-025
- **Epic / Story**: F18 EXP-2 Amplitude 코호트 검증 (V07 신규)
- **Phase**: 🟡 P1
- **Mode**: 명세대로 + 시뮬레이션 (실 prod 데이터는 Phase 1 운영 후)
- **Discope 적용**: 해당 없음
- **목적**: F18 시뮬레이션 클릭 vs 비클릭 익월 결제 유지율 차이 ≥ 20%p 검증 (EXP-2). Amplitude 코호트 분석 자동화. FR-C-031 (EXP-2 검증) 의 evidence + Phase 1 진입 게이트 (M3 리텐션 ≥ 40%) 의 핵심 지표. REQ-FUNC-045 의 정량 검증.

## 🔗 References
- **SRS V07**: [`../docs/65_SRS_V07_Merged_Master_Final.md`](../docs/65_SRS_V07_Merged_Master_Final.md)
  - §4.1 F18 (예측 시뮬레이션 + EXP-2)
  - REQ-FUNC-044 (예측 점수 산출)
  - REQ-FUNC-045 (Amplitude 트래킹)
  - §6.5 Phase 1 진입 게이트 — M3 리텐션 ≥ 40% (EXP-2)
- **Task 강화판**: [`./10_Task_Breakdown_SRS_V07.md`](10_Task_Breakdown_SRS_V07.md) §3 TEST-025
- **선행 구현**: FR-C-031 (EXP-2 검증), FR-C-011 (시뮬레이션), INFRA-005 (Amplitude)

## ✅ Task Breakdown
- [ ] `__tests__/integration/exp-2-cohort.test.ts`:
  - test 1 — Amplitude 시뮬 mock — 코호트 A (시뮬레이션 클릭 user) vs 코호트 B (비클릭 user)
  - test 2 — 익월 결제 유지율 계산 — A 60% / B 35% → 차이 25%p (≥ 20%p PASS)
  - test 3 — 차이 < 20%p 시나리오 — A 50% / B 40% → 10%p FAIL (EXP-2 실패 → 피벗 시그널)
  - test 4 — 표본 크기 < 100명 시 "신뢰도 부족" 표기 + alert
  - test 5 — Amplitude API mock — fetch 호출 0건 (실 API 미호출, fixture 만)
- [ ] `lib/analytics/exp-2.ts` — 순수 함수 `calculateRetentionDelta(cohortA, cohortB)`:
  - input: 두 코호트 user 배열 + paid_next_month 플래그
  - output: `{cohortARate, cohortBRate, deltaPP, passed: deltaPP >= 20}`
- [ ] e2e (옵션) — `/admin/funnel` 페이지에서 EXP-2 코호트 차트 시각화 검증
- [ ] Amplitude event 정합 — `simulation_clicked` + `subscription_renewed` event mapping

## 🧪 Acceptance Criteria (BDD/GWT)
**Scenario 1: 정상 통과 — 차이 ≥ 20%p (REQ-FUNC-045)**
- **Given**: 코호트 A (시뮬 클릭) 500명, 익월 결제 300명 (60%) / 코호트 B (비클릭) 500명, 익월 결제 175명 (35%)
- **When**: calculateRetentionDelta
- **Then**: `{cohortARate: 0.6, cohortBRate: 0.35, deltaPP: 25, passed: true}`

**Scenario 2: 실패 — 차이 < 20%p (피벗 시그널)**
- **Given**: A=50%, B=40%
- **When**: calculate
- **Then**: `{deltaPP: 10, passed: false}` → admin alert "EXP-2 실패, R6 피벗 검토 권고"

**Scenario 3: 표본 크기 부족**
- **Given**: A=50명, B=30명 (총 < 100)
- **When**: calculate
- **Then**: `{warning: 'insufficient_sample', passed: null}` + alert

**Scenario 4: Amplitude event mapping**
- **Given**: user u1 이 `simulation_clicked` event 발화
- **When**: 코호트 분류
- **Then**: u1 cohort='A' 로 정확 분류

**Scenario 5: 익월 결제 정확 산출**
- **Given**: u1 `subscription_renewed` event = 30일 후
- **When**: 익월 retention 계산
- **Then**: u1 paid_next_month=true

**Scenario 6: Phase 1 진입 게이트 evidence**
- **Given**: EXP-2 PASS + M3 리텐션 ≥ 40%
- **When**: Phase 1 진입 검토
- **Then**: 게이트 통과 가능 (V07 §6.5 기준)

**Scenario 7: 시뮬레이션 fixture 격리**
- **Given**: test 환경
- **When**: 100회 반복 실행
- **Then**: 실 Amplitude API 호출 0건 (모두 mock fixture)

## ⚙️ Technical & Non-Functional Constraints
- **REQ-FUNC-044/045**: F18 예측 시뮬레이션 + Amplitude 트래킹
- **§6.5 Phase 1 진입 게이트**: M3 리텐션 ≥ 40% (EXP-2 PASS 의존)
- **R6 피벗 시그널**: EXP-2 실패 시 §11 Seg B Plan B 검토
- **횡단 제약**:
  - [ ] **R4**: Amplitude payload 에 자녀 식별 정보 0건 (userId UUID 만)
  - [ ] **CON-04**: event 명/속성에 의료 금칙어 0건
  - [ ] **Disclaimer**: 시뮬레이션 결과 페이지에 "예측은 의료 평가 아님" disclaimer (FR-C-011 책임)
  - [ ] **G2**: Amplitude Free Tier 활용 (10M events/월)
- **REQ-NF-001**: 코호트 계산 ≤ 3초

## 🏁 Definition of Done
- [ ] 7 시나리오 통합 테스트 PASS
- [ ] calculateRetentionDelta 순수 함수 단위 테스트 PASS
- [ ] 표본 크기 < 100 alert 검증
- [ ] Amplitude API mock — 실 호출 0건 검증
- [ ] Phase 1 진입 게이트 evidence 매핑
- [ ] `tsc --strict` 0 errors
- [ ] PR 본문에 REQ-FUNC-044/045 + §6.5 매핑

## 🚧 Dependencies & Blockers
- **Depends on**: FR-C-031 (EXP-2 검증 Server Action), FR-C-011 (시뮬레이션), INFRA-005 (Amplitude), `lib/analytics/exp-2.ts`
- **Blocks**: Phase 1 진입 게이트 검토 (V07 §6.5)
- **Discope 영향**: 해당 없음 (Phase 1 운영 후 실 prod 데이터로 재검증)
