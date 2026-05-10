---
name: Feature Task
about: SRS V06 기반 Speech-Therapy Platform 개발 태스크 명세
title: "[Test] TEST-002: Confidence < 70 → HITL 큐 INSERT + Slack 웹훅 통합 테스트 (D4)"
labels: 'phase:p1, mode:replace, domain:test, epic:hitl'
assignees: ''
---

## 🎯 Summary
- **Task ID**: TEST-002
- **Epic / Story**: F1-a / S1·S6
- **Phase**: 🟡 P1
- **Mode**: 🔵 Replace 검증 (D4 적용으로 Slack 웹훅 호출 검증으로 단순화)
- **Discope 적용**: D4
- **목적**: FR-C-002의 Confidence < 70 자동 이관 흐름을 통합 테스트로 자동화. SRS는 Realtime 큐 검증을 명시했으나 D4 적용으로 **DB INSERT + Slack 웹훅 발송** 두 가지를 검증.

## 🔗 References
- **SRS**: [`../65_SRS_V06_Nextjs_Fullstack_Final.md`](../65_SRS_V06_Nextjs_Fullstack_Final.md)
  - REQ-FUNC-003 (Confidence < 70 → 자동 이관)
  - REQ-FUNC-HITL-001 (즉시 이관 ≤ 2초)
  - §5 Traceability — TC-S1-003
- **Task 강화판**: [`./03_Tasks_Breakdown_SRS_reinforce.md`](./03_Tasks_Breakdown_SRS_reinforce.md) §3-6 TEST-002
- **검토 보고서**: §1.2 [추가 D4]

## ✅ Task Breakdown
- [ ] `__tests__/integration/hitl-flow.test.ts` 생성
- [ ] Mock 설정:
  - `lib/ai/gemini.ts` 모킹 — confidence: 65 응답 강제
  - `prisma.hitlQueue.create` 검증 spy
  - Slack 웹훅 fetch 모킹 — `vi.mock('node-fetch')` 또는 MSW
- [ ] 통합 시나리오:
  - 1: confidence 65 발생 → DB INSERT 1건 검증
  - 2: Slack 웹훅 fetch 호출 1건 검증 (URL + 페이로드 검증)
  - 3: 응답 페이로드에 `requiresHITL: true` 포함 검증
  - 4: confidence 75 → INSERT 0건, Slack 호출 0건
  - 5: 중복 sessionId → UPSERT 동작 (멱등성)
  - 6: Slack 실패 graceful — DB INSERT는 성공, slackNotified: false
  - 7: 즉시 이관 ≤ 2초 (REQ-FUNC-HITL-001)
- [ ] 테스트 환경 격리:
  - SQLite in-memory 또는 별도 테스트 Supabase 인스턴스
  - SLACK_WEBHOOK_URL은 mock으로 차단
- [ ] 커버리지: FR-C-002 + API-005 + DB-009 결합 ≥ 80%

## 🧪 Acceptance Criteria
**Scenario 1: 7개 시나리오 통과**
- **Given**: FR-C-002 + API-005 + DB-009 구현 완료
- **When**: `npm run test`
- **Then**: 7/7 PASS

**Scenario 2: Slack 웹훅 호출 검증 (D4 핵심)**
- **Given**: confidence 65
- **When**: 통합 테스트 실행
- **Then**: fetch spy가 1회 호출됨 (URL = SLACK_WEBHOOK_URL, body에 sessionId 포함)

**Scenario 3: 즉시 이관 ≤ 2초**
- **Given**: 분석 완료
- **When**: 시간 측정
- **Then**: DB INSERT + Slack 호출 완료 ≤ 2초

**Scenario 4: Slack 실패 graceful**
- **Given**: fetch reject
- **When**: 호출
- **Then**: DB INSERT 성공, 응답 200 OK + slackNotified: false

**Scenario 5: 격리 — 실제 Slack 호출 0회**
- **Given**: 테스트 환경
- **When**: 100회 반복 실행
- **Then**: 실제 Slack 채널에 메시지 도달 0건

**Scenario 6: 커버리지 80%**
- **Given**: 테스트 실행
- **When**: 커버리지 측정
- **Then**: FR-C-002 라인 ≥ 80%

## ⚙️ Technical & Non-Functional Constraints
- **REQ-FUNC-003**: Confidence < 70 → 이관
- **REQ-FUNC-HITL-001**: 즉시 이관 ≤ 2초
- **TDD 원칙**: AC를 통합 테스트로 변환
- **격리**: Slack 실 호출 0건 보장
- **횡단 제약**:
  - [ ] D4 검증 — Slack 웹훅이 1차 알림 채널임을 확인
  - [ ] R4 — Slack 페이로드에 자녀 식별 정보 미포함 검증

## 🏁 Definition of Done
- [ ] 모든 Acceptance Criteria 충족
- [ ] 7/7 시나리오 통과
- [ ] 커버리지 ≥ 80%
- [ ] `tsc --strict` 0 errors
- [ ] CI(Vercel) 통과
- [ ] Slack 페이로드 R4 검증
- [ ] PR 본문에 REQ-FUNC-003/HITL-001 + D4 매핑

## 🚧 Dependencies & Blockers
- **Depends on**: FR-C-002, API-005, DB-009, MOCK-003 (Slack mock)
- **Blocks**: P1 합격 게이트 (HITL 흐름 회귀 보장)
- **Discope 영향**: D4 — Realtime 검증 대신 Slack 웹훅 호출 검증으로 대체
