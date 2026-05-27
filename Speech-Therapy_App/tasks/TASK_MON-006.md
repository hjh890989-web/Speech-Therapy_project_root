---
name: Feature Task
about: SRS V07 기반 Speech-Therapy Platform 개발 태스크 명세
title: "[Monitoring] MON-006: expert HHI / Gini 자동 알림 (Phase 2) — Vercel Cron + Slack"
labels: 'phase:p2, mode:active, domain:mon, epic:expert-diversity, sprint:phase-2'
assignees: ''
---

## 🎯 Summary
- **Task ID**: MON-006
- **Epic / Story**: expert 다양성 자동 알림 (V07 신규 — Phase 2)
- **Phase**: 🔴 P2 (Phase 2, MAU 1,000+ 진입 후)
- **Mode**: 명세대로
- **Discope 적용**: 해당 없음
- **목적**: HITL 의 expertId 다양성 (집중도) 을 정량 측정 — HHI (Herfindahl-Hirschman Index) > 0.3 또는 Gini > 0.4 시 Vercel Cron + Slack Alert 자동 트리거. Top-3 expert 가 전체의 60% 이상 cover 하면 모델 편향 risk 증가 → 운영팀 즉시 대응. FR-C-HITL-007 의 Phase 2 자동화.

## 🔗 References
- **SRS V07**: [`../docs/65_SRS_V07_Merged_Master_Final.md`](../docs/65_SRS_V07_Merged_Master_Final.md)
  - §5.5 expert 다양성 모니터링 (Phase 1 Top-3 + Phase 2 HHI/Gini)
  - REQ-FUNC-HITL-007 (다양성 자동 알림)
- **Task 강화판**: [`./10_Task_Breakdown_SRS_V07.md`](10_Task_Breakdown_SRS_V07.md) §4-C MON-006
- **연관**: FR-C-HITL-007 (HHI/Gini 계산 로직), TEST-023 (단위 테스트)

## ✅ Task Breakdown
- [ ] `lib/monitoring/expert-diversity.ts` — HHI + Gini 계산 함수
  - HHI = Σ (expertId 점유율)²
  - Gini = 누적 점유율 곡선의 불평등도
- [ ] `/api/cron/expert-diversity` Route Handler — daily 자정 KST 트리거
- [ ] `external-crons.yml` 의 GitHub Actions 에 schedule 추가 (Vercel Hobby 한도 회피)
- [ ] 측정 기간: 최근 30일 의 HITLQueue 보정 로그 (groundTruthScore UPDATE)
- [ ] 임계치 위반 시 Slack `#expert-diversity-alerts` 알림 — HHI/Gini 수치 + Top-3 expert 점유율
- [ ] `MON-007` 의 `/admin/audit` 에서 HHI/Gini 시계열 graph 추가 (옵션)
- [ ] Phase 1 동안은 Top-3 ≤ 60% 만 모니터링 (간이) — Phase 2 진입 시 HHI/Gini 활성화

## 🧪 Acceptance Criteria
**Scenario 1: HHI > 0.3 알림 (REQ-FUNC-HITL-007)**
- **Given**: 최근 30일 expert 점유율 — A(70%), B(20%), C(10%) → HHI = 0.54
- **When**: daily cron 실행
- **Then**: Slack 알림 (HHI=0.54 + Top-3 expert IDs + 권고 = "추가 expert 채용")

**Scenario 2: Gini > 0.4 알림**
- **Given**: 점유율 분포 — 10 expert 중 상위 1명이 80%
- **When**: Gini 계산
- **Then**: Gini ≈ 0.72 → 알림

**Scenario 3: 임계치 미달 시 무알림**
- **Given**: 균등 분포 (HHI=0.15, Gini=0.18)
- **When**: cron 실행
- **Then**: Slack 알림 없음 (audit_log 만 기록)

**Scenario 4: Phase 1 간이 모드 (Top-3 ≤ 60%)**
- **Given**: Phase 1 + Top-3 expert 점유율 = 75%
- **When**: cron 실행 (간이 모드)
- **Then**: Slack 알림 (Top-3 = 75%, threshold 60% 초과)

**Scenario 5: 단위 테스트 (TEST-023)**
- **Given**: 시뮬레이션 데이터 (균등 / 편향 / 극단)
- **When**: HHI + Gini 계산
- **Then**: 수학적 정확성 검증 (Σ p² + 누적 면적 공식)

## ⚙️ Technical & Non-Functional Constraints
- **REQ-FUNC-HITL-007**: 다양성 자동 알림 (Phase 2 HHI ≤ 0.3 + Gini ≤ 0.4)
- **횡단 제약**:
  - [x] R4 개인정보: expertId 는 운영자 ID — 영유아 PII 무관
  - [x] G2 비용: GitHub Actions cron 무료 + Slack webhook 무료
- **Phase gate**: Phase 1 (MAU < 1,000) 은 간이 모드 → Phase 2 진입 시 HHI/Gini 활성화

## 🏁 Definition of Done
- [ ] `lib/monitoring/expert-diversity.ts` HHI + Gini 계산 함수 단위 테스트 통과
- [ ] `/api/cron/expert-diversity` Route Handler + Bearer 검증
- [ ] `external-crons.yml` schedule 추가
- [ ] 임계치 위반 / 미위반 시뮬레이션 (시뮬 데이터 5세트)
- [ ] Slack `#expert-diversity-alerts` channel 생성
- [ ] TEST-023 PASS
- [ ] PR 본문에 REQ-FUNC-HITL-007 + §5.5 매핑

## 🚧 Dependencies & Blockers
- **Depends on**: FR-C-HITL-007 (HHI/Gini 계산 로직), DB-009 (HITLQueue), API-017 (Cron 패턴), INFRA-006 (GHA cron)
- **Blocks**: 없음 (Phase 2 운영 가시성)
- **Discope 영향**: Phase 2 진입 (MAU 1,000+) 까지 미활성
