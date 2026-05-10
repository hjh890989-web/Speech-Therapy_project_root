---
name: Feature Task
about: SRS V06 기반 Speech-Therapy Platform 개발 태스크 명세
title: "[Monitoring] MON-003: HITL 큐 24h Alert + LTV:CAC 주간 리뷰 (D4 단순화)"
labels: 'phase:p1, mode:replace, domain:mon, epic:hitl'
assignees: ''
---

## 🎯 Summary
- **Task ID**: MON-003
- **Epic / Story**: HITL 모니터링 / 비즈니스 KPI
- **Phase**: 🟡 P1
- **Mode**: 🔵 Replace 모니터링 (D4 적용)
- **Discope 적용**: D4 (HITL Realtime 미사용 → DB 폴링 + Slack)
- **목적**: HITL 큐의 24h 초과 3건+ Alert + LTV:CAC < 3.0 주간 리뷰 트리거. SRS는 Realtime 어드민에서 모니터링하지만 D4 적용으로 Cron 기반 DB 폴링으로 단순화.

## 🔗 References
- **SRS**: [`../65_SRS_V06_Nextjs_Fullstack_Final.md`](../65_SRS_V06_Nextjs_Fullstack_Final.md)
  - REQ-NF-022 (LTV:CAC < 3.0 주간 리뷰)
  - REQ-NF-023 (HITL 24h 초과 3건+ Alert)
- **Task 강화판**: §3-7 MON-003 (Replace)
- **검토 보고서**: §1.2 [추가 D4]

## ✅ Task Breakdown
- [ ] FR-C-014가 1시간 주기 Cron으로 모니터링 — 본 태스크는 추가 통계 + 주간 리뷰
- [ ] HITL 통계 KPI:
  - pending count
  - 24h 초과 count (REQ-NF-023 임계)
  - 평균 응답 시간 (slaDueAt 활용)
  - 일별 escalated count
- [ ] 24h 초과 3건+ Alert:
  - FR-C-014 Cron이 직접 발송
  - 본 태스크는 보강 — admin 페이지(FR-Q-008 placeholder)에 통계 카드 표시
- [ ] LTV:CAC 주간 리뷰 (REQ-NF-022):
  - LTV = 평균 ARPU × M3 리텐션 / Churn
  - CAC = 마케팅 비용 / 신규 가입자 (수동 입력 — `lib/business-metrics.ts`)
  - 주간 LTV:CAC 계산 + < 3.0 시 Slack Critical Alert
  - 비즈니스 리뷰 트리거 (admin 채널)
- [ ] Vercel Cron `/api/cron/business-kpi`:
  - 매주 월요일 09:00 KST
  - LTV, CAC, Churn, M3 리텐션 계산 + Slack 보고
  - kpi_snapshots에 저장
- [ ] admin 페이지 통계 카드:
  - shadcn/ui Card 4개: HITL pending / 24h 임박 / LTV:CAC / 주간 CVR

## 🧪 Acceptance Criteria
**Scenario 1: 24h 초과 3건+ Alert (REQ-NF-023)**
- **Given**: hitl_queue에 24h 초과 4건
- **When**: FR-C-014 Cron 실행
- **Then**: Slack 알림 1건 (3건 임계 초과)

**Scenario 2: LTV:CAC < 3.0 Critical**
- **Given**: 주간 LTV 30,000 / CAC 12,000 = 2.5
- **When**: 주간 KPI Cron
- **Then**: admin 채널 Critical Alert + 리뷰 트리거

**Scenario 3: 통계 카드 렌더 (admin 페이지)**
- **Given**: admin 인증 + /admin 진입
- **When**: 페이지 렌더
- **Then**: HITL pending + 임박 + LTV:CAC + CVR 4개 카드

**Scenario 4: 주간 KPI 저장**
- **Given**: 월요일 09:00 Cron
- **When**: 실행
- **Then**: kpi_snapshots 1 row INSERT (week_number, ltv, cac, churn, m3_retention)

**Scenario 5: D4 — Realtime 미사용 검증**
- **Given**: 코드 검사
- **When**: Supabase Realtime 사용 검색
- **Then**: HITL 모니터링 영역에서 사용 0건

**Scenario 6: 격리**
- **Given**: dev 환경
- **When**: 임계 초과
- **Then**: console.log만, Slack 미발송

## ⚙️ Technical & Non-Functional Constraints
- **REQ-NF-022/023**: LTV:CAC + HITL 24h Alert
- **D4 적용**: Realtime 미사용 → Cron 폴링
- **횡단 제약**:
  - [ ] CRON_SECRET 인증
  - [ ] LTV/CAC 산식의 비즈니스 정확성 — 마케팅 비용 수동 입력 가이드 README

## 🏁 Definition of Done
- [ ] 모든 Acceptance Criteria 충족
- [ ] 주간 KPI Cron 1회 실행 검증
- [ ] LTV:CAC Critical Alert 1회 발송 시뮬
- [ ] admin 통계 카드 동작
- [ ] `tsc --strict` 0 errors
- [ ] D4 적용 사유 README 명시
- [ ] PR 본문에 REQ-NF-022/023 + D4 매핑

## 🚧 Dependencies & Blockers
- **Depends on**: DB-009 (hitl_queue), FR-C-014, FR-Q-008 (admin placeholder), INFRA-002 (Cron), MON-001 (kpi_snapshots)
- **Blocks**: P1 합격 게이트
- **Discope 영향**: D4 — Realtime 모니터링 미사용
