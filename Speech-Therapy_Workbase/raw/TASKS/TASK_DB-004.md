---
name: Feature Task
about: SRS V06 기반 Speech-Therapy Platform 개발 태스크 명세
title: "[DB] DB-004: session_logs 테이블 + pgvector 컬럼 (Sprint 1엔 nullable·미사용)"
labels: 'phase:p0, mode:active, domain:db, epic:f1-a, sprint:2'
assignees: ''
---

## 🎯 Summary
- **Task ID**: DB-004
- **Epic / Story**: F1-a 3축 AI 음성 분석 / S1
- **Phase**: 🟢 P0
- **Mode**: 단순화 (D6 부분 적용 — pgvector 컬럼은 nullable로 두되 Sprint 1엔 미사용)
- **Discope 적용**: D6 (pgvector 영구 보관 P2로 디퍼)
- **목적**: 발화 세션 메타데이터(시작 시각, 지속 시간, 미션 ID) 저장. evaluation_results의 sessionId FK 부모 엔터티. 향후 P2에서 음성 벡터 임베딩 보관소로 확장 가능하도록 컬럼만 미리 준비.

## 🔗 References
- **SRS**: [`../65_SRS_V06_Nextjs_Fullstack_Final.md`](../65_SRS_V06_Nextjs_Fullstack_Final.md)
  - §6.1 ERD `session_logs` (id UUID, user_id, mission_id, start_time, duration_sec, audio_vector_uri)
  - REQ-FUNC-005 (음성 벡터 영구 보관 — D6에 의해 P2로 디퍼)
  - C-TEC-003 (pgvector 확장)
- **Task 강화판**: [`./03_Tasks_Breakdown_SRS_reinforce.md`](./03_Tasks_Breakdown_SRS_reinforce.md) §3-1 DB-004 (단순화 모드)
- **검토 보고서**: [`./02_SRS_MVP-개발목표-적절성-종합-검토(난이도_가능성_효율성)-보고서.md`](./02_SRS_MVP-개발목표-적절성-종합-검토(난이도_가능성_효율성)-보고서.md) §1.2 [추가 D6]

## ✅ Task Breakdown
- [ ] `SessionLog` 모델 정의
- [ ] 필드: `id String @id @default(uuid())`, `userId String`, `missionId String?` (P1 미션 카드 연결), `startTime DateTime @default(now())`, `durationSec Int`, `audioVectorUri String?` (Sprint 1엔 nullable, P2에서 활성화), `createdAt DateTime @default(now())`
- [ ] FK: `user User @relation(fields: [userId], references: [id])`
- [ ] FK 옵션: `mission MissionCard? @relation(fields: [missionId], references: [id])`
- [ ] 인덱스: `@@index([userId, startTime])` (사용자별 시간순 조회)
- [ ] 마이그레이션 `npx prisma migrate dev --name add_session_logs`
- [ ] **pgvector 확장 활성화는 본 태스크에서 제외** — P2 활성화 시점에 별도 마이그레이션
- [ ] 코드에 TODO 주석: "P2 pgvector 활성화 시 audioVectorUri를 vector(768) 타입으로 마이그레이션"

## 🧪 Acceptance Criteria
**Scenario 1: 세션 로그 INSERT (REQ-FUNC-005 부분)**
- **Given**: userId X, missionId null (진단 세션)
- **When**: `prisma.sessionLog.create({data: {userId, durationSec: 180}})`
- **Then**: row 생성, audioVectorUri는 null (Sprint 1 정책)

**Scenario 2: 인덱스 활용**
- **Given**: 사용자 1명에 50개 세션 누적
- **When**: `findMany({where: {userId}, orderBy: {startTime: 'desc'}, take: 7})`
- **Then**: 응답 ≤ 50ms, EXPLAIN으로 인덱스 사용 확인

**Scenario 3: pgvector 컬럼 nullable 보장**
- **Given**: audioVectorUri 미지정
- **When**: INSERT
- **Then**: 정상 저장 (Sprint 1엔 항상 null)

**Scenario 4: FK Cascade (User 삭제 시)**
- **Given**: User X에 세션 5개
- **When**: User X 삭제
- **Then**: 연관 session_logs 5개도 삭제 (또는 정책에 따라 SET NULL)

## ⚙️ Technical & Non-Functional Constraints
- **CON-03**: 음성 ≤7일 폐기 — 본 태스크는 메타데이터만 저장, 음성 원본 URI는 미저장 (D6 적용으로 Sprint 1엔 항상 null)
- **D6 적용**: pgvector 확장 활성화는 P2에서 별도 마이그레이션. 본 태스크는 컬럼 자리만 확보
- **횡단 제약 — 개인정보**: durationSec 외 발화 내용 미저장 (메타만)
- **R8 Supabase Free**: row 단위 작음 — 영향 없음

## 🏁 Definition of Done
- [ ] 모든 Acceptance Criteria 충족
- [ ] 마이그레이션 성공 + Prisma Client 타입 갱신
- [ ] `tsc --strict` 0 errors
- [ ] FK 무결성 검증 (Cascade 정책 명시)
- [ ] 인덱스 EXPLAIN 확인
- [ ] P2 pgvector 활성화를 위한 TODO 주석 코드에 추가
- [ ] ERD §6.1 모든 컬럼 매핑

## 🚧 Dependencies & Blockers
- **Depends on**: DB-001, DB-002 (User FK), DB-006 (Mission FK 옵션)
- **Blocks**: DB-005 (evaluation_results.sessionId FK), FR-C-001 (분석 시 세션 INSERT), FR-C-015 (Zero-touch — P2)
- **Discope 영향**: D6 — pgvector 영구 보관 미적용. Sprint 1엔 메타만 저장. P2에서 보정 데이터 500건 누적 시 임베딩 활성화 + 재학습 트리거 (REQ-FUNC-HITL-004)
