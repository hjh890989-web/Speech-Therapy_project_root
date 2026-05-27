---
name: Feature Task
about: SRS V07 기반 Speech-Therapy Platform 개발 태스크 명세
title: "[FR-C] FR-C-031: F18 EXP-2 Amplitude 코호트 분석 자동화 (시뮬레이션 결제 유지율)"
labels: 'phase:p1, mode:pending, domain:fr-c, epic:f18, sprint:phase1'
assignees: ''
---

## 🎯 Summary
- **Task ID**: FR-C-031
- **Epic / Story**: F18 발달 예측 시뮬레이션 (Phase 1)
- **Phase**: 🟡 P1
- **Mode**: 명세대로
- **Discope 적용**: 해당 없음
- **목적**: EXP-2 검증 — 발달 예측 시뮬레이션 클릭 코호트 vs 비클릭 코호트의 익월 결제 유지율 차이 ≥ 20%p 자동 검증. Amplitude SDK 의 코호트 분석 API 호출 + Slack 자동 알림 + 통과 시 F18 기능 정착 / 미통과 시 §6.7 피벗 트리거.

## 🔗 References
- **SRS V07**: [`../docs/65_SRS_V07_Merged_Master_Final.md`](../docs/65_SRS_V07_Merged_Master_Final.md)
  - §4.1 Phase 1 Epic F18 — 발달 예측 시뮬레이션 (1 신규 task / 1.5 SP)
  - REQ-FUNC-044 (예측 점수 산출)
  - REQ-FUNC-045 (Amplitude 트래킹)
- **Task 강화판**: [`./10_Task_Breakdown_SRS_V07.md`](10_Task_Breakdown_SRS_V07.md) §2-B FR-C-031
- **참고 task**: FR-C-011 (V06 base — 발달 예측 시뮬레이션 Server Action) + INFRA-005 (Amplitude SDK)

## ✅ Task Breakdown
- [ ] `app/actions/exp2-cohort-analysis.ts` Server Action — 월 1회 Cron 호출 (`/api/cron/exp2-cohort`)
- [ ] Amplitude SDK 호출 흐름:
  1. 시뮬레이션 클릭 event = `simulation_click` 누적 user 조회 (지난 월)
  2. 비클릭 코호트 = 진단 완료 user 중 simulation_click 미보유
  3. 각 코호트의 익월 결제 (`subscription_paid` event) 비율 계산
  4. 차이 = clickRetentionRate - nonClickRetentionRate
- [ ] 결과 record — `exp2_results` 테이블 (또는 system_config) INSERT:
  ```typescript
  {
    monthKey: '2026-06',
    clickCohortSize: number,
    nonClickCohortSize: number,
    clickRetentionRate: number,
    nonClickRetentionRate: number,
    diffPercentagePoint: number,
    passed: boolean, // ≥ 20%p
    runAt: Date,
  }
  ```
- [ ] Slack 알림 — `MON-005` 패턴 활용:
  - 통과 (diff ≥ 20%p): "EXP-2 PASS — F18 정착 검증"
  - 미통과: "EXP-2 FAIL — §6.7 피벗 검토 트리거"
- [ ] `/admin/funnel` 페이지에 EXP-2 결과 history 노출 (FR-Q-019 admin)
- [ ] Amplitude API rate limit 방어 — 월 1회 + Bearer `AMPLITUDE_SECRET_KEY` 환경변수
- [ ] cohort size < 50 시 "통계 유의성 부족" 처리 (passed=null + Slack warning)

## 🧪 Acceptance Criteria
**Scenario 1: 클릭 코호트 결제 유지율 ≥ 20%p 차이 — PASS (REQ-FUNC-045 AC)**
- **Given**: clickCohortSize=200, clickRetentionRate=45%, nonClickRetentionRate=20%
- **When**: 월 1회 Cron 실행
- **Then**: diff = 25%p → passed=true + Slack "EXP-2 PASS" 알림

**Scenario 2: 차이 < 20%p — FAIL (피벗 트리거)**
- **Given**: clickRetentionRate=25%, nonClickRetentionRate=20%
- **When**: 분석 실행
- **Then**: diff = 5%p → passed=false + Slack "EXP-2 FAIL — §6.7 피벗 검토"

**Scenario 3: cohort size 부족 — 유의성 보류**
- **Given**: clickCohortSize=30
- **When**: 분석 실행
- **Then**: passed=null + Slack warning "통계 유의성 부족 (n < 50)"

**Scenario 4: Amplitude API 호출 실패 — graceful**
- **Given**: Amplitude rate limit 도달
- **When**: API 호출
- **Then**: try/catch + Slack error 알림 + 재시도 익월

**Scenario 5: /admin/funnel history 노출**
- **Given**: exp2_results 6개월 누적
- **When**: admin 페이지 진입
- **Then**: 6개월 trend chart 노출

**Scenario 6: 예측 점수 산출 (REQ-FUNC-044) 정합**
- **Given**: FR-C-011 (V06 발달 예측 Server Action) 의 score 와 본 코호트 분석 연결
- **When**: 시뮬레이션 클릭 event 발화
- **Then**: Amplitude 에 `predicted_score` property 동봉

## ⚙️ Technical & Non-Functional Constraints
- **REQ-FUNC-044/045**: F18 EXP-2 검증의 단일 source
- **횡단 제약**:
  - [x] CON-04: Slack 알림 카피 의료 금칙어 무위반
  - [ ] R4 개인정보: Amplitude 송출 데이터는 cohort aggregate 만 (개별 user PII 미송출)
  - [ ] R7 PIPA 위반: Amplitude 는 user_id pseudonymous — PIPA §17 국외 이전 동의 범위 내
- **데이터 소스**: Amplitude (외부) — 미국 region 사용 시 PIPA §17 정합 확인 필요 (변호사 자문 OPS-002 영향)
- **피벗 트리거**: 미통과 시 §6.7 (R6 Seg B Plan B 또는 §11 피벗 전략) — 사용자 측 의사결정

## 🏁 Definition of Done
- [ ] `exp2-cohort-analysis` 6 scenario 통과
- [ ] Amplitude API 호출 + Slack 알림 검증
- [ ] cohort size 부족 graceful 처리
- [ ] `/admin/funnel` history 노출 검증
- [ ] `tsc --strict` 0 errors
- [ ] PR 본문에 REQ-FUNC-044/045 매핑
- [ ] EXP-2 통과 / 미통과 시 운영 매뉴얼 (피벗 트리거) 명시

## 🚧 Dependencies & Blockers
- **Depends on**: FR-C-011 (V06 발달 예측 시뮬레이션 Server Action), INFRA-005 (Amplitude SDK 설정), API-017 (/api/cron/* Cron 묶음), FR-Q-019 (admin/funnel)
- **Blocks**: TEST-025 (F18 EXP-2 검증 — 본 Server Action 의 자동 시뮬레이션 테스트), §6.7 피벗 의사결정 (외부)
- **Discope 영향**: 해당 없음
