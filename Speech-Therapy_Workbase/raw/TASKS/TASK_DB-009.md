---
name: Feature Task
about: SRS V06 기반 Speech-Therapy Platform 개발 태스크 명세
title: "[DB] DB-009: hitl_queue 테이블 (D4 적용 — Realtime 미사용, 단순 status 기반)"
labels: 'phase:p1, mode:replace, domain:db, epic:hitl'
assignees: ''
---

## 🎯 Summary
- **Task ID**: DB-009
- **Epic / Story**: HITL 안전 프로토콜 / S6
- **Phase**: 🟡 P1
- **Mode**: 단순화 (D4 적용 — Supabase Realtime 미사용, 단순 status 컬럼만)
- **Discope 적용**: D4 (HITL Realtime 큐 → Slack 웹훅 + Supabase Studio 운영)
- **목적**: Confidence < 70 시 자동 등록되는 전문가 검토 대기열 테이블. Realtime 구독 대신 Slack 웹훅으로 알림하고, 전문가는 Supabase Studio에서 직접 row를 조회·UPDATE하는 단순 운영 모델.

## 🔗 References
- **SRS**: [`../65_SRS_V06_Nextjs_Fullstack_Final.md`](../65_SRS_V06_Nextjs_Fullstack_Final.md)
  - §3.5 API Overview — `app/api/hitl/queue` (Realtime 구독)
  - REQ-FUNC-003 (Confidence < 70 자동 이관)
  - REQ-FUNC-032 (Realtime 구독으로 대기열 실시간 확인)
  - REQ-FUNC-HITL-001~003 (자동 에스컬레이션, 금칙어 필터, 48h SLA)
  - §3.6.2 시퀀스 (HITL 에스컬레이션 플로우)
- **Task 강화판**: §3-1 DB-009 (단순화 모드)
- **검토 보고서**: [`./02_SRS_MVP-개발목표-적절성-종합-검토(난이도_가능성_효율성)-보고서.md`](./02_SRS_MVP-개발목표-적절성-종합-검토(난이도_가능성_효율성)-보고서.md) §1.2 [추가 D4]

## ✅ Task Breakdown
- [ ] `HITLQueue` 모델 정의
- [ ] 필드:
  - `id String @id @default(uuid())`
  - `sessionId String @unique` (evaluation_results FK)
  - `userId String`
  - `confidenceScore Float`
  - `status HITLStatus @default(pending)` — enum: `pending | in_review | completed | escalated | dismissed`
  - `assignedExpertId String?` (Supabase Studio에서 수동 할당)
  - `expertComment String?`
  - `groundTruthScore Json?` — 보정된 3축 점수
  - `slaDueAt DateTime` — 등록 시점 + 48h
  - `escalatedAt DateTime?` — 24h 초과 시 자동 마킹
  - `completedAt DateTime?`
  - `createdAt DateTime @default(now())`
- [ ] FK: `evaluationResult EvaluationResult @relation(fields: [sessionId], references: [sessionId])`
- [ ] FK: `user User @relation(fields: [userId], references: [id])`
- [ ] FK 옵션: `assignedExpert User? @relation("AssignedExpert", fields: [assignedExpertId], references: [id])`
- [ ] 인덱스: `@@index([status, slaDueAt])` (대기 중·SLA 임박 조회)
- [ ] 마이그레이션 `npx prisma migrate dev --name add_hitl_queue`
- [ ] **Realtime 활성화 안 함** — D4 적용으로 Supabase Realtime은 P1 후반에 검토
- [ ] 헬퍼 `lib/hitl.ts`에 `enqueueForReview(sessionId, confidence)` UPSERT 로직

## 🧪 Acceptance Criteria
**Scenario 1: Confidence < 70 자동 등록 (REQ-FUNC-003 / HITL-001)**
- **Given**: evaluation_results의 confidence: 65
- **When**: `enqueueForReview(sessionId, 65)` 호출 (FR-C-002 책임)
- **Then**: hitl_queue row 생성, status: pending, slaDueAt = now + 48h

**Scenario 2: 대기 중 + SLA 임박 조회 (REQ-FUNC-033)**
- **Given**: pending 상태 row 10건 (slaDueAt 임의 분포)
- **When**: `findMany({where: {status: 'pending', slaDueAt: {lte: in24h}}, orderBy: {slaDueAt: 'asc'}})`
- **Then**: 24h 내 만료 예정 row만 반환, 인덱스 사용

**Scenario 3: 전문가 코멘트 UPDATE (REQ-FUNC-HITL-003)**
- **Given**: pending row + 전문가 검토 완료
- **When**: Supabase Studio에서 `UPDATE hitl_queue SET status='completed', expert_comment='...', ground_truth_score='{}', completed_at=NOW() WHERE id='...'`
- **Then**: row 갱신 성공, hitlReviewed 플래그 동기화 (트리거 또는 수동)

**Scenario 4: 24h 초과 자동 에스컬레이션 (REQ-FUNC-033 + FR-C-014)**
- **Given**: pending status + 등록 후 24h 경과
- **When**: Vercel Cron (P1 INFRA-002)이 주기 실행
- **Then**: status='escalated', escalatedAt 갱신, Slack 마스터 재활사 알림 발송

**Scenario 5: 멱등성 — 동일 sessionId 중복 등록 차단**
- **Given**: 이미 등록된 sessionId
- **When**: `enqueueForReview(sessionId, ...)` 재호출
- **Then**: `@unique` 제약으로 차단 (또는 upsert로 confidence 갱신)

## ⚙️ Technical & Non-Functional Constraints
- **REQ-NF-012**: HITL 피드백 ≤ 48h
- **REQ-NF-023**: 24h 초과 3건+ 시 Alert (MON-003 책임)
- **D4 적용**: Realtime 미사용 → 알림은 Slack 웹훅(FR-C-002 책임), 운영은 Supabase Studio 수동
- **횡단 제약**:
  - [ ] R2 리스크 완화 — STT 실패·낮은 Confidence를 안전하게 격리
  - [ ] R4 보호 — expert_comment·ground_truth_score는 자녀 식별 불가능한 형식 강제

## 🏁 Definition of Done
- [ ] 모든 Acceptance Criteria 충족
- [ ] 마이그레이션 성공 + Prisma Client 타입 갱신
- [ ] `tsc --strict` 0 errors
- [ ] FK 무결성 검증
- [ ] 인덱스 EXPLAIN 확인
- [ ] Supabase Studio에서 UPDATE 1회 시뮬레이션
- [ ] D4 디스코프 적용 사유 README 명시

## 🚧 Dependencies & Blockers
- **Depends on**: DB-001, DB-002 (User FK), DB-005 (sessionId FK)
- **Blocks**: API-005 (Slack 웹훅 트리거 — D4 대체), API-006 (Supabase Studio UPDATE 가이드), FR-C-002 (자동 이관 트리거), FR-C-013 (전문가 코멘트), FR-C-014 (어뷰징 방어), MON-003 (24h Alert)
- **Discope 영향**: D4 — Realtime 구독 미사용. Supabase Studio + Slack 웹훅으로 운영. P1 후반 어드민 페이지 도입 시 Realtime 활성화 검토
