---
name: Feature Task
about: SRS V07 기반 Speech-Therapy Platform 개발 태스크 명세
title: "[FR-Q] FR-Q-022: /chat 페이지 (F15 LLM 대화형 발화 유도) — useChat 스트리밍 + ADR-04 금칙어 자동 검열"
labels: 'phase:p1, mode:active, domain:fr-q, epic:f15-chat, sprint:p1+'
assignees: ''
---

## 🎯 Summary
- **Task ID**: FR-Q-022
- **Epic / Story**: F15 LLM 대화형 발화 유도 챗봇 (Phase 1+ 신규)
- **Phase**: 🟡 P1+ (Phase 1 이후 + ADR-14 임상 안전 게이트 통과 후 활성)
- **Mode**: 명세대로 (ADR-04 금칙어 자동 검열 Middleware + ADR-07 Vercel AI SDK)
- **Discope 적용**: 해당 없음 (활성화는 §10 KOPLAC 13 항목 + 자문 4주 + 82만 통과 후)
- **목적**: Vercel AI SDK `useChat()` 스트리밍 UI — Gemini Pro 1.5 단일턴 컨텍스트 (D6 pgvector 미사용). 자녀의 자연 발화 무자각 유도 (의사소통 의도 / 차례 지키기 / 상황 맥락) + 7일 폐기 + ADR-04 의료 용어 0건 Middleware 자동 검열.

## 🔗 References
- **SRS V07**: [`../docs/65_SRS_V07_Merged_Master_Final.md`](../docs/65_SRS_V07_Merged_Master_Final.md)
  - §4.1 Phase 1+ Epic F15 — LLM 대화형 발화 유도 챗봇
  - REQ-FUNC-038 (Vercel AI SDK `useChat()` 스트리밍 + p95 ≤ 2s)
  - REQ-FUNC-039 (자연 발화 무자각 수집 + 7일 폐기 + 의료 용어 배제)
  - ADR-04 (CON-04 금칙어 하드코딩 배제)
  - ADR-07 (Vercel AI SDK 채택)
  - ADR-14 (F15 임상 안전 게이트 — §10 KOPLAC 13 항목)
  - §6.9 / §10 KOPLAC 13 항목
- **Task 강화판**: [`./10_Task_Breakdown_SRS_V07.md`](10_Task_Breakdown_SRS_V07.md) §2-A FR-Q-022 (FR-Q-NEW-F15-1)

## ✅ Task Breakdown
- [ ] `app/(public)/chat/page.tsx` — F15 진입 페이지
- [ ] `useChat()` from `ai/react` — `/api/chat/stream` 엔드포인트 (API-NEW-F15-1) 연결
- [ ] 스트리밍 UI — 메시지 list + 입력창 + 마이크 버튼 (Web Speech API D1 STT 통합)
- [ ] 시스템 프롬프트: "친근한 발화 유도 도우미" + KOPLAC 영감 시나리오 (요청 / 거절 / 공유 / 차례 지키기)
- [ ] **ADR-04 금칙어 Middleware 자동 검열**: streaming 응답을 client 가 받기 전 `lib/ai/profanity-filter.ts` 통과 — 금칙어 detected → 안전 fallback 으로 재생성 1회
- [ ] 발화 INSERT — FR-C-NEW-F15-1 (`submitChatUtterance`) 가 메시지 + 7일 폐기 Cron 등록
- [ ] Disclaimer 카드 상단: "본 대화는 의학적 평가가 아닌 발화 유도 목적이며, 7일 후 자동 삭제됩니다"
- [ ] `MedicalDisclaimerFooter` 전역 footer
- [ ] `ConsentRedirectGate` 적용 — PIPA 동의 인증 user 만 진입
- [ ] **활성화 가드**: `process.env.F15_CHAT_ENABLED === 'true'` (ADR-14 임상 게이트 통과 전까지 false) — 미통과 시 "임상 자문 진행 중" 안내 페이지

## 🧪 Acceptance Criteria
**Scenario 1: 정상 스트리밍 (REQ-FUNC-038)**
- **Given**: F15_CHAT_ENABLED=true + PIPA 동의 인증 user
- **When**: 자녀가 "사과 주세요" 입력 → 전송
- **Then**: `useChat()` 스트리밍 응답 p95 ≤ 2s + 응답 메시지 표시 + 발화 INSERT

**Scenario 2: ADR-04 금칙어 Middleware 자동 검열 (REQ-FUNC-039)**
- **Given**: Gemini 1차 응답에 "치료" 포함
- **When**: Middleware 가 응답 streaming intercept
- **Then**: 정규식 감지 → Gemini 재호출 1회 → 그래도 발견 시 안전 fallback 문구 ("발달 가이드 도우미가 안내드릴게요")

**Scenario 3: 7일 폐기 (ADR-03 + REQ-FUNC-039)**
- **Given**: 메시지 INSERT 7일 + 1초 경과
- **When**: Cron 발화
- **Then**: 메시지 DELETE + 사용자에게 안내 (Disclaimer 사전 명시)

**Scenario 4: ADR-14 임상 게이트 미통과 시 차단**
- **Given**: F15_CHAT_ENABLED=false
- **When**: `/chat` 진입
- **Then**: "임상 자문 진행 중 — Phase 1+ 활성 예정" 안내 페이지 + 본 라우트 차단

**Scenario 5: STT 통합 (D1)**
- **Given**: 마이크 권한 grant
- **When**: 마이크 버튼 → 발화 "오늘 뭐 했어?"
- **Then**: Web Speech API → 텍스트 변환 → 입력창 prefill → 전송 가능

**Scenario 6: ConsentRedirectGate 동작**
- **Given**: PIPA 미동의 인증 user
- **When**: `/chat` 진입
- **Then**: `/settings/privacy-consent?next=/chat` redirect

## ⚙️ Technical & Non-Functional Constraints
- **REQ-FUNC-038**: UI 응답 시간 p95 ≤ 2s (Vercel AI SDK Edge — ADR-07)
- **REQ-FUNC-039**: 7일 자동 폐기 + 금칙어 0건
- **ADR-04 + CON-04**: Middleware 가 streaming 응답 검열 — Gemini 응답이 그대로 client 에 도달 금지
- **ADR-14**: §10 KOPLAC 13 항목 통과 전 차단 (`F15_CHAT_ENABLED` flag)
- **횡단 제약**:
  - [x] CON-04 금칙어: Middleware Auto-filter + 시스템 프롬프트 명시 + TEST-NEW-F15-1 자동
  - [x] Disclaimer: "의학적 평가 아님" + 7일 폐기 안내 카드 + footer
  - [x] R4 개인정보: 발화 INSERT 시 PII 마스킹 (`lib/ai/pii-mask.ts` 7 패턴) + 7일 폐기
  - [x] R7 PIPA: ConsentRedirectGate 1층 + PIPA 두 동의 확보 후 진입

## 🏁 Definition of Done
- [ ] `useChat()` 스트리밍 UI + STT 통합 + p95 ≤ 2s
- [ ] ADR-04 금칙어 Middleware — Gemini 응답 검열 0건 누락 (TEST-NEW-F15-1 통과)
- [ ] 7일 폐기 Cron 검증 (TEST-NEW-F15-1)
- [ ] ADR-14 게이트 (`F15_CHAT_ENABLED` flag) 동작 — false 시 차단
- [ ] ConsentRedirectGate 동작 검증
- [ ] `tsc --strict` 0 errors
- [ ] PR 본문에 REQ-FUNC-038/039 + ADR-04/07/14 매핑

## 🚧 Dependencies & Blockers
- **Depends on**: API-019 (API-NEW-F15-1 `/api/chat/stream` Vercel AI SDK Edge), FR-C-NEW-F15-1 (`submitChatUtterance` Server Action), DB-017 (chat_messages 테이블 + 7일 Cron), `lib/ai/profanity-filter.ts` Middleware, ADR-14 임상 자문 게이트 (§10 KOPLAC 13 항목 + 자문 4주 + 82만)
- **Blocks**: TEST-NEW-F15-1 (화용 + ADR-04 + 7일 폐기 자동 검증)
- **Discope 영향**: Phase 1+ 게이트 (KOPLAC 13 항목 + 자문 4주 + 82만 미통과 시 F15 보류) — F15 보류 시 본 task 도 보류
