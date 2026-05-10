---
name: Feature Task
about: SRS V06 기반 Speech-Therapy Platform 개발 태스크 명세
title: "[Route Handler] API-005: /api/hitl/queue (POST) — D4 적용 Slack 웹훅 대체"
labels: 'phase:p1, mode:replace, domain:api, epic:hitl'
assignees: ''
---

## 🎯 Summary
- **Task ID**: API-005
- **Epic / Story**: HITL 안전 프로토콜 / S6
- **Phase**: 🟡 P1
- **Mode**: 🔵 Replace (D4 적용)
- **Discope 적용**: D4 (HITL Realtime 큐 → Slack 웹훅 + Supabase Studio)
- **목적**: SRS의 `/api/hitl/queue` POST 엔드포인트는 원래 Realtime 큐 등록 + Realtime 알림이지만, D4 적용으로 **Supabase DB INSERT + Slack 웹훅 알림 발송**의 단순 형태로 대체. 1인 운영의 디버깅 부담 최소화.

## 🔗 References
- **SRS**: [`../65_SRS_V06_Nextjs_Fullstack_Final.md`](../65_SRS_V06_Nextjs_Fullstack_Final.md)
  - §3.5 API Overview — `app/api/hitl/queue` (POST)
  - REQ-FUNC-003 (Confidence < 70 → HITL 자동 이관)
  - REQ-FUNC-HITL-001 (즉시 이관)
- **Task 강화판**: §3-2 API-005 (Replace 모드)
- **검토 보고서**: §1.2 [추가 D4]

## ✅ Task Breakdown
- [ ] `app/api/hitl/queue/route.ts` 생성 (Route Handler)
- [ ] POST 핸들러:
  - 입력 Zod 검증: `{sessionId, userId, confidenceScore}`
  - DB-009 `hitl_queue` 테이블에 INSERT (slaDueAt = now + 48h)
  - **Slack 웹훅 발송** (D4 핵심):
    - SLACK_WEBHOOK_URL 환경 변수 사용
    - 메시지: `:warning: HITL 검토 필요 — sessionId: {id}, confidence: {score}, SLA: {dueAt}`
    - Supabase Studio 링크 첨부
- [ ] 응답 스키마:
  - `success: boolean`
  - `queueId: string`
  - `slaDueAt: ISO string`
  - `slackNotified: boolean` (웹훅 성공 여부)
- [ ] 에러 처리:
  - Zod 실패 → 400 Bad Request
  - DB INSERT 실패 → 500
  - Slack 웹훅 실패 → 로그만 남기고 200 (DB 등록 자체는 성공)
- [ ] 인증: 내부 호출만 (FR-C-002에서 직접 호출 — Server Action 우회 패턴)
  - `Authorization: Bearer ${INTERNAL_API_SECRET}` 검증
- [ ] Rate Limit: 동일 sessionId 1분 내 재시도 차단

## 🧪 Acceptance Criteria
**Scenario 1: 정상 등록 + Slack 알림 (REQ-FUNC-HITL-001)**
- **Given**: 유효 sessionId + confidenceScore: 65
- **When**: POST `/api/hitl/queue`
- **Then**: DB row 생성 + Slack 메시지 1건 발송, 응답 `{success: true, slackNotified: true}`

**Scenario 2: 인증 실패**
- **Given**: Authorization 헤더 누락
- **When**: POST
- **Then**: 401 Unauthorized

**Scenario 3: 입력 검증 실패**
- **Given**: confidenceScore 누락
- **When**: POST
- **Then**: 400 Bad Request + ZodError 메시지

**Scenario 4: 중복 sessionId 차단**
- **Given**: 이미 등록된 sessionId
- **When**: 재 POST
- **Then**: 409 Conflict + 기존 queueId 반환

**Scenario 5: Slack 웹훅 실패 시 DB는 성공**
- **Given**: Slack URL 일시 장애
- **When**: POST
- **Then**: DB INSERT 성공, slackNotified: false, 200 OK (graceful degradation)

**Scenario 6: 동일 sessionId 1분 내 재시도 차단**
- **Given**: 1분 내 동일 sessionId 두 번째 호출
- **When**: POST
- **Then**: 429 Too Many Requests

## ⚙️ Technical & Non-Functional Constraints
- **REQ-FUNC-HITL-001**: 즉시 이관 — Slack 웹훅은 ≤ 2초 내 발송 시도
- **REQ-NF-012**: HITL 피드백 ≤ 48h — slaDueAt 자동 계산
- **C-TEC-002**: Route Handler 사용 (Server Action 아닌 이유: 내부 API 호출 인증 분리)
- **횡단 제약**:
  - [ ] **D4 적용 명시** — Realtime 미사용, Slack 웹훅 + Supabase Studio
  - [ ] R4 보호 — Slack 메시지에 자녀 식별 정보 미포함 (sessionId만)
  - [ ] 내부 API 인증 — INTERNAL_API_SECRET 환경 변수 (Vercel Dashboard)

## 🏁 Definition of Done
- [ ] 모든 Acceptance Criteria 충족
- [ ] Slack Incoming Webhook 1회 실제 발송 검증
- [ ] `tsc --strict` 0 errors
- [ ] ESLint 0 errors
- [ ] Rate Limit 단위 테스트
- [ ] D4 적용 사유 README 명시
- [ ] PR 본문에 REQ-FUNC-003 + REQ-FUNC-HITL-001 + D4 매핑

## 🚧 Dependencies & Blockers
- **Depends on**: DB-009 (hitl_queue), INFRA-001 (SLACK_WEBHOOK_URL + INTERNAL_API_SECRET 환경 변수)
- **Blocks**: FR-C-002 (Confidence < 70 시 본 엔드포인트 호출), MOCK-003 (모킹 대상)
- **Discope 영향**: D4 — Realtime 미사용, Slack + Supabase Studio 운영. P1 후반 어드민 페이지 도입 시 Realtime 추가 검토
