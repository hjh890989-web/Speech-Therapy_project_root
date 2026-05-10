---
name: Feature Task
about: SRS V06 기반 Speech-Therapy Platform 개발 태스크 명세
title: "[DB] DB-005: evaluation_results 테이블 (3축 점수 + 백분위 + Confidence)"
labels: 'phase:p0, mode:active, domain:db, epic:f1-a, sprint:1'
assignees: ''
---

## 🎯 Summary
- **Task ID**: DB-005
- **Epic / Story**: F1-a 3축 AI 음성 분석 / S1
- **Phase**: 🟢 P0
- **Mode**: 명세대로
- **Discope 적용**: 해당 없음
- **목적**: AI 분석 결과(조음·언어·음향 3축 점수, 또래 백분위, Confidence, AI 쿠션 텍스트, HITL 검토 여부)의 정형 저장소. 또래 비교 리포트와 주간 추이의 원천 데이터.

## 🔗 References
- **SRS**: [`../65_SRS_V06_Nextjs_Fullstack_Final.md`](../65_SRS_V06_Nextjs_Fullstack_Final.md)
  - §6.1 ERD `evaluation_results`
  - REQ-FUNC-001~003 (3축 스코어링, 백분위, Confidence)
  - REQ-FUNC-012~013 (또래 비교 리포트, 금칙어 0건)
- **Task 강화판**: §3-1 DB-005

## ✅ Task Breakdown
- [ ] `EvaluationResult` 모델 정의
- [ ] 필드: `id String @id @default(uuid())`, `sessionId String @unique`, `userId String`, `articulationScore Float`, `linguisticScore Float`, `acousticScore Float`, `peerPercentile Float`, `confidence Float`, `hitlReviewed Boolean @default(false)`, `aiCushionText String?`, `targetPhoneme String`, `childAgeMonths Int`, `createdAt DateTime @default(now())`
- [ ] FK: `user User @relation(fields: [userId], references: [id])`
- [ ] FK: `sessionLog SessionLog? @relation(fields: [sessionId], references: [id])` (DB-004 연결)
- [ ] 인덱스: `@@index([userId, createdAt])` (주간 리포트 쿼리 성능용)
- [ ] 마이그레이션 `npx prisma migrate dev --name add_evaluation_results`

## 🧪 Acceptance Criteria
**Scenario 1: 3축 점수 INSERT 성공**
- **Given**: 유효한 userId, sessionId, 점수 3개, peer_percentile, confidence
- **When**: `prisma.evaluationResult.create({data})`
- **Then**: row 생성, id UUID 자동, hitlReviewed=false 기본값

**Scenario 2: 점수 범위 검증 (TS 레벨)**
- **Given**: Float 타입이지만 비즈니스 규칙상 0~100 범위 기대
- **When**: 어플리케이션 레벨 Zod로 `z.number().min(0).max(100)` 검증
- **Then**: 범위 외 값은 Server Action 진입 전 차단 (DB 레벨은 Float만 보장)

**Scenario 3: userId+createdAt 인덱스 활용**
- **Given**: 사용자 1명에 100개 결과 누적
- **When**: `prisma.evaluationResult.findMany({where: {userId}, orderBy: {createdAt: 'desc'}, take: 7})`
- **Then**: 인덱스 사용으로 응답 ≤ 50ms (P1 주간 리포트 쿼리 기반)

## ⚙️ Technical & Non-Functional Constraints
- **REQ-NF-001**: `analyzeDiagnosis()` p95 ≤ 800ms — DB INSERT 자체는 ≤ 100ms 목표
- **횡단 제약 CON-04**: `aiCushionText` 컬럼은 금칙어("진단", "장애") 포함 금지. INSERT 전 Middleware 또는 Server Action에서 정규식 검증
- **개인정보 최소화**: 음성 원본 URI는 본 테이블에 저장하지 않음 (session_logs로 분리, 7일 폐기)

## 🏁 Definition of Done
- [ ] 모든 Acceptance Criteria 충족
- [ ] 마이그레이션 성공
- [ ] `tsc --strict` 0 errors
- [ ] FK 무결성 검증 (cascade 정책 정의)
- [ ] 인덱스 EXPLAIN으로 사용 확인
- [ ] ERD §6.1 모든 컬럼 매핑

## 🚧 Dependencies & Blockers
- **Depends on**: DB-001, DB-002 (User FK)
- **Blocks**: API-001 (analyzeDiagnosis 결과 저장), FR-Q-002 (또래 비교 RSC 조회), FR-C-001 (3축 스코어링 INSERT), DB-007 (weekly_reports 집계 원천), DB-009 (HITL 큐 sessionId 참조)
- **Discope 영향**: 해당 없음
