---
name: Feature Task
about: SRS V07 기반 Speech-Therapy Platform 개발 태스크 명세
title: "[DB] DB-014: reward_logs 테이블 + idempotencyKey (Sprint 2 멱등성)"
labels: 'phase:p0, mode:active, domain:db, epic:reward, sprint:done'
assignees: ''
---

## 🎯 Summary
- **Task ID**: DB-014
- **Epic / Story**: F12 보상 / Sprint 2 SP2_4 (별 누적 fix + localStorage 권위)
- **Phase**: 🟢 P0 → ✅ Done
- **Mode**: 명세대로
- **Discope 적용**: 해당 없음
- **목적**: V06 `reward_progress` (집계 테이블) 의 보조 — 보상 이벤트 1건 1 row 의 append-only 로그. `@@unique([userId, idempotencyKey])` 로 중복 INSERT 방지 (iOS Safari 7일 cookie 한도 회피 + localStorage 권위 패턴의 데이터 무결성 핵심).

## 🔗 References
- **SRS V07**: [`../docs/65_SRS_V07_Merged_Master_Final.md`](../docs/65_SRS_V07_Merged_Master_Final.md)
  - §6.1.2 신규 7 Entity — RewardLog
  - §6.5.2 Sprint 2 sub-task SP2_4 (별 누적 fix + localStorage 권위)
  - REQ-FUNC-024/025 (발화 성공 → 보상 적립)
- **Reference 메모리**: `reference_vercel_hobby_workarounds.md` §8 iOS ITP cookie + localStorage 권위 패턴

## ✅ Task Breakdown
- [x] `prisma/schema.prisma` 에 `RewardLog` model 추가 (`userId / rewardType / amount / idempotencyKey String / createdAt`)
- [x] `@@unique([userId, idempotencyKey])` constraint
- [x] `@@index([userId, createdAt(sort: Desc)])` 인덱스
- [x] `audit_reward_log_inserts` TRIGGER (DB-013) 적용 대상
- [x] `npx prisma migrate dev --name add_reward_logs`
- [x] prod migration Supabase Studio 적용
- [x] `app/actions/grant-reward.ts` 에서 `prisma.rewardLog.create({data: {idempotencyKey: clientUuid}})` + P2002 catch → graceful skip

## 🧪 Acceptance Criteria
**Scenario 1: 중복 발화 시 멱등성 (REQ-FUNC-025)**
- **Given**: 클라이언트가 같은 idempotencyKey 로 2회 grantReward 호출 (네트워크 재시도)
- **When**: 2회째 INSERT
- **Then**: P2002 unique violation → catch → `{ status: 'duplicate', skipped: true }` 반환 / 별 카운트 정상 (1회만 적립)

**Scenario 2: 정상 적립**
- **Given**: userId u1 + idempotencyKey "evt-abc-001"
- **When**: grantReward 호출
- **Then**: RewardLog INSERT 1건 + RewardProgress.cumulativeStars +1

**Scenario 3: iOS ITP 7일 cookie 만료 후 localStorage 권위**
- **Given**: iOS Safari 사용자, 8일 후 재방문
- **When**: cookie 만료, localStorage 의 anonymous_user_id 권위
- **Then**: 같은 anonymous_user_id 로 reward_log 누적 (별 합산 정상)

## ⚙️ Technical & Non-Functional Constraints
- **REQ-NF-005**: 파티클 보상 ≤ 500ms 렌더링 (FR-C-009)
- **횡단 제약**:
  - [x] R4 개인정보: RewardLog 자체는 PII 아님, audit TRIGGER 로 추적
  - [ ] G2 비용: append-only 로그 — 1년 후 archival 검토 (Phase 2+)

## 🏁 Definition of Done
- [x] Prisma migration 성공 (dev + prod)
- [x] `@@unique` constraint 검증 (수동 P2002 발생 시도)
- [x] `tsc --strict` 0 errors
- [x] Sprint 2 SP2_4 commit 통합
- [x] audit_log TRIGGER 자동 capture 검증

## 🚧 Dependencies & Blockers
- **Depends on**: DB-008 (reward_progress, 보조 집계), DB-013 (audit TRIGGER), FR-C-009
- **Blocks**: FR-C-009 (grantReward 호출 시 사용), TEST-018 (iOS ITP 우회 검증)
- **Discope 영향**: 해당 없음
