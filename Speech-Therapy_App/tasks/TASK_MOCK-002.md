---
name: Feature Task
about: SRS V06 기반 Speech-Therapy Platform 개발 태스크 명세
title: "[Mock] MOCK-002: getCurriculum + grantReward Mock 픽스처"
labels: 'phase:p1, mode:active, domain:api, epic:f3-b'
assignees: ''
---

## 🎯 Summary
- **Task ID**: MOCK-002
- **Epic / Story**: F3-b 적응형 난이도 / F12 보상 (S2)
- **Phase**: 🟡 P1 (단, grantReward Mock 부분은 P0 FR-C-009에서도 활용)
- **Mode**: 명세대로
- **Discope 적용**: 해당 없음
- **목적**: API-002 (`getCurriculum`) + API-004 (`grantReward`)의 FE 선개발 + TEST-006/TEST-007/TEST-009 픽스처 모킹. 데일리 미션 시드 데이터 4종.

## 🔗 References
- **SRS**: [`../65_SRS_V06_Nextjs_Fullstack_Final.md`](../65_SRS_V06_Nextjs_Fullstack_Final.md)
  - REQ-FUNC-015 (개인화 미션 카드)
  - REQ-FUNC-021~023 (적응형 난이도)
  - REQ-FUNC-024~025 (보상)
- **Task 강화판**: §3-3 MOCK-002
- **API 계약**: [`./TASK_API-002.md`](./TASK_API-002.md), [`./TASK_API-004.md`](./TASK_API-004.md)

## ✅ Task Breakdown
- [ ] `lib/mocks/curriculum.ts`:
  - `mockContinue`: 직전 5세션 4 성공 → 동일 난이도 유지, reason: 'continue'
  - `mockLevelDown`: 3연속 실패 → difficultyLevel - 1, reason: 'level_down'
  - `mockLevelUp`: 5연속 성공 → difficultyLevel + 1, reason: 'level_up'
  - `mockPhonemeSwitch`: 특정 음소 마스터 → suggestedNextPhoneme 제안, reason: 'phoneme_switch'
- [ ] `lib/mocks/reward.ts`:
  - `mockFirstReward`: 첫 보상 INSERT 시뮬 (cumulativeStars: 1)
  - `mockAccumulated`: 기존 +5 → cumulativeStars: 15
  - `mockSkipped`: idempotency 충돌 (wasSkipped: true)
- [ ] 데일리 미션 시드 데이터 (DB-006 시드와 별도 — FE 선개발용 정적 픽스처):
  - 4종 미션 (음소 ㅅ ㅈ ㄱ ㄴ × 난이도 1~3 = 12개) JSON
- [ ] 환경 변수 분기:
  - `USE_MOCK_CURRICULUM=true`
  - `USE_MOCK_REWARD=true`
- [ ] Vitest 픽스처 export
- [ ] FE 개발자가 query param `?mock-curriculum=continue|level-down|level-up|phoneme-switch`로 시나리오 강제

## 🧪 Acceptance Criteria
**Scenario 1: 정상 mock 반환 (curriculum)**
- **Given**: USE_MOCK_CURRICULUM=true + ?mock-curriculum=level-down
- **When**: `getCurriculum(input)` 호출
- **Then**: `mockLevelDown` 객체 반환, reason: 'level_down'

**Scenario 2: 보상 멱등성 시뮬**
- **Given**: USE_MOCK_REWARD=true + 동일 idempotencyKey 2회
- **When**: `grantReward()` 호출
- **Then**: 두 번째 호출 `mockSkipped` (wasSkipped: true)

**Scenario 3: 스키마 일치**
- **Given**: 4종 curriculum mock + 3종 reward mock
- **When**: 각 OutputSchema.parse(mock)
- **Then**: 모두 통과

**Scenario 4: Production 보호**
- **Given**: Vercel Production
- **When**: USE_MOCK_* 무관
- **Then**: Mock 비활성

**Scenario 5: TEST-006/009 픽스처 활용**
- **Given**: Vitest에서 import
- **When**: 단위 테스트 실행
- **Then**: 실제 DB 호출 없이 시나리오 검증

## ⚙️ Technical & Non-Functional Constraints
- **API-002/004 호환**: Zod OutputSchema 100% 일치
- **격리**: Production 강제 비활성화
- **횡단 제약**: 해당 없음 (테스트 더미)
- **콘텐츠 검수**: 미션 시드의 instructionText 금칙어 0건

## 🏁 Definition of Done
- [ ] 모든 Acceptance Criteria 충족
- [ ] Production Mock 비활성 검증
- [ ] `tsc --strict` 0 errors
- [ ] 7종 Mock 모두 OutputSchema 통과
- [ ] FE 개발 시 정상 동작 (query param 분기)
- [ ] TEST-006/007/009 픽스처 활용 검증

## 🚧 Dependencies & Blockers
- **Depends on**: API-002, API-004
- **Blocks**: FR-Q-003 (미션 카드 UI), FR-C-008 (적응형 난이도), TEST-006, TEST-007, TEST-009
- **Discope 영향**: 해당 없음
