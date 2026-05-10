---
name: Feature Task
about: SRS V06 기반 Speech-Therapy Platform 개발 태스크 명세
title: "[Server Action] API-002: getCurriculum() DTO + 적응형 난이도 추천 계약"
labels: 'phase:p1, mode:active, domain:api, epic:f3-b'
assignees: ''
---

## 🎯 Summary
- **Task ID**: API-002
- **Epic / Story**: F3-b 적응형 난이도 조절 엔진 / S2
- **Phase**: 🟡 P1
- **Mode**: 명세대로
- **Discope 적용**: 해당 없음
- **목적**: 사용자 세션 이력(정오답 패턴)을 기반으로 다음 미션 카드 + 난이도 레벨을 반환하는 Server Action 계약. FR-C-008 적응형 난이도 구현·MOCK-002 가짜 응답의 SSOT.

## 🔗 References
- **SRS**: [`../65_SRS_V06_Nextjs_Fullstack_Final.md`](../65_SRS_V06_Nextjs_Fullstack_Final.md)
  - §3.5 API Overview — `getCurriculum()`
  - REQ-FUNC-015 (개인화 데일리 미션 카드)
  - REQ-FUNC-021 (3회 연속 실패 → 난이도 하향)
  - REQ-FUNC-022 (세션 이력 기반 추천)
  - REQ-FUNC-023 (난이도 하향 후 이탈률 < 5%)
- **Task 강화판**: §3-2 API-002

## ✅ Task Breakdown
- [ ] `lib/schemas/curriculum.ts`에 Zod 입력 스키마:
  - `userId: z.string().uuid()`
  - `recentSessions: z.array(z.object({sessionId, missionId, success: z.boolean(), timestamp})).max(10)` (최근 10세션)
  - `targetPhoneme: z.enum(['ㅅ','ㅈ','ㄱ','ㄴ','ㄹ']).optional()` (지정 시 우선 추천)
  - `childAgeMonths: z.number().int().min(24).max(84)`
- [ ] 출력 스키마:
  - `recommendedMissionId: z.string().uuid()`
  - `recommendedDifficulty: z.number().int().min(1).max(5)`
  - `reason: z.enum(['continue', 'level_down', 'level_up', 'phoneme_switch'])`
  - `suggestedNextPhoneme: z.string().optional()` (한 음소 마스터 시 다음 추천)
  - `streakInfo: z.object({successCount: z.number(), failureCount: z.number()})`
- [ ] `app/actions/curriculum.ts`에 `'use server'` + 함수 시그니처
- [ ] 에러 enum: `INVALID_INPUT | NO_MISSIONS_AVAILABLE | INTERNAL_ERROR`
- [ ] TypeScript 타입 export

## 🧪 Acceptance Criteria
**Scenario 1: 정상 입력 검증**
- **Given**: userId + 최근 5세션(3 성공 / 2 실패) + 월령 36
- **When**: `InputSchema.parse(input)`
- **Then**: 통과, `CurriculumInput` 타입 보장

**Scenario 2: 3연속 실패 → level_down**
- **Given**: 최근 3세션 모두 실패
- **When**: 비즈니스 로직(FR-C-008 책임)
- **Then**: reason: 'level_down', recommendedDifficulty 한 단계 하향

**Scenario 3: 5연속 성공 → level_up 후보**
- **Given**: 최근 5세션 모두 성공
- **When**: 추천
- **Then**: reason: 'level_up' 또는 'phoneme_switch'

**Scenario 4: recentSessions 11개 입력 차단**
- **Given**: 11개 array
- **When**: 검증
- **Then**: ZodError throw (max 10)

**Scenario 5: 적절한 미션 없음**
- **Given**: 모든 ㅅ 음소 5단계 완료 + 다른 음소도 모두 마스터
- **When**: 호출
- **Then**: `NO_MISSIONS_AVAILABLE` 에러 + suggestedNextPhoneme 제안

## ⚙️ Technical & Non-Functional Constraints
- **REQ-FUNC-021**: 3연속 실패 시 난이도 하향, 전환 지연 < 0.5초
- **REQ-FUNC-023**: 하향 후 이탈률 < 5% (UX 영향 — UI 책임)
- **C-TEC-002**: Server Action으로 구현
- **횡단 제약**:
  - [ ] 비의료 표현 — 추천 사유 메시지에 "치료/진단" 금지
  - [ ] 멱등성 — 동일 입력 → 동일 출력 보장 (랜덤 요소 최소화 또는 seeded)

## 🏁 Definition of Done
- [ ] 모든 Acceptance Criteria 충족
- [ ] Zod 스키마 단위 테스트 (입출력)
- [ ] `tsc --strict` 0 errors
- [ ] ESLint 0 errors
- [ ] 타입 export 검증
- [ ] PR 본문에 REQ-FUNC-021~023 매핑

## 🚧 Dependencies & Blockers
- **Depends on**: DB-006 (mission_cards 카탈로그)
- **Blocks**: FR-C-008 (구현), MOCK-002 (모킹), FR-Q-003 (미션 카드 UI)
- **Discope 영향**: 해당 없음
