---
name: Feature Task
about: SRS V06 기반 Speech-Therapy Platform 개발 태스크 명세
title: "[FR-C] FR-C-009: 발화 성공 시 reward_progress UPSERT (별 +1)"
labels: 'phase:p0, mode:active, domain:fr-c, epic:f12, sprint:1'
assignees: ''
---

## 🎯 Summary
- **Task ID**: FR-C-009
- **Epic / Story**: F12 게이미피케이션 보상 시스템 / S2
- **Phase**: 🟢 P0
- **Mode**: 명세대로
- **Discope 적용**: 해당 없음
- **목적**: 진단/미션 완료 시 사용자에게 즉각적 보상(별 +1)을 부여하고 reward_progress를 UPSERT한다. 리텐션 트리거의 첫 단계.

## 🔗 References
- **SRS**: [`../65_SRS_V06_Nextjs_Fullstack_Final.md`](../65_SRS_V06_Nextjs_Fullstack_Final.md)
  - REQ-FUNC-024 (파티클 ≤ 500ms)
  - REQ-FUNC-025 (Prisma → Supabase 누적 저장)
  - REQ-NF-005 (보상 UI ≤ 500ms)
- **Task 강화판**: §3-5 FR-C-009

## ✅ Task Breakdown
- [ ] `app/actions/reward.ts`에 `grantReward(userId, type, amount, idempotencyKey)` Server Action 작성 (`'use server'`)
- [ ] API-004의 Zod 스키마로 입력 검증
- [ ] 멱등성: `idempotencyKey`(예: `${sessionId}-star-1`)를 별도 `RewardLog` 테이블에 INSERT, 중복 시 silently skip
  - 또는 단순 in-memory cache(Sprint 1) → 정확성은 Sprint 2에서 강화
- [ ] `prisma.rewardProgress.upsert({where: {userId}, create: {...}, update: {cumulativeStars: {increment: amount}}})`
- [ ] 클라이언트 측 파티클 애니메이션: Framer Motion 또는 CSS keyframes (별 5개 폭발)
- [ ] 결과 페이지(FR-Q-002)에 보상 트리거 통합: 페이지 도달 시 자동 호출
- [ ] 무로그인 진단 사용자 처리: 익명 userId(localStorage UUID) 사용. 가입 시 anonymous → real userId 마이그레이션 (Sprint 2)

## 🧪 Acceptance Criteria
**Scenario 1: 진단 완료 시 별 +1 (REQ-FUNC-025)**
- **Given**: 결과 페이지 첫 진입, userId X
- **When**: `grantReward(X, 'star', 1, sessionId)` 호출
- **Then**: reward_progress.cumulativeStars +=1, updatedAt 갱신

**Scenario 2: 새 사용자 (row 없음)**
- **Given**: 신규 userId Y에 reward_progress 없음
- **When**: `grantReward(Y, 'star', 1, key)`
- **Then**: 신규 row 생성, cumulativeStars=1

**Scenario 3: 멱등성 보장**
- **Given**: 동일 idempotencyKey로 2회 호출
- **When**: 두 번째 호출
- **Then**: cumulativeStars +1만 증가 (중복 방지)

**Scenario 4: 파티클 ≤ 500ms (REQ-FUNC-024 / REQ-NF-005)**
- **Given**: Server Action 응답 후
- **When**: 클라이언트가 별 파티클 렌더링
- **Then**: 첫 파티클 페인트 ≤ 500ms (Performance.now 측정)

**Scenario 5: 동시성 (TEST-009 책임)**
- **Given**: 동일 userId에 5건 동시 호출 (각각 다른 키)
- **When**: 병렬 처리
- **Then**: 최종 cumulativeStars 정확히 +5

## ⚙️ Technical & Non-Functional Constraints
- **REQ-NF-005**: ≤ 500ms — 파티클은 Server Action 응답을 기다리지 않고 optimistic UI로 즉시 표시
- **횡단 제약**:
  - [ ] **멱등성**: idempotencyKey 필수 (중복 보상 방지)
  - [ ] **D5 디퍼됨**: 오프라인 소급 보상은 P1. Sprint 1엔 온라인 전제 + 단절 시 에러 토스트
- **R8 (Supabase Free)**: UPSERT row 작음 — 영향 없음

## 🏁 Definition of Done
- [ ] 모든 Acceptance Criteria 충족
- [ ] TEST-009 (보상 정합성) 통과
- [ ] `tsc --strict` 0 errors
- [ ] 동시성 5병렬 테스트 통과
- [ ] 멱등성 단위 테스트
- [ ] 파티클 페인트 시간 측정 도구 추가

## 🚧 Dependencies & Blockers
- **Depends on**: DB-008 (reward_progress), DB-002 (userId FK), API-004 (grantReward DTO)
- **Blocks**: TEST-009, FR-Q-004 (보상 도감 — P1)
- **Discope 영향**: D5 — 오프라인 소급 보상은 미적용. P1에서 Service Worker + Background Sync 도입 시 본 로직과 통합
