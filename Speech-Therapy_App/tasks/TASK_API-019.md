---
name: Feature Task
about: SRS V07 기반 Speech-Therapy Platform 개발 태스크 명세
title: "[Server Action + Route Handler] API-019: F15 chat (/api/chat/stream + submit_chat_utterance)"
labels: 'phase:p1, mode:active, domain:api, epic:f15, sprint:p1+'
assignees: ''
---

## 🎯 Summary
- **Task ID**: API-019
- **Epic / Story**: F15 LLM 대화형 발화 유도 챗봇 (V07 신규)
- **Phase**: 🟡 P1+
- **Mode**: 명세대로
- **Discope 적용**: 해당 없음 (ADR-14 임상 안전 게이트 통과 후 활성)
- **목적**: Vercel AI SDK `useChat()` 스트리밍 + Gemini Pro 1.5 호출 + Middleware 금칙어 검열 + 7일 폐기.

## 🔗 References
- **SRS V07**: [`../docs/65_SRS_V07_Merged_Master_Final.md`](../docs/65_SRS_V07_Merged_Master_Final.md)
  - §4.1 Phase 1 Epic F15
  - REQ-FUNC-038 (스트리밍 UI p95 ≤ 2s)
  - REQ-FUNC-039 (자연 발화 수집 + 7일 폐기 + 의료 용어 배제)
  - ADR-07 (Vercel AI SDK) + ADR-14 (F15 안전 게이트)
- **Wiki**: `Phase-1-future-tasks-decomposition` §F15 + KOPLAC §화용

## ✅ Task Breakdown
- [ ] `/api/chat/stream/route.ts` Route Handler (Edge Runtime):
  - Vercel AI SDK `streamText({ model: google('gemini-1.5-pro'), messages })`
  - Middleware 의 ADR-04 금칙어 자동 검열 통과
  - PIPA 가드 (API-014 패턴 재사용)
- [ ] `app/actions/submit-chat-utterance.ts` Server Action:
  - 사용자 발화 텍스트 (Web Speech API STT 결과) → ChatMessage INSERT
  - 7일 폐기 Cron 등록 (`createdAt + 7일` 후 DELETE)
- [ ] `prisma/schema.prisma` ChatMessage model 추가 (`userId / role / content / createdAt / expiresAt`)
- [ ] Middleware (`proxy.ts` 또는 chat 내부) — `/(진단|장애|치료|환자|병|증상)/g` 정규식 자동 redaction
- [ ] 단일턴 컨텍스트 (pgvector 미사용 = D6) — 메시지 1~2개만 prompt 에 포함

## 🧪 Acceptance Criteria
**Scenario 1: 스트리밍 응답 (REQ-FUNC-038)**
- **Given**: 사용자 "사과 좋아해요"
- **When**: useChat() POST `/api/chat/stream`
- **Then**: SSE 스트림 시작 ≤ 2s (TTFB) + Gemini 응답 토큰 단위 전송

**Scenario 2: 의료 용어 자동 검열 (REQ-FUNC-039)**
- **Given**: Gemini 응답에 "진단" 포함
- **When**: Middleware 검열
- **Then**: "진단" → 마스킹 또는 재생성 1회

**Scenario 3: 7일 폐기 (REQ-FUNC-039)**
- **Given**: ChatMessage.createdAt < now - 7일
- **When**: Cron `/api/cron/chat-cleanup`
- **Then**: ChatMessage DELETE + audit_log

**Scenario 4: PIPA 가드 (REQ-NF-029)**
- **Given**: 미동의 인증 user
- **When**: chat 호출
- **Then**: SAFE_FALLBACK 응답 (Gemini 미호출) — API-014 4층 정합

**Scenario 5: ADR-14 안전 게이트**
- **Given**: F15 활성화 시도
- **When**: §10 KOPLAC 13 항목 + 자문 4주 + 82만 미통과
- **Then**: F15 비활성 (feature flag) — sub-task OPS-005 임상 자문 의뢰 선행

## ⚙️ Technical & Non-Functional Constraints
- **REQ-FUNC-039**: 의료 용어 0건 자동 (Middleware)
- **ADR-14**: F15 안전 게이트 — 임상 자문 통과 필수
- **횡단 제약**:
  - [ ] CON-04: Middleware 의무 통과
  - [ ] CON-03: 7일 폐기 Cron 등록
  - [ ] R4 개인정보: chat 메시지 내 PII 마스킹 (FR-C-025 재사용)
  - [ ] G5 Rate Limiter: Gemini 무료 RPM 15 보호 (SEC-004 재사용)

## 🏁 Definition of Done
- [ ] Edge Runtime 스트리밍 정상 동작
- [ ] Middleware 금칙어 자동 검열 검증 (TEST-020)
- [ ] 7일 폐기 Cron 등록
- [ ] PIPA 가드 통과
- [ ] ADR-14 임상 자문 통과 후 feature flag enable
- [ ] `tsc --strict` 0 errors

## 🚧 Dependencies & Blockers
- **Depends on**: API-011 (Gemini), API-014 (PIPA 가드 패턴), API-017 (Cron), FR-C-005 (Middleware 금칙어), OPS-005 (임상 자문)
- **Blocks**: FR-Q-022 (`/chat` 페이지), FR-C-028 (chat 안전), TEST-020
- **Discope 영향**: 해당 없음 (ADR-14 임상 자문 통과 후 활성)
