---
name: Feature Task
about: SRS V07 기반 Speech-Therapy Platform 개발 태스크 명세
title: "[Test] TEST-022: HITL 재학습 3 게이트 통과 시뮬레이션 단위 테스트 — 0.5% / 500건 / HHI ≤ 0.3"
labels: 'phase:p1, mode:active, domain:test, epic:hitl-retraining, sprint:p1-plus'
assignees: ''
---

## 🎯 Summary
- **Task ID**: TEST-022
- **Epic / Story**: HITL 재학습 3 게이트 검증 (V07 신규)
- **Phase**: 🟡 P1+
- **Mode**: 명세대로
- **Discope 적용**: 해당 없음
- **목적**: FR-C-HITL-006 의 `/api/cron/retraining-gate` 의 3 게이트 (`diffPct ≥ 0.5%` + `cumulative ≥ 500` + `HHI ≤ 0.3`) 의 8가지 통과/실패 조합 (2^3) 시뮬레이션 단위 테스트. ADR-11 RACI 2단계 system Cron 의 evidence. 약 분기 1~2회 발화 예상 트리거 정확성 보장.

## 🔗 References
- **SRS V07**: [`../docs/65_SRS_V07_Merged_Master_Final.md`](../docs/65_SRS_V07_Merged_Master_Final.md)
  - §5.3.3 재학습 3 게이트 (REQ-FUNC-HITL-006)
  - §5.3.4 RACI 2단계 — system R, admin A
  - REQ-FUNC-HITL-006 (3 게이트 — 0.5% / 500 / 0.3 HHI)
  - ADR-11 (HITL 재학습 파이프라인)
- **Task 강화판**: [`./10_Task_Breakdown_SRS_V07.md`](10_Task_Breakdown_SRS_V07.md) §3 TEST-022
- **선행 구현**: [`TASK_FR-C-HITL-006.md`](TASK_FR-C-HITL-006.md), [`TASK_DB-016.md`](TASK_DB-016.md)

## ✅ Task Breakdown
- [ ] `__tests__/unit/three-gate.test.ts` 8 조합 매트릭스 작성:
  - case 1 — TTT (게이트 1+2+3 모두 통과) → `{triggered: true}`
  - case 2 — TTF (게이트 3 HHI 실패) → `{triggered: false, gate3Failed: true}`
  - case 3 — TFT (게이트 2 누적 < 500 실패) → `{triggered: false, gate2Failed: true}`
  - case 4 — TFF (게이트 2+3 실패) → no-op
  - case 5 — FTT (게이트 1 diffPct < 0.5% 실패) → no-op
  - case 6 — FTF
  - case 7 — FFT
  - case 8 — FFF (모두 실패)
- [ ] `__tests__/integration/retraining-gate-cron.test.ts`:
  - test 1 — Cron 호출 + 게이트 통과 → Slack 알림 + system_config UPDATE
  - test 2 — 멱등성 — 7일 이내 재발화 차단
  - test 3 — Bearer 401 검증
  - test 4 — model_retraining_data 30일 윈도우 정합
- [ ] HHI 계산 검증 — `calculateHHI([{e1: 100}, {e2: 50}, {e3: 50}])` = 0.375 → 3750
- [ ] mock DB seed — model_retraining_data 600건 + expert 분포 시드 데이터
- [ ] Slack webhook spy (실제 발송 0건)

## 🧪 Acceptance Criteria (BDD/GWT)
**Scenario 1: TTT 정상 통과 (REQ-FUNC-HITL-006)**
- **Given**: AVG(diffPct)=0.7%, n=600, HHI=0.25
- **When**: evaluateThreeGates()
- **Then**: `{allPassed: true, gate1: {passed: true}, gate2: {passed: true}, gate3: {passed: true}}`

**Scenario 2: 게이트 1 실패 (diffPct < 0.5%)**
- **Given**: AVG(diffPct)=0.3%, n=600, HHI=0.25
- **When**: evaluate
- **Then**: `{allPassed: false, gate1: {passed: false, avgDiffPct: 0.3}}`

**Scenario 3: 게이트 2 실패 (n < 500)**
- **Given**: AVG=0.7%, n=200, HHI=0.25
- **When**: evaluate
- **Then**: `{allPassed: false, gate2: {passed: false, cumulative: 200}}`

**Scenario 4: 게이트 3 실패 (HHI > 0.3)**
- **Given**: AVG=0.7%, n=600, HHI=0.45
- **When**: evaluate
- **Then**: `{allPassed: false, gate3: {passed: false, hhi: 0.45}}`

**Scenario 5: 8 조합 매트릭스 (2^3)**
- **Given**: 게이트별 통과/실패 모든 조합
- **When**: 8 case 실행
- **Then**: 정확한 통과/실패 분기 (TTT 만 triggered=true)

**Scenario 6: Cron 통합 — Slack 알림 + system_config 갱신**
- **Given**: 3 게이트 통과 시뮬
- **When**: `/api/cron/retraining-gate` 실행
- **Then**: Slack spy 1회 호출, system_config.retraining_triggered_at=NOW(), HTTP 200

**Scenario 7: 멱등성 — 7일 이내 재발화 차단**
- **Given**: retraining_triggered_at = 3일 전
- **When**: Cron 재실행 (게이트 모두 통과)
- **Then**: Slack 발송 0건, `{idempotencySkip: true}` 응답

**Scenario 8: HHI 정확성 (단위)**
- **Given**: reviews=[{e1:100}, {e2:50}, {e3:50}]
- **When**: calculateHHI
- **Then**: 0.5² + 0.25² + 0.25² = 0.375 (스케일 3750)

## ⚙️ Technical & Non-Functional Constraints
- **REQ-FUNC-HITL-006**: 3 게이트 (0.5% / 500 / 0.3 HHI)
- **ADR-11**: 재학습 파이프라인 RACI 2단계
- **횡단 제약**:
  - [ ] **R4**: mock seed 에 expert 개인정보 0건 (UUID 만)
  - [ ] **CON-04**: 의료 금칙어 0건
  - [ ] **Disclaimer**: 적용 없음 (cron infra)
  - [ ] **G2**: GHA 무료 한도 내
- **성능**: 단위 테스트 ≤ 100ms / case, 통합 테스트 ≤ 5s

## 🏁 Definition of Done
- [ ] 8 조합 매트릭스 단위 테스트 PASS
- [ ] Cron 통합 테스트 4 시나리오 PASS
- [ ] HHI 계산 정확성 검증
- [ ] Slack spy 실 발송 0건 검증
- [ ] 멱등성 7일 이내 차단 검증
- [ ] `tsc --strict` 0 errors
- [ ] PR 본문에 REQ-FUNC-HITL-006 + ADR-11 매핑

## 🚧 Dependencies & Blockers
- **Depends on**: FR-C-HITL-006 (Cron handler), DB-016 (model_retraining_data), FR-C-HITL-005 (seed 데이터 적재 선행), MON-005 (Slack 어댑터 mock)
- **Blocks**: 외부 ML 엔지니어 위탁 워크플로 활성 (수동, OPS 영역)
- **Discope 영향**: 해당 없음
