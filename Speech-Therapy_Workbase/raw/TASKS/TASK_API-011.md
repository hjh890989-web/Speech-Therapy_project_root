---
name: Feature Task
about: SRS V06 기반 Speech-Therapy Platform 개발 태스크 명세
title: "[Server Action] API-011: Vercel AI SDK + Gemini 어댑터 (Rate Limiter 통합)"
labels: 'phase:p0, mode:active, domain:api, epic:f1-a, sprint:1'
assignees: ''
---

## 🎯 Summary
- **Task ID**: API-011
- **Epic / Story**: F1-a 3축 분석 / F4 주간 리포트 / F15 챗봇 (다중 사용)
- **Phase**: 🟢 P0
- **Mode**: 명세대로 + Rate Limiter 통합
- **Discope 적용**: 해당 없음 (D4 가정 검증 — Vercel AI SDK 표준 인터페이스로 Fallback 가능)
- **목적**: Vercel AI SDK + Google Gemini 호출을 단일 어댑터로 표준화. Rate Limiter(SEC-004) 통합 + Fallback 전환 가능 구조 + JSON/스트리밍 양방향 지원.

## 🔗 References
- **SRS**: [`../65_SRS_V06_Nextjs_Fullstack_Final.md`](../65_SRS_V06_Nextjs_Fullstack_Final.md)
  - C-TEC-005~006 (Vercel AI SDK + Gemini, Python 서버 금지)
  - D4 (환경 변수로 OpenAI/Anthropic Fallback)
  - REQ-NF-018 (AI API 비용 ≤ ₩5,250/유저/월)
- **Task 강화판**: §3-2 API-011
- **검토 보고서**: §2.2 [추가 E4] Vercel AI SDK Fallback 시나리오 검증

## ✅ Task Breakdown
- [ ] `npm i ai @ai-sdk/google` 설치 (Fallback 대비 `@ai-sdk/openai`, `@ai-sdk/anthropic`도 옵션 설치)
- [ ] `lib/ai/gemini.ts`에 `geminiClient` export
  - `import { google } from '@ai-sdk/google'`
  - 기본 모델: `'gemini-1.5-flash'` (무료 티어)
- [ ] 통합 함수 작성:
  - `generateJson<T>(prompt, zodSchema)` — `generateObject()` 래퍼 + Zod 검증
  - `streamText(prompt)` — `streamText()` 래퍼 (P1+ 챗봇·F15 용)
- [ ] Rate Limiter 통합 (SEC-004):
  - 호출 직전 토큰 버킷 체크 + 사용자 일 한도 검증
  - 초과 시 `RATE_LIMITED` 에러 반환 + Retry-After 정보
- [ ] Fallback 어댑터 인터페이스:
  - 환경 변수 `AI_PROVIDER=gemini|openai|anthropic` (기본 gemini)
  - 동일 시그니처로 swap 가능 (D4 검증)
- [ ] `lib/ai/prompts.ts`에 시스템 프롬프트 단일화:
  - "의료 진단 표현 금지", "한국어 출력", "JSON 출력 시 형식 준수"
- [ ] 토큰 사용량 로깅 (REQ-NF-018 비용 추적): `{model, prompt_tokens, completion_tokens, cost_usd}` Vercel KV 또는 Supabase에 누적

## 🧪 Acceptance Criteria
**Scenario 1: JSON 응답 생성 + Zod 검증**
- **Given**: 프롬프트 + Zod schema
- **When**: `generateJson(prompt, schema)`
- **Then**: schema 일치 객체 반환, 응답 시간 ≤ 2,000ms

**Scenario 2: Rate Limiter 차단 (RPM)**
- **Given**: 1분 내 16번째 호출
- **When**: `generateJson()`
- **Then**: `RATE_LIMITED` 에러 throw, Gemini 실제 호출 안 됨

**Scenario 3: 환경 변수 Fallback (D4 검증)**
- **Given**: `AI_PROVIDER=openai`
- **When**: 어댑터 init
- **Then**: OpenAI 클라이언트로 자동 전환, 동일 함수 시그니처 동작

**Scenario 4: 토큰 사용량 로깅**
- **Given**: 1회 호출 후
- **When**: 로그 확인
- **Then**: `{model, prompt_tokens, completion_tokens, cost_usd}` 기록

**Scenario 5: 시스템 프롬프트 강제**
- **Given**: 모든 호출
- **When**: 실제 Gemini 요청 페이로드 검사
- **Then**: 시스템 프롬프트에 "의료 진단 표현 금지" 포함

## ⚙️ Technical & Non-Functional Constraints
- **REQ-NF-018**: 유저당 월 ≤ ₩5,250 — 토큰 모니터링 필수
- **G5 Rate Limiter**: 무료 RPM 15 보호 (SEC-004 강제 적용)
- **C-TEC-005**: Python 서버 금지, Vercel AI SDK 사용
- **횡단 제약**:
  - [ ] CON-04 금칙어 — 시스템 프롬프트에 명시 + 응답 후 정규식 재검증 (FR-C-001 책임)
  - [ ] Rate Limiter — 모든 호출 진입점에 통합 (Bypass 불가)

## 🏁 Definition of Done
- [ ] 모든 Acceptance Criteria 충족
- [ ] `tsc --strict` 0 errors
- [ ] Rate Limiter 단위 테스트 통과
- [ ] 환경 변수 Fallback 시나리오 검증 (Mock 또는 실제)
- [ ] 토큰 사용량 모니터링 활성화
- [ ] 시스템 프롬프트 단일 소스 보장 (`lib/ai/prompts.ts`)
- [ ] PR 본문에 C-TEC-005~006 + REQ-NF-018 매핑

## 🚧 Dependencies & Blockers
- **Depends on**: DB-001, SEC-004 (Rate Limiter 인스턴스), INFRA-001 (환경 변수 등록)
- **Blocks**: FR-C-001 (3축 스코어링 호출), FR-C-011 (예측 — P1), FR-C-017 (쿠션어 알림장 — P2), F15 챗봇 (P1)
- **Discope 영향**: D4 검증 결과 — Vercel AI SDK Fallback 인터페이스 정상 동작 (SDK v3+의 `@ai-sdk/*` 표준화로 환경 변수 1개로 swap 가능)
