---
name: Feature Task
about: SRS V07 기반 Speech-Therapy Platform 개발 태스크 명세
title: "[FR-C-HITL] FR-C-HITL-007: expertId 다양성 모니터링 — Phase 1 Top-3 ≤ 60% / Phase 2 HHI + Gini"
labels: 'phase:p1, mode:active, domain:fr-c-hitl, epic:hitl-diversity, sprint:p1-to-p2'
assignees: ''
---

## 🎯 Summary
- **Task ID**: FR-C-HITL-007
- **Epic / Story**: expert 다양성 (V07 신규 — Wiki expert-diversity-monitoring 흡수)
- **Phase**: 🟡 P1 → 🔴 P2 (Phase 1 단순 Threshold, Phase 2 HHI+Gini 본격)
- **Mode**: 명세대로 + 점진 전환 (Phase 1 단순 → Phase 2 이중)
- **Discope 적용**: 해당 없음
- **목적**: `/api/cron/expert-diversity` Vercel/GHA Daily Cron — expertId 검토 분포의 편향 자동 감지. **Phase 1**: Top-3 expert 누적 점유 ≤ 60% 단순 threshold. **Phase 2**: HHI (≤ 0.3 / 3000 환산) + Gini (≤ 0.4) 이중 지표 + 3종 위반 대응 시나리오 (집중 우려 / 심각 집중 / Gini 폭주). Slack Alert + admin 페이지 시각화. FR-C-HITL-006 의 게이트 3 (HHI) 의 원본 메트릭 제공자.

## 🔗 References
- **SRS V07**: [`../docs/65_SRS_V07_Merged_Master_Final.md`](../docs/65_SRS_V07_Merged_Master_Final.md)
  - §5.5 expert 다양성 모니터링 (Wiki expert-diversity-monitoring 흡수)
  - §5.5.1 Phase 1 — Top-3 ≤ 60%
  - §5.5.2 Phase 2 — HHI + Gini 이중
  - §5.5.3 위반 대응 시나리오 (3종)
  - REQ-FUNC-HITL-007 (expert 다양성 모니터링)
- **Task 강화판**: [`./10_Task_Breakdown_SRS_V07.md`](10_Task_Breakdown_SRS_V07.md) §2-C FR-C-HITL-007

## ✅ Task Breakdown
- [ ] `lib/hitl/diversity.ts` — 순수 함수 3종:
  - `calculateTop3Ratio(reviews: ExpertReviewCount[]): number` — Phase 1
  - `calculateHHI(reviews: ExpertReviewCount[]): number` — Phase 2 (Σ (n_i/total)² × 10000 → 0~10000 스케일)
  - `calculateGini(reviews: ExpertReviewCount[]): number` — Phase 2 (Lorenz curve 기반 0~1)
- [ ] `app/api/cron/expert-diversity/route.ts` — Bearer + GET handler:
  - 30일 윈도우 `model_retraining_data.expertId` 집계 `SELECT expertId, COUNT(*) GROUP BY expertId`
  - `getCurrentPhase()` (ADR-13) 호출 → Phase 1/2 분기
  - 임계치 위반 감지 → §5.5.3 의 3종 시나리오 분기
- [ ] Phase 1 분기 — Top-3 > 60% 시 Slack alert (admin 채널)
- [ ] Phase 2 분기:
  - 시나리오 1 (HHI 1500-2500): Slack 통보 "집중 우려, Phase 풀 확대 권고" + system_config 권고 플래그
  - 시나리오 2 (HHI ≥ 2500): 자동 차단 — `hitl_assignment_blocked_until = NOW() + INTERVAL '24 hours'` for Top-3 expertIds + admin 긴급 알림
  - 시나리오 3 (Gini > 0.4): 분산 가중치 조정 — system_config `assignment_boost_minority_experts = true` UPDATE
- [ ] Cron 등록 — `external-crons.yml` `0 5 * * *` (매일 05:00 KST)
- [ ] `/admin/expert-diversity` 페이지 (FR-Q-019 admin hub 의 sub-route) — 30일 HHI/Gini 추이 차트
- [ ] 단위 테스트 — HHI/Gini 계산 검증 (이론값 매칭) + 3 시나리오 통합 테스트

## 🧪 Acceptance Criteria (BDD/GWT)
**Scenario 1: Phase 1 — Top-3 정상 (≤ 60%) (REQ-FUNC-HITL-007)**
- **Given**: 30일 누적 1000건, expert A=200/B=180/C=150, Top-3 합계 530/1000 = 53%
- **When**: Cron 실행 (Phase 1)
- **Then**: alert 0건, `{phase: 'phase_1', top3Ratio: 0.53, alert: false}` 응답

**Scenario 2: Phase 1 위반 — Top-3 > 60% Slack alert**
- **Given**: 1000건, expert A=400/B=200/C=100 = 70%
- **When**: Cron
- **Then**: Slack 1회 발송 "Top-3 점유 70%, Phase 풀 확대 검토 필요" + admin 페이지 플래그

**Scenario 3: Phase 2 HHI 1500-2500 — 집중 우려 (시나리오 1)**
- **Given**: HHI=1800, Phase 2
- **When**: Cron
- **Then**: Slack 통보 "집중 우려" + system_config.pool_expansion_recommended=true UPDATE

**Scenario 4: Phase 2 HHI ≥ 2500 — 심각 집중 자동 차단 (시나리오 2)**
- **Given**: HHI=3200, Top-3 expertIds=[e1,e2,e3]
- **When**: Cron
- **Then**: hitl_assignment_blocked_until = NOW()+24h for [e1,e2,e3] + admin Critical Slack alert

**Scenario 5: Phase 2 Gini > 0.4 — 분산 알고리즘 부스트 (시나리오 3)**
- **Given**: Gini=0.55 (소수 expert 폭주)
- **When**: Cron
- **Then**: system_config.assignment_boost_minority_experts=true UPDATE + Slack 통보

**Scenario 6: Bearer 검증**
- **Given**: 외부 호출자 Bearer 없음
- **When**: cron URL GET
- **Then**: 401 Unauthorized

**Scenario 7: HHI 계산 정확성 (단위 테스트)**
- **Given**: reviews=[{e1: 100}, {e2: 50}, {e3: 50}], total=200
- **When**: calculateHHI
- **Then**: HHI = (100/200)² + (50/200)² + (50/200)² = 0.25 + 0.0625 + 0.0625 = 0.375 → 3750 (스케일)

## ⚙️ Technical & Non-Functional Constraints
- **REQ-FUNC-HITL-007**: expert 다양성 모니터링 (Phase 1+2 점진)
- **횡단 제약**:
  - [ ] **R4**: 알림 payload 에 expert 개인정보 노출 0건 (expertId UUID 만, 이름 미노출)
  - [ ] **CON-04**: Slack 메시지에 의료 금칙어 0건
  - [ ] **G2 비용**: Vercel Hobby 0$ 유지 (GHA cron 권장)
- **MON-006 연동**: HHI > 0.3 또는 Gini > 0.4 시 Slack Alert (Phase 2 자동화)
- **getCurrentPhase()**: ADR-13 system_config 하이브리드 — env + DB

## 🏁 Definition of Done
- [ ] `lib/hitl/diversity.ts` 3 함수 단위 테스트 PASS (이론값 매칭)
- [ ] `/api/cron/expert-diversity` route handler + Bearer 검증
- [ ] GHA cron 등록 (`external-crons.yml`) + 수동 트리거 검증
- [ ] Phase 1 (Top-3 위반) Slack 알림 검증
- [ ] Phase 2 3 시나리오 (HHI 1500-2500 / ≥2500 / Gini > 0.4) 통합 테스트 PASS
- [ ] `/admin/expert-diversity` 시각화 페이지 30일 추이 표시
- [ ] `tsc --strict` 0 errors
- [ ] PR 본문에 REQ-FUNC-HITL-007 + §5.5 매핑

## 🚧 Dependencies & Blockers
- **Depends on**: FR-C-HITL-005 (model_retraining_data 적재), DB-016 (스키마), API-017 (Cron Bearer), MON-005 (Slack 어댑터), ADR-13 (getCurrentPhase + system_config)
- **Blocks**: FR-C-HITL-006 게이트 3 (HHI 메트릭 의존), MON-006 (자동 알림), TEST-023 (다양성 단위/통합 테스트)
- **Discope 영향**: 해당 없음 (Phase 1 → Phase 2 점진 전환)
