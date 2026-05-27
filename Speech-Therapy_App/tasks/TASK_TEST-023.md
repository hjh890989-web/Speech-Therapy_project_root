---
name: Feature Task
about: SRS V07 기반 Speech-Therapy Platform 개발 태스크 명세
title: "[Test] TEST-023: HHI / Gini 다양성 — Phase 1 Top-3 + Phase 2 HHI + Gini + 위반 대응 3종"
labels: 'phase:p1, mode:active, domain:test, epic:hitl-diversity, sprint:p1-to-p2'
assignees: ''
---

## 🎯 Summary
- **Task ID**: TEST-023
- **Epic / Story**: expert 다양성 단위 + 통합 (V07 신규)
- **Phase**: 🟡 P1 → 🔴 P2 (점진)
- **Mode**: 명세대로
- **Discope 적용**: 해당 없음
- **목적**: FR-C-HITL-007 의 `/api/cron/expert-diversity` 의 Phase 1 Top-3 (≤ 60%) + Phase 2 HHI (≤ 0.3) + Gini (≤ 0.4) 계산 단위 테스트 + §5.5.3 위반 대응 3종 시나리오 (집중 우려 / 심각 집중 / Gini 폭주) 통합 테스트. MON-006 Slack Alert 자동화 evidence.

## 🔗 References
- **SRS V07**: [`../docs/65_SRS_V07_Merged_Master_Final.md`](../docs/65_SRS_V07_Merged_Master_Final.md)
  - §5.5 expert 다양성 모니터링 (Wiki expert-diversity-monitoring)
  - §5.5.1 Phase 1 Top-3 ≤ 60%
  - §5.5.2 Phase 2 HHI + Gini
  - §5.5.3 위반 대응 3종 시나리오
  - REQ-FUNC-HITL-007
- **Task 강화판**: [`./10_Task_Breakdown_SRS_V07.md`](10_Task_Breakdown_SRS_V07.md) §3 TEST-023
- **선행 구현**: [`TASK_FR-C-HITL-007.md`](TASK_FR-C-HITL-007.md)

## ✅ Task Breakdown
- [ ] `__tests__/unit/diversity.test.ts` 단위 테스트:
  - calculateTop3Ratio — Phase 1 검증 (5 case)
  - calculateHHI — 이론값 매칭 (5 case)
  - calculateGini — Lorenz curve 검증 (5 case)
- [ ] `__tests__/integration/expert-diversity-cron.test.ts` 통합 테스트:
  - test 1 — Phase 1 정상 (Top-3 ≤ 60%) → alert 0건
  - test 2 — Phase 1 위반 (Top-3 > 60%) → Slack alert 1건
  - test 3 — Phase 2 시나리오 1 (HHI 1500-2500) → system_config.pool_expansion_recommended=true + Slack 통보
  - test 4 — Phase 2 시나리오 2 (HHI ≥ 2500) → hitl_assignment_blocked_until UPDATE for Top-3 + Critical Slack
  - test 5 — Phase 2 시나리오 3 (Gini > 0.4) → assignment_boost_minority_experts=true
- [ ] getCurrentPhase() mock — Phase 1 vs Phase 2 분기 검증
- [ ] HHI 이론값 검증 — `[100, 50, 50]` (총 200) → 0.5² + 0.25² + 0.25² = 0.375 → 3750
- [ ] Gini 이론값 검증 — 완전 평등 `[50, 50, 50]` → 0, 완전 불평등 `[100, 0, 0]` → 1 근사

## 🧪 Acceptance Criteria (BDD/GWT)
**Scenario 1: Phase 1 정상 (REQ-FUNC-HITL-007)**
- **Given**: 30일 1000건, Top-3 = 530건 (53%)
- **When**: Cron 실행 (Phase 1)
- **Then**: alert 0건, `{phase: 'phase_1', top3Ratio: 0.53, alert: false}`

**Scenario 2: Phase 1 위반 (Top-3 > 60%)**
- **Given**: Top-3 = 700/1000 = 70%
- **When**: Cron
- **Then**: Slack alert 1회 "Top-3 점유 70%, Phase 풀 확대 검토" + admin 페이지 플래그

**Scenario 3: Phase 2 시나리오 1 — HHI 1500-2500 (집중 우려)**
- **Given**: HHI=1800, Phase 2 (getCurrentPhase mock)
- **When**: Cron
- **Then**: Slack 통보 + system_config.pool_expansion_recommended=true UPDATE

**Scenario 4: Phase 2 시나리오 2 — HHI ≥ 2500 (심각 집중 자동 차단)**
- **Given**: HHI=3200, Top-3 expertIds=[e1,e2,e3]
- **When**: Cron
- **Then**: hitl_assignment_blocked_until = NOW()+24h for [e1,e2,e3] + Critical Slack alert

**Scenario 5: Phase 2 시나리오 3 — Gini > 0.4 (분산 알고리즘 부스트)**
- **Given**: Gini=0.55
- **When**: Cron
- **Then**: system_config.assignment_boost_minority_experts=true UPDATE + Slack 통보

**Scenario 6: HHI 계산 정확성 (단위)**
- **Given**: reviews=[{e1:100}, {e2:50}, {e3:50}], total=200
- **When**: calculateHHI
- **Then**: 0.375 (스케일 3750)

**Scenario 7: Gini 정확성 (단위)**
- **Given**: 완전 평등 [50, 50, 50]
- **When**: calculateGini
- **Then**: 0 (또는 ≤ 0.05 근사)

**Scenario 8: Bearer 검증**
- **Given**: Bearer 없이 cron URL GET
- **When**: handler 진입
- **Then**: 401

## ⚙️ Technical & Non-Functional Constraints
- **REQ-FUNC-HITL-007**: expert 다양성 모니터링 Phase 1+2
- **§5.5.3**: 위반 대응 3종 시나리오
- **횡단 제약**:
  - [ ] **R4**: 알림 payload 에 expert 이름 0건 (UUID 만)
  - [ ] **CON-04**: 의료 금칙어 0건
  - [ ] **Disclaimer**: 적용 없음 (cron infra)
  - [ ] **G2**: GHA 무료 한도
- **getCurrentPhase()**: ADR-13 env + DB 하이브리드 mock

## 🏁 Definition of Done
- [ ] 8 시나리오 단위 + 통합 테스트 PASS
- [ ] HHI / Gini 이론값 매칭 검증
- [ ] 3종 위반 대응 시나리오 통합 테스트 PASS
- [ ] getCurrentPhase mock Phase 1/2 분기 검증
- [ ] Slack spy 실 발송 0건
- [ ] `tsc --strict` 0 errors
- [ ] PR 본문에 REQ-FUNC-HITL-007 + §5.5 매핑

## 🚧 Dependencies & Blockers
- **Depends on**: FR-C-HITL-007 (Cron handler + diversity.ts), DB-016 (model_retraining_data), ADR-13 (getCurrentPhase + system_config), MON-006 (Slack 어댑터 mock)
- **Blocks**: MON-006 Phase 2 자동 알림 활성
- **Discope 영향**: 해당 없음 (Phase 1 → Phase 2 점진)
