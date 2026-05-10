---
name: Feature Task
about: SRS V06 기반 Speech-Therapy Platform 개발 태스크 명세
title: "[Test] TEST-009: 보상 정합성 — 멱등성 + 동시성 단위 테스트"
labels: 'phase:p0, mode:active, domain:test, epic:f12, sprint:2'
assignees: ''
---

## 🎯 Summary
- **Task ID**: TEST-009
- **Epic / Story**: F12 게이미피케이션 / S2
- **Phase**: 🟢 P0
- **Mode**: 단순화 (Sprint 1엔 핵심 시나리오만 — 오프라인 소급은 P1)
- **Discope 적용**: D5 (오프라인 소급 보상 P1으로 디퍼 — 본 테스트에선 미포함)
- **목적**: FR-C-009(reward UPSERT)의 멱등성·동시성·파티클 ≤ 500ms 자동 검증. Sprint 1 합격 게이트의 보상 정합성 보장.

## 🔗 References
- **SRS**: [`../65_SRS_V06_Nextjs_Fullstack_Final.md`](../65_SRS_V06_Nextjs_Fullstack_Final.md)
  - REQ-FUNC-024~025 (파티클 + 누적 저장)
  - REQ-NF-005 (≤ 500ms)
  - §5 Traceability — TC-S2-010/011
- **Task 강화판**: §3-6 TEST-009

## ✅ Task Breakdown
- [ ] `__tests__/actions/reward.test.ts` 생성 (Vitest 환경 — TEST-001 환경 재사용)
- [ ] FR-C-009의 5개 Scenario 변환:
  - 1: `it('첫 보상 INSERT — row 없을 때 신규 생성')`
  - 2: `it('누적 UPSERT — cumulativeStars 증가')`
  - 3: `it('멱등성 — 동일 키 2회 시 1회만 +1')`
  - 4: `it('파티클 페인트 ≤ 500ms 검증')`
  - 5: `it('동시성 5병렬 — 정확히 +5')`
- [ ] DB 격리 전략: 옵션 A — Prisma SQLite in-memory (`file::memory:?cache=shared`), 옵션 B — Prisma Mock + 트랜잭션 시뮬
- [ ] 동시성 테스트: `await Promise.all([1..5].map(i => grantReward(...)))`
- [ ] 파티클 측정: 클라이언트 컴포넌트 + Vitest happy-dom + Performance.now
- [ ] 멱등성 키 충돌 시뮬: 동일 idempotencyKey 2회 호출
- [ ] 각 테스트 후 reward_progress row cleanup

## 🧪 Acceptance Criteria
**Scenario 1: 멱등성 검증 (REQ-FUNC-025)**
- **Given**: 동일 idempotencyKey "session-X-star-1"로 2회 `grantReward` 호출
- **When**: 두 번째 호출
- **Then**: cumulativeStars +1만 증가, 두 번째 응답 `wasSkipped: true`

**Scenario 2: 동시성 5병렬**
- **Given**: 동일 userId, 다른 idempotencyKey 5개 (`key1`..`key5`)
- **When**: `Promise.all`로 5건 동시 호출
- **Then**: 최종 cumulativeStars 정확히 +5 (race condition 없음)

**Scenario 3: 파티클 ≤ 500ms (REQ-NF-005)**
- **Given**: Server Action 응답 후 Optimistic UI
- **When**: 클라이언트가 별 파티클 첫 페인트
- **Then**: Performance.now() 측정 ≤ 500ms

**Scenario 4: 신규 사용자 INSERT**
- **Given**: reward_progress row 없는 userId Y
- **When**: `grantReward(Y, 'star', 1, key)`
- **Then**: 신규 row 생성, cumulativeStars = 1

**Scenario 5: 누적 UPSERT**
- **Given**: 기존 cumulativeStars = 10
- **When**: `grantReward(X, 'star', 5, newKey)`
- **Then**: cumulativeStars = 15, updatedAt 갱신

## ⚙️ Technical & Non-Functional Constraints
- **REQ-NF-005**: ≤ 500ms 파티클 페인트
- **격리**: 실제 Supabase 호출 금지 (in-memory 또는 mock)
- **횡단 제약**:
  - [ ] **멱등성** — 필수 검증 (보상 시스템 정합성의 핵심)
  - [ ] **동시성** — race condition 0건 보장
- **R8 보호**: in-memory 테스트 → Supabase Free 영향 없음

## 🏁 Definition of Done
- [ ] 5/5 Scenario 통과
- [ ] 커버리지 `app/actions/reward.ts` ≥ 80%
- [ ] `tsc --strict` 0 errors
- [ ] CI(Vercel) 통과
- [ ] 동시성 5병렬 테스트 안정적 통과 (10회 반복 100% 성공)
- [ ] PR 본문에 REQ-FUNC-024~025 + REQ-NF-005 + TC-S2-010/011 매핑

## 🚧 Dependencies & Blockers
- **Depends on**: FR-C-009 (구현), API-004 (스키마), DB-008 (테이블)
- **Blocks**: Sprint 1 합격 게이트
- **Discope 영향**: D5 — 오프라인 소급 보상 시나리오는 P1에서 추가. 본 테스트에선 온라인 케이스만
