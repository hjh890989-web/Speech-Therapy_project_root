---
name: Feature Task
about: SRS V06 기반 Speech-Therapy Platform 개발 태스크 명세
title: "[FR-C] FR-C-014: HITL 24h 자동 에스컬레이션 + 어뷰징 방어 (D4 — Slack 알림)"
labels: 'phase:p1, mode:replace, domain:fr-c, epic:hitl'
assignees: ''
---

## 🎯 Summary
- **Task ID**: FR-C-014
- **Epic / Story**: F6 HITL 어드민 / S6
- **Phase**: 🟡 P1
- **Mode**: 🔵 Replace (D4 적용)
- **Discope 적용**: D4 (Realtime 자동 재배정 → Slack 마스터 재활사 알림)
- **목적**: hitl_queue의 24h 미응답 항목을 Vercel Cron으로 모니터링 → 마스터 재활사에게 Slack DM 호출 + 월 3회 초과 이의제기 자동 반려. SRS는 어드민에서 자동 재배정을 명시했으나 D4 적용으로 Slack 단순화.

## 🔗 References
- **SRS**: [`../65_SRS_V06_Nextjs_Fullstack_Final.md`](../65_SRS_V06_Nextjs_Fullstack_Final.md)
  - REQ-FUNC-033 (24h 초과 자동 에스컬레이션, Slack Alert + 재배정)
  - REQ-FUNC-034 (월 3회 초과 이의제기 자동 반려)
- **Task 강화판**: §3-5 FR-C-014 (Replace)
- **검토 보고서**: §1.2 [추가 D4]

## ✅ Task Breakdown
- [ ] `app/api/cron/hitl-monitor/route.ts` GET 핸들러 (Vercel Cron — 1시간 주기)
- [ ] 1단계 — 24h 임박 + 미할당 추출:
  - `prisma.hitlQueue.findMany({where: {status: 'pending', createdAt: {lt: now - 24h}, escalatedAt: null}})`
- [ ] 2단계 — 마스터 재활사 호출:
  - 각 row에 대해 Slack DM 발송 (master_expert_slack_id 환경 변수)
  - 메시지: ":rotating_light: HITL 24h 임박 — sessionId, slaDueAt"
  - escalatedAt = NOW() 마킹
- [ ] 3단계 — 48h 초과 + 미완료 → status='escalated':
  - admin 채널에 Critical Alert 발송
  - assignedExpertId를 마스터 재활사로 강제 변경
- [ ] 4단계 — 어뷰징 방어 (REQ-FUNC-034):
  - `prisma.hitlQueue.groupBy({by: ['userId'], where: {status: 'dismissed', createdAt: {gte: thisMonth}}, _count: {id: true}})`
  - count > 3인 사용자 → 4번째 이상 큐는 status='dismissed' 자동 + CS 이관 알림
- [ ] vercel.json cron 등록: `{"path": "/api/cron/hitl-monitor", "schedule": "0 * * * *"}` (1시간 주기)
- [ ] 처리 통계 로깅:
  - escalatedCount, dismissedCount, durationMs
- [ ] CRON_SECRET 인증
- [ ] Slack DM 발송 헬퍼 (`lib/slack.ts` — API-005와 공유):
  - 채널 알림과 DM 분리

## 🧪 Acceptance Criteria
**Scenario 1: 24h 임박 알림 (REQ-FUNC-033)**
- **Given**: pending row 등록 후 25h 경과
- **When**: Cron 트리거
- **Then**: 마스터 재활사 Slack DM 1건 + escalatedAt 마킹

**Scenario 2: 48h 초과 → 강제 이관**
- **Given**: pending row 49h 경과
- **When**: Cron
- **Then**: status='escalated' + admin 채널 Critical Alert + assignedExpertId 변경

**Scenario 3: 월 3회 초과 어뷰징 (REQ-FUNC-034)**
- **Given**: 동일 userId 이번 달 status='dismissed' 3건
- **When**: 4번째 큐 생성
- **Then**: 자동 status='dismissed' + CS 이관 알림

**Scenario 4: 멱등성 — 중복 escalation 방지**
- **Given**: escalatedAt 이미 마킹된 row
- **When**: 다음 Cron 실행
- **Then**: 중복 Slack DM 발송 없음

**Scenario 5: CRON_SECRET 인증**
- **Given**: 외부 호출
- **When**: 헤더 누락
- **Then**: 401 Unauthorized

**Scenario 6: 처리 시간 ≤ 30s**
- **Given**: 큐 100건
- **When**: 실행
- **Then**: durationMs < 30,000

## ⚙️ Technical & Non-Functional Constraints
- **REQ-FUNC-033**: 24h 초과 → 자동 에스컬레이션
- **REQ-NF-023**: 24h 초과 3건+ Alert (MON-003 책임)
- **D4 적용**: Realtime 자동 재배정 → Slack DM 단순화
- **횡단 제약**:
  - [ ] R2 — 낮은 Confidence + 미응답이 사용자 도달 안 되도록 강제 이관
  - [ ] CRON_SECRET 인증
  - [ ] 멱등성 — escalatedAt 마킹으로 중복 방지

## 🏁 Definition of Done
- [ ] 모든 Acceptance Criteria 충족
- [ ] vercel.json cron 등록 + 1회 실제 실행
- [ ] Slack DM 1회 발송 검증
- [ ] `tsc --strict` 0 errors
- [ ] 어뷰징 시뮬 테스트 (3건 dismissed + 4번째 차단)
- [ ] D4 적용 사유 README 명시
- [ ] PR 본문에 REQ-FUNC-033/034 + D4 매핑

## 🚧 Dependencies & Blockers
- **Depends on**: DB-009 (hitl_queue), API-005/006 (Slack 헬퍼 공유), INFRA-001/002 (Cron 인프라)
- **Blocks**: TEST-014, MON-003
- **Discope 영향**: D4 — 자동 재배정 어드민 미사용. Slack DM + Cron 모니터링으로 운영
