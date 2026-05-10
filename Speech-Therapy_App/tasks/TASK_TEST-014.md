---
name: Feature Task
about: SRS V06 기반 Speech-Therapy Platform 개발 태스크 명세
title: "[Test] TEST-014: HITL 48h SLA + 루프백 재학습 + 어뷰징 방어 통합 (D4 단순화)"
labels: 'phase:p1, mode:replace, domain:test, epic:hitl'
assignees: ''
---

## 🎯 Summary
- **Task ID**: TEST-014
- **Epic / Story**: HITL 안전 프로토콜 / S6
- **Phase**: 🟡 P1
- **Mode**: 🔵 Replace 검증 (D4 적용)
- **Discope 적용**: D4 (Realtime 어드민 미사용 → Slack 알림 + Studio + Cron 검증)
- **목적**: FR-C-013/014 + API-005/006 + DB-009의 HITL 전체 흐름 통합 테스트. 48h SLA, 24h 자동 에스컬레이션, 어뷰징 방어, 루프백 재학습(P2 트리거 준비) 자동화.

## 🔗 References
- **SRS**: [`../65_SRS_V06_Nextjs_Fullstack_Final.md`](../65_SRS_V06_Nextjs_Fullstack_Final.md)
  - REQ-FUNC-HITL-001~004 (자동 에스컬레이션, 금칙어 필터, SLA, 루프백)
  - REQ-FUNC-033/034 (24h Alert + 어뷰징 자동 반려)
  - §5 Traceability — TC-HITL-001~007
- **Task 강화판**: §3-6 TEST-014 (Replace)
- **검토 보고서**: §1.2 [추가 D4]

## ✅ Task Breakdown
- [ ] `__tests__/integration/hitl-lifecycle.test.ts`
- [ ] Mock 설정:
  - SQLite in-memory + PostgreSQL 트리거 시뮬 (또는 별도 트리거 테스트 분리)
  - Slack 웹훅 fetch spy
  - Resend 이메일 spy
- [ ] 시나리오:
  - 1: Confidence < 70 → DB INSERT + Slack 메시지 1건 + slaDueAt = +48h
  - 2: 24h 임박 → FR-C-014 Cron 실행 → 마스터 재활사 Slack DM 1건 + escalatedAt 마킹
  - 3: 48h 초과 → status='escalated' + admin Critical Alert
  - 4: 전문가 Studio UPDATE 시뮬 → 트리거가 evaluation_results.hitlReviewed=true 자동 동기화
  - 5: 사용자 알림 — Resend 이메일 spy 1회 호출
  - 6: 어뷰징 방어 — 동일 userId 월 4번째 dismissed → 자동 dismissed + CS 알림
  - 7: groundTruthScore JSON 저장 + model_retraining_data 누적
  - 8: 멱등성 — escalatedAt 마킹된 row 중복 알림 안 됨
  - 9: 동일 expertId 1일 51건 검토 → admin Slack 알림 1회
- [ ] PostgreSQL 트리거 동작 검증 (별도 SQL 테스트 또는 Prisma 트랜잭션)
- [ ] Cron 처리 시간 ≤ 30s 검증

## 🧪 Acceptance Criteria
**Scenario 1: 9개 시나리오 통과**
- **Given**: FR-C-002/013/014 + API-005/006 + DB-009 구현
- **When**: 테스트 실행
- **Then**: 9/9 PASS

**Scenario 2: 48h SLA (REQ-FUNC-HITL-003)**
- **Given**: 등록 후 48h 경과 + status='pending'
- **When**: Cron
- **Then**: status='escalated' + assignedExpertId 변경

**Scenario 3: PostgreSQL 트리거 (D4 핵심)**
- **Given**: hitl_queue UPDATE status='completed'
- **When**: 트리거 실행
- **Then**: evaluation_results.hitlReviewed=true 자동

**Scenario 4: 어뷰징 방어 (REQ-FUNC-034)**
- **Given**: 월 3건 dismissed
- **When**: 4번째 큐
- **Then**: 자동 dismissed + CS 알림

**Scenario 5: 루프백 데이터 누적 (REQ-FUNC-HITL-004)**
- **Given**: 5건 ground_truth_score 입력
- **When**: model_retraining_data 조회
- **Then**: 5건 누적 (재학습 트리거 P2 준비)

**Scenario 6: 멱등성 검증**
- **Given**: 이미 escalated row
- **When**: 다음 Cron
- **Then**: 중복 Slack DM 0건

**Scenario 7: 격리 — 실제 Slack/이메일 0건**
- **Given**: 100회 반복 테스트
- **When**: 실행
- **Then**: 실 Slack 채널/이메일 발송 0건 (모두 mock)

## ⚙️ Technical & Non-Functional Constraints
- **REQ-FUNC-HITL-001~004**: HITL 전체 프로토콜
- **REQ-FUNC-033/034**: 24h Alert + 어뷰징
- **D4 적용**: Realtime 검증 대신 Slack + Studio + Cron 검증
- **횡단 제약**:
  - [ ] R4 — Slack 페이로드에 자녀 식별 정보 0건
  - [ ] CON-04 — expert_comment 금칙어 0건 (FR-C-005 통과)
  - [ ] R2 — 낮은 Confidence가 사용자 도달 안 됨

## 🏁 Definition of Done
- [ ] 모든 Acceptance Criteria 충족
- [ ] 9/9 시나리오 통과
- [ ] PostgreSQL 트리거 별도 검증
- [ ] 1일 51건 어뷰징 시뮬 통과
- [ ] `tsc --strict` 0 errors
- [ ] PR 본문에 REQ-FUNC-HITL-001~004 + 033/034 + D4 매핑

## 🚧 Dependencies & Blockers
- **Depends on**: FR-C-002/013/014, API-005/006, DB-009, MOCK-003
- **Blocks**: P1 합격 게이트 (HITL 회귀 보장)
- **Discope 영향**: D4 — Realtime 검증을 Slack/Studio/Cron 검증으로 대체
