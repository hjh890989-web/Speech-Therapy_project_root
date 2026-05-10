---
name: Feature Task
about: SRS V06 기반 Speech-Therapy Platform 개발 태스크 명세
title: "[Server Action] API-004: grantReward() DTO + 멱등성 키 검증"
labels: 'phase:p0, mode:active, domain:api, epic:f12, sprint:1'
assignees: ''
---

## 🎯 Summary
- **Task ID**: API-004
- **Epic / Story**: F12 게이미피케이션 보상 시스템 / S2
- **Phase**: 🟢 P0
- **Mode**: 명세대로
- **Discope 적용**: 해당 없음
- **목적**: 보상 부여 Server Action의 계약(Contract) 정의. 멱등성 키로 중복 보상 방지. FR-C-009 구현·TEST-009 검증의 SSOT.

## 🔗 References
- **SRS**: [`../65_SRS_V06_Nextjs_Fullstack_Final.md`](../65_SRS_V06_Nextjs_Fullstack_Final.md)
  - §3.5 API Overview — `grantReward()` (≤ 500ms)
  - REQ-FUNC-024~025 (파티클 + 누적 저장)
  - REQ-NF-005 (보상 UI ≤ 500ms)
- **Task 강화판**: §3-2 API-004

## ✅ Task Breakdown
- [ ] `lib/schemas/reward.ts`에 Zod 입력 스키마:
  - `userId: z.string().uuid()` (또는 익명 localStorage UUID)
  - `rewardType: z.enum(['star', 'tree', 'drawing'])`
  - `amount: z.number().int().min(1).max(10)` (한 번에 최대 10개)
  - `idempotencyKey: z.string().min(1).max(255)`
- [ ] 출력 스키마:
  - `success: z.boolean()`
  - `cumulativeStars: z.number().int().min(0)`
  - `treeGrowthLevel: z.number().int().min(0)`
  - `aiDrawingCount: z.number().int().min(0)`
  - `wasSkipped: z.boolean()` (멱등성으로 무시된 경우 true)
- [ ] `app/actions/reward.ts`에 `'use server'` 선언 + 함수 시그니처만 정의
- [ ] 에러 enum: `INVALID_INPUT | USER_NOT_FOUND | INTERNAL_ERROR`
- [ ] TypeScript 타입 export (`RewardInput`, `RewardOutput`)

## 🧪 Acceptance Criteria
**Scenario 1: 정상 입력 검증 통과**
- **Given**: 유효한 입력 4필드 (userId, type, amount, key)
- **When**: `InputSchema.parse(input)`
- **Then**: 검증 통과, `RewardInput` 타입 보장

**Scenario 2: 음수 amount 차단**
- **Given**: `amount: -1`
- **When**: 검증
- **Then**: ZodError throw — Server Action에서 INVALID_INPUT 반환

**Scenario 3: 멱등성 키 누락**
- **Given**: `idempotencyKey: ''`
- **When**: 검증
- **Then**: ZodError throw

**Scenario 4: rewardType enum 외 값**
- **Given**: `rewardType: 'coin'` (정의되지 않음)
- **When**: 컴파일
- **Then**: TS 컴파일 에러 (런타임 도달 전 차단)

## ⚙️ Technical & Non-Functional Constraints
- **REQ-NF-005**: ≤ 500ms 응답 (구현 단계 책임 — 본 태스크는 계약만)
- **C-TEC-002**: Server Action으로 구현 (`'use server'`)
- **횡단 제약**:
  - [ ] 멱등성 — `idempotencyKey` 필수. 동일 키로 2회 호출 시 wasSkipped=true 반환
  - [ ] 동시성 — 트랜잭션 또는 raw `INCR` 사용 (구현 단계 책임)
- **보안**: userId 로깅 시 마스킹 (예: `usr_***1234`)

## 🏁 Definition of Done
- [ ] 모든 Acceptance Criteria 충족
- [ ] Zod 스키마 단위 테스트 (입출력 양방향)
- [ ] `tsc --strict` 0 errors
- [ ] ESLint 0 errors
- [ ] 타입 export 검증
- [ ] PR 본문에 REQ-FUNC-024~025 + REQ-NF-005 매핑

## 🚧 Dependencies & Blockers
- **Depends on**: DB-008 (reward_progress 테이블)
- **Blocks**: FR-C-009 (구현), TEST-009 (테스트), FR-Q-004 (보상 도감 UI — P1)
- **Discope 영향**: 해당 없음
