---
name: Feature Task
about: SRS V06 기반 Speech-Therapy Platform 개발 태스크 명세
title: "[DB] DB-008: reward_progress 테이블 (별·나무·AI그림 누적)"
labels: 'phase:p0, mode:active, domain:db, epic:f12, sprint:1'
assignees: ''
---

## 🎯 Summary
- **Task ID**: DB-008
- **Epic / Story**: F12 게이미피케이션 보상 시스템 / S2
- **Phase**: 🟢 P0
- **Mode**: 명세대로
- **Discope 적용**: 해당 없음
- **목적**: 사용자별 누적 보상(별, 나무 성장 단계, AI 그림 개수)을 단일 row UPSERT 구조로 관리. F12 보상 도감 UI의 데이터 원천.

## 🔗 References
- **SRS**: [`../65_SRS_V06_Nextjs_Fullstack_Final.md`](../65_SRS_V06_Nextjs_Fullstack_Final.md)
  - §6.1 ERD `reward_progress`
  - REQ-FUNC-024~026 (파티클·누적 저장·도감 UI)
- **Task 강화판**: §3-1 DB-008

## ✅ Task Breakdown
- [ ] `RewardProgress` 모델 정의
- [ ] 필드: `id String @id @default(uuid())`, `userId String @unique`, `cumulativeStars Int @default(0)`, `treeGrowthLevel Int @default(0)`, `aiDrawingCount Int @default(0)`, `updatedAt DateTime @updatedAt`
- [ ] FK: `user User @relation(fields: [userId], references: [id], onDelete: Cascade)`
- [ ] `@unique` on userId — 사용자당 1 row 보장 (UPSERT 패턴)
- [ ] 마이그레이션 `npx prisma migrate dev --name add_reward_progress`
- [ ] 헬퍼 함수 `lib/reward.ts`에 `incrementStars(userId, n)` UPSERT 로직 작성

## 🧪 Acceptance Criteria
**Scenario 1: 첫 보상 INSERT (사용자 row 없음)**
- **Given**: userId X에 대한 reward_progress row 없음
- **When**: `incrementStars(X, 1)` 호출
- **Then**: 신규 row 생성, cumulativeStars=1

**Scenario 2: 누적 UPSERT**
- **Given**: 기존 cumulativeStars=10
- **When**: `incrementStars(X, 5)`
- **Then**: cumulativeStars=15, updatedAt 갱신

**Scenario 3: 동시성 안전성**
- **Given**: 동일 userId에 5건 동시 incrementStars 호출
- **When**: 병렬 실행
- **Then**: 최종 cumulativeStars 합산 정확 (Prisma 트랜잭션 또는 raw SQL `INCR` 사용)

## ⚙️ Technical & Non-Functional Constraints
- **REQ-NF-005**: 보상 UI 렌더링 ≤ 500ms — DB UPSERT 자체 ≤ 100ms 목표
- **횡단 제약 — 멱등성**: 동일 발화 세션의 보상은 1회만 — `grantReward()` API에서 멱등성 키 검증 (API-004 책임)
- **PWA 오프라인 대비** (D5 디퍼됨): Sprint 1엔 온라인 전제. 향후 IndexedDB 캐시 + Background Sync 시 충돌 해소 로직 추가 필요

## 🏁 Definition of Done
- [ ] 모든 Acceptance Criteria 충족
- [ ] 마이그레이션 성공
- [ ] `tsc --strict` 0 errors
- [ ] `incrementStars` 동시성 테스트 통과 (TEST-009 책임)
- [ ] FK Cascade 동작 검증 (User 삭제 시 reward 삭제)

## 🚧 Dependencies & Blockers
- **Depends on**: DB-001, DB-002
- **Blocks**: API-004 (grantReward), FR-C-009 (보상 INSERT), FR-Q-004 (보상 도감 UI — P1), TEST-009 (보상 정합성 테스트)
- **Discope 영향**: 해당 없음 (P0 코어)
