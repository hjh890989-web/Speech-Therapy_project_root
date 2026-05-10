---
name: Feature Task
about: SRS V06 기반 Speech-Therapy Platform 개발 태스크 명세
title: "[Mock] MOCK-003: HITL 큐 / B2B 승인 / 동의서 서명 Mock (D4·D8 단순화)"
labels: 'phase:p1, mode:replace, domain:api, epic:hitl'
assignees: ''
---

## 🎯 Summary
- **Task ID**: MOCK-003
- **Epic / Story**: F6 HITL / F9-d B2B 알림장 / F10 동의서 (S6, S4, S5)
- **Phase**: 🟡 P1
- **Mode**: 단순화 (D4·D8 적용)
- **Discope 적용**: D4 (HITL Slack 웹훅), D8 (키즈노트 → 클립보드)
- **목적**: API-005 (HITL 큐 등록), API-007 (B2B 승인), API-008 (동의서 서명)의 FE 선개발 + TEST-014 픽스처. D4·D8 적용으로 외부 API 미연동 시뮬.

## 🔗 References
- **SRS**: [`../65_SRS_V06_Nextjs_Fullstack_Final.md`](../65_SRS_V06_Nextjs_Fullstack_Final.md)
  - REQ-FUNC-003, 032 (HITL)
  - REQ-FUNC-056~058 (AI 알림장 + 키즈노트)
  - REQ-FUNC-059~061 (전자서명)
- **Task 강화판**: §3-3 MOCK-003 (단순화)
- **검토 보고서**: §1.2 [추가 D4, D8]

## ✅ Task Breakdown
- [ ] `lib/mocks/hitl.ts`:
  - `mockQueueRegistered`: `{queueId, slaDueAt, slackNotified: true}`
  - `mockQueueDuplicate`: 409 Conflict 시뮬
  - `mockSlackFailed`: slackNotified: false (graceful)
  - `mockExpertCommentSuccess`: PATCH 응답 `{completedAt, userNotified: true}`
- [ ] `lib/mocks/b2b.ts`:
  - `mockApprovalSuccess`: 알림장 승인 + 클립보드 텍스트 반환
  - `mockApprovalRejected`: 거부 시나리오
- [ ] `lib/mocks/consent.ts`:
  - `mockConsentSent`: 일반 웹 동의 폼 링크 생성 (D7 적용으로 카카오 미연동)
  - `mockConsentSigned`: 서명 완료 페이로드
  - `mockConsentExpired`: 7일 초과 시뮬
- [ ] 환경 변수 분기:
  - `USE_MOCK_HITL=true`
  - `USE_MOCK_B2B=true`
  - `USE_MOCK_CONSENT=true`
- [ ] Vitest 픽스처 export

## 🧪 Acceptance Criteria
**Scenario 1: HITL 큐 등록 mock**
- **Given**: USE_MOCK_HITL=true
- **When**: POST `/api/hitl/queue`
- **Then**: `mockQueueRegistered` 반환, 실제 DB INSERT 안 됨, Slack 발송 안 됨

**Scenario 2: HITL 슬랙 실패 시뮬 (graceful degradation)**
- **Given**: ?mock-hitl=slack-failed
- **When**: POST
- **Then**: slackNotified: false, 200 OK

**Scenario 3: B2B 승인 mock**
- **Given**: USE_MOCK_B2B=true
- **When**: PATCH `/api/b2b/approval`
- **Then**: 클립보드 텍스트 반환 (D8 — 키즈노트 미연동)

**Scenario 4: 동의서 만료 시뮬**
- **Given**: ?mock-consent=expired
- **When**: 서명 페이지 진입
- **Then**: `mockConsentExpired` — "서명 기간 만료" 안내

**Scenario 5: Production 보호**
- **Given**: Vercel Production
- **When**: USE_MOCK_* 무관
- **Then**: Mock 전체 비활성

**Scenario 6: 스키마 일치**
- **Given**: 모든 Mock
- **When**: API-005/006/007/008 OutputSchema 검증
- **Then**: 모두 통과

## ⚙️ Technical & Non-Functional Constraints
- **D4·D8 명시**: HITL Realtime 미사용, 키즈노트 미연동 → 클립보드/Slack 단순 시뮬
- **격리**: Production 비활성
- **횡단 제약**: 해당 없음 (테스트 더미)
- **R5 대비**: 카카오/키즈노트 API 정책 변경에 영향 없음 (Mock이라)

## 🏁 Definition of Done
- [ ] 모든 Acceptance Criteria 충족
- [ ] Production Mock 비활성 검증
- [ ] `tsc --strict` 0 errors
- [ ] 9종 Mock(HITL 4 + B2B 2 + Consent 3) OutputSchema 통과
- [ ] TEST-014 픽스처 활용 검증
- [ ] D4·D8 적용 사유 README 명시

## 🚧 Dependencies & Blockers
- **Depends on**: API-005, API-006, API-007, API-008
- **Blocks**: FR-Q-008 (HITL 어드민 UI — D4 단순화), FR-C-002 (HITL 트리거), FR-C-013/014, FR-C-017 (AI 알림장), FR-C-018 (전자서명), TEST-014
- **Discope 영향**: D4 (HITL Realtime 미사용), D8 (키즈노트 미연동)
