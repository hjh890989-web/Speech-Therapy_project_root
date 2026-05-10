---
name: Feature Task
about: SRS V06 기반 Speech-Therapy Platform 개발 태스크 명세
title: "[FR-C] FR-C-002: Confidence < 70 → HITL 큐 + Slack 웹훅 (D4 적용)"
labels: 'phase:p1, mode:replace, domain:fr-c, epic:hitl'
assignees: ''
---

## 🎯 Summary
- **Task ID**: FR-C-002
- **Epic / Story**: F1-a 자동 HITL 이관 / S1·S6
- **Phase**: 🟡 P1
- **Mode**: 🔵 Replace (D4 적용 — Realtime 대신 Slack 웹훅)
- **Discope 적용**: D4 (HITL Realtime 큐 → Slack 웹훅)
- **목적**: FR-C-001(3축 스코어링) 완료 후 confidence < 70 발생 시 자동으로 hitl_queue INSERT + Slack 웹훅 발송. SRS는 Supabase Realtime 트리거를 명시했으나 D4 적용으로 단순 INSERT + Slack으로 대체.

## 🔗 References
- **SRS**: [`../65_SRS_V06_Nextjs_Fullstack_Final.md`](../65_SRS_V06_Nextjs_Fullstack_Final.md)
  - REQ-FUNC-003 (Confidence < 70 → HITL 자동 이관)
  - REQ-FUNC-HITL-001 (즉시 이관)
  - §3.6.2 시퀀스 다이어그램 (HITL 에스컬레이션 플로우)
- **Task 강화판**: §3-5 FR-C-002 (Replace 모드)
- **검토 보고서**: §1.2 [추가 D4]

## ✅ Task Breakdown
- [ ] FR-C-001 `analyzeDiagnosis()` 함수 마지막 단계에서 분기 추가:
  - confidence < 70 시 `enqueueForReview(sessionId, userId, confidence)` 헬퍼 호출
- [ ] `lib/hitl.ts`에 `enqueueForReview` 함수:
  - hitl_queue UPSERT (sessionId 중복 시 confidence 갱신)
  - 내부 API `/api/hitl/queue` POST 호출 (API-005)
  - `Authorization: Bearer ${INTERNAL_API_SECRET}` 헤더
- [ ] API-005가 Slack 웹훅 발송 → 본 함수는 응답 받음
- [ ] 사용자 응답 페이로드에 `requiresHITL: true` + "전문가 검토 중" 메시지 포함
- [ ] 결과 페이지(FR-Q-002)에서 `requiresHITL` true 시 별도 안내 박스 노출
- [ ] 텔레메트리: Vercel Analytics `hitl_auto_enqueued`
- [ ] 실패 처리:
  - API-005 호출 실패 시 → 백그라운드 재시도 1회 + Sentry/Slack 에러 알림
  - 사용자 응답 자체는 성공 (graceful degradation — DB는 evaluation_results에 저장됨)

## 🧪 Acceptance Criteria
**Scenario 1: Confidence 65 → HITL 큐 등록 (REQ-FUNC-003)**
- **Given**: Gemini가 confidence: 65 반환
- **When**: `analyzeDiagnosis()` 마지막 단계
- **Then**: hitl_queue INSERT, Slack 메시지 1건 발송, requiresHITL: true 응답

**Scenario 2: Confidence 75 → 큐 등록 안 됨**
- **Given**: confidence: 75
- **When**: 동일 호출
- **Then**: hitl_queue 0건 추가, requiresHITL: false

**Scenario 3: 즉시 이관 (REQ-FUNC-HITL-001)**
- **Given**: confidence < 70
- **When**: 호출
- **Then**: 큐 등록 + Slack 발송 모두 ≤ 2초 내

**Scenario 4: Slack 실패 graceful**
- **Given**: SLACK_WEBHOOK_URL 일시 장애
- **When**: 호출
- **Then**: hitl_queue INSERT는 성공, slackNotified: false, 사용자 응답은 정상

**Scenario 5: 중복 sessionId 방지 (멱등성)**
- **Given**: 이미 큐에 있는 sessionId 재분석
- **When**: 재호출
- **Then**: hitl_queue UPSERT (confidence 갱신만)

**Scenario 6: 사용자에게 안내**
- **Given**: requiresHITL: true 응답
- **When**: 결과 페이지(FR-Q-002) 렌더
- **Then**: "전문가가 검토 중입니다 (≤ 48시간)" 박스 노출

## ⚙️ Technical & Non-Functional Constraints
- **REQ-FUNC-HITL-001**: 즉시 이관 (≤ 2초)
- **REQ-NF-012**: 48h SLA (DB-009의 slaDueAt이 자동 계산)
- **D4 적용**: Realtime 미사용 → Slack 웹훅 + Supabase Studio 운영
- **횡단 제약**:
  - [ ] R2 — 낮은 Confidence 결과를 안전하게 격리
  - [ ] R4 — Slack 메시지에 자녀 식별 정보 미포함 (sessionId만)
  - [ ] **graceful degradation** — Slack 실패가 사용자 흐름을 차단하지 않음

## 🏁 Definition of Done
- [ ] 모든 Acceptance Criteria 충족
- [ ] `tsc --strict` 0 errors
- [ ] 단위 테스트 (TEST-002 책임)
- [ ] Slack 웹훅 1회 실제 발송 검증
- [ ] D4 적용 사유 README 명시
- [ ] PR 본문에 REQ-FUNC-003 + REQ-FUNC-HITL-001 + D4 매핑

## 🚧 Dependencies & Blockers
- **Depends on**: FR-C-001 (분기 트리거), DB-009 (hitl_queue), API-005 (Slack 웹훅 라우트)
- **Blocks**: TEST-002, FR-C-013 (전문가 코멘트 후속), FR-C-014 (어뷰징 방어)
- **Discope 영향**: D4 — Supabase Realtime 미사용. Slack 웹훅 + Supabase Studio로 운영
