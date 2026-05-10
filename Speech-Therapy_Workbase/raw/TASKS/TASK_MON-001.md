---
name: Feature Task
about: SRS V06 기반 Speech-Therapy Platform 개발 태스크 명세
title: "[Monitoring] MON-001: 퍼널 CVR 대시보드 + 일간 ±20% 변동 Alert"
labels: 'phase:p1, mode:active, domain:mon, epic:foundation'
assignees: ''
---

## 🎯 Summary
- **Task ID**: MON-001
- **Epic / Story**: Foundation 운영 모니터링 / 비즈니스 KPI
- **Phase**: 🟡 P1
- **Mode**: 명세대로
- **Discope 적용**: 해당 없음
- **목적**: 진단→유료 전환 퍼널의 일간 CVR을 Vercel Analytics 또는 Posthog로 대시보드화 + ±20% 변동 시 Slack Alert. EXP-1/4 검증 + 비즈니스 건전성의 1차 신호.

## 🔗 References
- **SRS**: [`../65_SRS_V06_Nextjs_Fullstack_Final.md`](../65_SRS_V06_Nextjs_Fullstack_Final.md)
  - REQ-NF-020 (퍼널 전환 + ±20% Alert)
  - REQ-NF-027 (CVR ≥ 8%)
- **Task 강화판**: §3-7 MON-001

## ✅ Task Breakdown
- [ ] 퍼널 단계 정의:
  - 1. landing_visit (진단 페이지 진입)
  - 2. diagnosis_started
  - 3. diagnosis_completed
  - 4. result_viewed
  - 5. signup_initiated
  - 6. signup_completed
  - 7. payment_initiated (EXP-4)
  - 8. payment_completed (CVR 측정 종착점)
- [ ] Vercel Analytics 또는 Posthog Free 대시보드:
  - 단계별 전환율 + Drop-off 시각화
  - 일/주/월 trend
  - 코호트 분석 (가입일 기준)
- [ ] CVR 계산 로직:
  - CVR = payment_completed / landing_visit (24h window)
  - 목표 CVR ≥ 8% (REQ-NF-027)
- [ ] Alert 임계:
  - 일간 CVR이 직전 7일 평균 대비 ±20% 변동 → Slack 알림
  - 주간 CVR < 6% → Critical Alert
- [ ] Vercel Cron으로 일 1회 KPI 계산 (`/api/cron/kpi-funnel`):
  - GET → CVR 계산 + 변동률 측정 + Slack 알림
  - 결과 `kpi_snapshots` 테이블 INSERT (장기 분석용)
- [ ] 실시간 위젯 (옵션):
  - admin 페이지에 오늘 CVR + 어제 CVR 대비 변동 표시
  - shadcn/ui Card + Trend 화살표

## 🧪 Acceptance Criteria
**Scenario 1: 퍼널 8단계 모두 추적**
- **Given**: 사용자 1명 진단 → 결제 완료
- **When**: Vercel Analytics 대시보드
- **Then**: 8단계 모두 +1 카운트

**Scenario 2: CVR 계산 정확도**
- **Given**: landing_visit 100, payment_completed 8
- **When**: CVR 계산
- **Then**: CVR = 8.0%

**Scenario 3: ±20% 변동 Alert (REQ-NF-020)**
- **Given**: 직전 7일 평균 CVR 8% → 오늘 5.5%
- **When**: 일 KPI Cron
- **Then**: -31% 변동 → Slack 알림 1회

**Scenario 4: 주간 CVR < 6% Critical**
- **Given**: 주간 CVR 5%
- **When**: 측정
- **Then**: admin 채널 Critical Alert + 비즈니스 리뷰 트리거 (REQ-NF-022)

**Scenario 5: KPI 스냅샷 보존**
- **Given**: 매일 Cron 실행
- **When**: 30일 후
- **Then**: kpi_snapshots 30 row + 차트 가능

**Scenario 6: 코호트 분석**
- **Given**: 가입일 5/1, 5/8, 5/15
- **When**: 코호트 비교
- **Then**: 7일 후 잔존율 표시

## ⚙️ Technical & Non-Functional Constraints
- **REQ-NF-020**: 일간 ±20% Alert
- **REQ-NF-027**: CVR ≥ 8%
- **REQ-NF-022**: LTV:CAC < 3.0 → 주간 리뷰 (MON-003 책임 분담)
- **횡단 제약**:
  - [ ] PII 마스킹 — 이벤트 페이로드 (INFRA-005 통과)
  - [ ] R4 — 자녀 식별 정보 미포함

## 🏁 Definition of Done
- [ ] 모든 Acceptance Criteria 충족
- [ ] 8단계 퍼널 추적 활성
- [ ] CVR Alert 1회 발송 검증
- [ ] kpi_snapshots 마이그레이션 + 30일 데이터 누적 검증
- [ ] `tsc --strict` 0 errors
- [ ] PR 본문에 REQ-NF-020/027 매핑

## 🚧 Dependencies & Blockers
- **Depends on**: INFRA-005 (Analytics + 이벤트 카탈로그), INFRA-002 (Cron), DB-002 (User)
- **Blocks**: EXP-1/4 검증 인프라
- **Discope 영향**: 해당 없음
