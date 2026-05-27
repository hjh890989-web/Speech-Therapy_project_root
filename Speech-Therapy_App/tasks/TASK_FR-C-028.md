---
name: Feature Task
about: SRS V07 기반 Speech-Therapy Platform 개발 태스크 명세
title: "[FR-C] FR-C-028: F15 submit_chat_utterance + Middleware 금칙어 검열 + 7일 폐기"
labels: 'phase:p1, mode:pending, domain:fr-c, epic:f15, sprint:phase1plus'
assignees: ''
---

## 🎯 Summary
- **Task ID**: FR-C-028
- **Epic / Story**: F15 LLM 대화형 발화 유도 챗봇 (Phase 1+)
- **Phase**: 🟡 P1+
- **Mode**: 명세대로
- **Discope 적용**: D6 pgvector 미사용 (단일턴 컨텍스트)
- **목적**: F15 챗봇의 핵심 Server Action — 자녀 발화 → STT (Web Speech API, D1 정합) → 메시지 INSERT + 7일 폐기 Cron 등록 + Middleware 금칙어 검열 (ADR-04). 단일턴 컨텍스트 (pgvector 미사용, D6 정합) — Phase 2 까지 멀티턴 미적용.

## 🔗 References
- **SRS V07**: [`../docs/65_SRS_V07_Merged_Master_Final.md`](../docs/65_SRS_V07_Merged_Master_Final.md)
  - §4.1 Phase 1 Epic F15 — LLM 대화형 발화 유도 챗봇
  - REQ-FUNC-038 (Vercel AI SDK useChat 스트리밍 + Gemini)
  - REQ-FUNC-039 (자연 발화 데이터 무자각 수집 + 7일 폐기 + 의료 용어 배제)
  - ADR-03 (음성/발화 7일 폐기)
  - ADR-04 (의료 표현 회피)
  - ADR-07 (Vercel AI SDK 채택)
  - ADR-14 (F15 임상 안전 게이트 — KOPLAC 13 항목 + 자문 4주 통과 후 활성)
- **Task 강화판**: [`./10_Task_Breakdown_SRS_V07.md`](10_Task_Breakdown_SRS_V07.md) §2-B FR-C-028

## ✅ Task Breakdown
- [ ] `app/actions/chat.ts` 의 `submit_chat_utterance(input)` Server Action:
  - Zod: `{ message: string, childAgeMonths: number, intent?: 'request' | 'reject' | 'share' }`
  - STT 결과 메시지 INSERT to `chat_messages` (DB-NEW-F15-1 또는 DB-004 후속 — `expiresAt = now + 7일`)
  - PIPA 가드 (인증 user) — `assertConsentedIfAuthenticated`
- [ ] `proxy.ts` (Next.js 16 middleware) 에 금칙어 검열 추가:
  - 정규식 `/(치료|진단|장애|환자|병|증상|처방|병원|아프|문제아)/`
  - 검출 시 400 + 메시지 차단
- [ ] `/api/chat/stream` (API-019, Vercel AI SDK Edge → Gemini Pro 1.5) 호출 전 PII 마스킹 (FR-C-025) + 금칙어 1차 검증
- [ ] `/api/cron/chat-cleanup` Cron — 일 1회 `chat_messages.expiresAt < now()` 자동 삭제 (ADR-03)
- [ ] 단일턴 컨텍스트 (D6 pgvector 미사용) — 직전 1 메시지만 컨텍스트 입력
- [ ] Gemini 응답도 금칙어 정규식 검증 (1회 재생성 + 폴백)
- [ ] `useChat()` 스트리밍 응답 시간 p95 ≤ 2s (REQ-FUNC-038 AC)

## 🧪 Acceptance Criteria
**Scenario 1: 자녀 발화 메시지 INSERT (REQ-FUNC-039)**
- **Given**: 동의 user + STT 메시지 "사과 먹고 싶어요"
- **When**: `submit_chat_utterance({message, childAgeMonths: 36})`
- **Then**: chat_messages INSERT 1건 + expiresAt = now + 7일

**Scenario 2: 7일 후 자동 폐기 (ADR-03)**
- **Given**: chat_messages.expiresAt < now()
- **When**: Cron 실행
- **Then**: row DELETE — 자연 발화 데이터 자동 폐기

**Scenario 3: 금칙어 자동 차단 (ADR-04, Middleware)**
- **Given**: 사용자가 "병원 가야 해?" 입력
- **When**: proxy.ts middleware 통과 시도
- **Then**: 400 응답 + Gemini 미호출 + chat_messages 미INSERT

**Scenario 4: Gemini 응답 금칙어 검출 — 1회 재생성 (REQ-FUNC-039)**
- **Given**: Gemini 1차 응답에 "치료" 포함
- **When**: 정규식 검출
- **Then**: Gemini 재호출 1회, 그래도 발견 시 정적 폴백 ("계속 함께 이야기해봐요")

**Scenario 5: 단일턴 컨텍스트 (D6 정합)**
- **Given**: 5턴 대화 진행
- **When**: 6턴 입력
- **Then**: 직전 1턴만 context — pgvector 미조회

**Scenario 6: 스트리밍 응답 시간 (REQ-FUNC-038 AC)**
- **Given**: 100회 정상 호출
- **When**: `/api/chat/stream` 응답
- **Then**: p95 ≤ 2s

**Scenario 7: PIPA 미동의 인증 user — ConsentRequiredError**
- **Given**: User.pipaUnderageConsentAt = NULL
- **When**: `submit_chat_utterance(input)`
- **Then**: `ConsentRequiredError` throw

## ⚙️ Technical & Non-Functional Constraints
- **REQ-FUNC-038**: Vercel AI SDK 스트리밍 p95 ≤ 2s
- **REQ-FUNC-039**: 7일 폐기 + 의료 용어 0건
- **ADR-03 + ADR-04 + ADR-07 + ADR-14**: 4 ADR 동시 충족
- **횡단 제약**:
  - [x] CON-04: Middleware + Gemini 응답 + 정적 폴백 3중 검증
  - [x] R4 개인정보: 7일 폐기 + PII 마스킹 (FR-C-025) 통합
  - [x] R7 PIPA 위반: 동의 user 만 — 인증 가드
- **임상 안전 게이트 (ADR-14)**: F15 활성 전 §6.9 KOPLAC 13 항목 + 자문 4주 + 82만 통과 필수

## 🏁 Definition of Done
- [ ] `submit_chat_utterance` 7 scenario 통과
- [ ] Middleware 금칙어 검열 자동 검증
- [ ] 7일 폐기 Cron 동작 검증
- [ ] Gemini 응답 의료 용어 0건 자동 (E2E)
- [ ] 단일턴 컨텍스트 — pgvector 미조회 검증
- [ ] `tsc --strict` 0 errors
- [ ] ADR-14 임상 안전 게이트 통과 후 활성 — 외부 OPS-005 의존

## 🚧 Dependencies & Blockers
- **Depends on**: API-019 (/api/chat/stream + submit_chat_utterance 묶음), FR-C-025 (PII 마스킹), API-011 (Gemini), FR-C-005 (V06 base — STT 패턴), ADR-14 임상 안전 게이트 (외부 자문)
- **Blocks**: TEST-020 (F15 안전 — 의료 용어 0건 + 7일 폐기 + 단일턴), FR-Q-022 (`/chat` UI)
- **Discope 영향**: D6 pgvector 미사용 = 단일턴 컨텍스트 명세
