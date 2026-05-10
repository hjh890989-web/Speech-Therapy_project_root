---
type: source
pillar: product
title: Sprint 1 Dependent Tasks Detail — FR-C-002 + API-004 + API-011 + SEC-004 + TEST-001/004/009
source_path: ../../../raw/TASKS/TASK_FR-C-002.md
source_path_b: ../../../raw/TASKS/TASK_API-004.md
source_path_c: ../../../raw/TASKS/TASK_API-011.md
source_path_d: ../../../raw/TASKS/TASK_SEC-004.md
source_path_e: ../../../raw/TASKS/TASK_TEST-001.md
source_path_f: ../../../raw/TASKS/TASK_TEST-004.md
source_path_g: ../../../raw/TASKS/TASK_TEST-009.md
source_type: task_detail
authors: []
year: 2026
ingested: 2026-05-09
tags: [Sprint1, TaskDependency, RateLimiter, HITL, GracefulDegradation, Vitest, Playwright, 클러스터TASKS]
---

# Sprint 1 직접 의존 7 Task 상세

[[product/sources/TASKS-Sprint-1-Core-Detail]] 의 8 코어가 직접 Depends on 하는 7 task 정독. **개발 시작 시 본 7 task가 코어 8과 동시 진행**되어야 Sprint 1 합격 게이트 통과.

## 의존성 매트릭스 (Sprint 1 코어 ← 본 7 task)

| Sprint 1 코어 | Depends on (본 7) | 역할 |
|---|---|---|
| FR-C-001 | API-011 + SEC-004 | Gemini 호출 + Rate Limiter |
| FR-C-001 | TEST-001 | 6 Scenario 단위 테스트 검증 |
| FR-Q-001/002/FR-C-001 | TEST-004 | E2E 검증 (5분 + Disclaimer 3중) |
| FR-C-009 | API-004 | grantReward DTO |
| FR-C-009 | TEST-009 | 멱등성 + 동시성 검증 |
| (P1) | FR-C-002 | Confidence<70 → Slack 웹훅 (D4) |

## 1. FR-C-002 · Confidence<70 → HITL 큐 + Slack 웹훅 (P1, D4 Replace)

**Phase**: 🟡 P1 / **Mode**: 🔵 Replace (D4 적용 — Realtime → Slack 웹훅)

### 핵심 동작
- FR-C-001 마지막 단계에서 분기: confidence < 70 시 `enqueueForReview(sessionId, userId, confidence)` 헬퍼 호출
- `lib/hitl.ts`: hitl_queue UPSERT (sessionId 중복 시 confidence 갱신) + 내부 API `/api/hitl/queue` POST → Slack 웹훅
- 사용자 응답에 `requiresHITL: true` + "전문가 검토 중 (≤48h)" 메시지

### 텔레메트리
Vercel Analytics `hitl_auto_enqueued`

### ⭐ Graceful Degradation
- API-005 호출 실패 시 → 백그라운드 재시도 1회 + Sentry/Slack 에러 알림
- **사용자 응답 자체는 성공** (DB는 evaluation_results에 저장됨)

### G/W/T (6 시나리오)
1. confidence 65 → hitl_queue INSERT + Slack 1건 + requiresHITL=true
2. confidence 75 → 큐 0건, requiresHITL=false
3. **즉시 이관 ≤ 2초** (REQ-FUNC-HITL-001)
4. **Slack 실패 graceful**: hitl_queue INSERT 성공, slackNotified=false, 사용자 응답 정상
5. 중복 sessionId → UPSERT (confidence 갱신만)
6. UI 안내: "전문가가 검토 중입니다 (≤48시간)" 박스

### Constraints
- REQ-FUNC-HITL-001 즉시 이관 (≤ 2초)
- REQ-NF-012 48h SLA (DB-009의 slaDueAt 자동 계산)
- **R4**: Slack 메시지에 자녀 식별 정보 미포함 (sessionId만)
- **D4 사유 README 명시**: Realtime 대신 Slack 웹훅 + Supabase Studio 운영

### **Depends on**: FR-C-001 (분기 트리거), DB-009 (hitl_queue), API-005 (Slack 라우트)
### **Blocks**: TEST-002, FR-C-013, FR-C-014

---

## 2. API-004 · grantReward() DTO + 멱등성 키 (P0, 0.5d 추정)

**Phase**: 🟢 P0 / **Mode**: 명세대로

### Zod Input Schema
```typescript
{
  userId: z.string().uuid(),  // 또는 익명 localStorage UUID
  rewardType: z.enum(['star', 'tree', 'drawing']),
  amount: z.number().int().min(1).max(10),  // 한 번에 최대 10개
  idempotencyKey: z.string().min(1).max(255)
}
```

### Zod Output Schema
```typescript
{
  success: z.boolean(),
  cumulativeStars: z.number().int().min(0),
  treeGrowthLevel: z.number().int().min(0),
  aiDrawingCount: z.number().int().min(0),
  wasSkipped: z.boolean()  // 멱등성 무시 시 true
}
```

### Error Codes
`INVALID_INPUT | USER_NOT_FOUND | INTERNAL_ERROR`

### G/W/T (4 시나리오)
1. 정상 입력 검증 통과
2. 음수 amount → ZodError → INVALID_INPUT
3. 멱등성 키 누락 → ZodError
4. rewardType enum 외 (예: 'coin') → tsc 컴파일 에러

### Constraints
- REQ-NF-005 ≤ 500ms (구현 단계 책임)
- C-TEC-002 Server Action (`'use server'`)
- **멱등성**: idempotencyKey 필수, 동일 키 2회 시 wasSkipped=true
- **동시성**: 트랜잭션 또는 raw `INCR` (구현 단계)
- 보안: userId 로깅 시 마스킹 (`usr_***1234`)

### **Depends on**: DB-008
### **Blocks**: FR-C-009, TEST-009, FR-Q-004 (P1)

---

## 3. API-011 · Vercel AI SDK + Gemini 어댑터 (P0)

**Phase**: 🟢 P0 / **Mode**: 명세대로 + Rate Limiter 통합

### 핵심 Files
- `lib/ai/gemini.ts` — `geminiClient` export
- `lib/ai/prompts.ts` — 시스템 프롬프트 단일화

### 통합 함수 2종
- **`generateJson<T>(prompt, zodSchema)`** — `generateObject()` 래퍼 + Zod 검증
- **`streamText(prompt)`** — `streamText()` 래퍼 (P1+ 챗봇 F15용)

### 기본 모델
`gemini-1.5-flash` (무료 티어 RPM 15)

### 시스템 프롬프트 단일화 (`lib/ai/prompts.ts`)
- "의료 진단 표현 금지"
- "한국어 출력"
- "JSON 출력 시 형식 준수"

### ⭐ Fallback 어댑터 (D4 검증)
- `npm i ai @ai-sdk/google` + Fallback 옵션 (`@ai-sdk/openai`, `@ai-sdk/anthropic`)
- 환경 변수 `AI_PROVIDER=gemini|openai|anthropic` (기본 gemini)
- **동일 시그니처로 swap 가능** = SDK v3+의 `@ai-sdk/*` 표준화 효과

### 토큰 사용량 추적 (REQ-NF-018)
호출 후 `{model, prompt_tokens, completion_tokens, cost_usd}` Vercel KV 또는 Supabase 누적

### G/W/T (5 시나리오)
1. JSON 응답 + Zod 검증 (≤ 2,000ms)
2. **Rate Limiter 차단**: 16번째 호출 → `RATE_LIMITED` (Gemini 실호출 안 됨)
3. **D4 Fallback**: `AI_PROVIDER=openai` → OpenAI 자동 전환, 동일 시그니처 동작
4. 토큰 사용량 로깅
5. 시스템 프롬프트 강제 ("의료 진단 표현 금지" 페이로드 포함)

### Constraints
- REQ-NF-018 유저당 월 ≤ ₩5,250 (≈ $4)
- **G5 Rate Limiter** 무료 RPM 15 보호 (SEC-004 강제 적용)
- C-TEC-005 Python 서버 금지
- CON-04 시스템 프롬프트 명시 + 응답 정규식 재검증 (FR-C-001 책임)
- **모든 호출 진입점에 Bypass 불가 강제 적용**

### **Depends on**: DB-001, **SEC-004** (Rate Limiter 인스턴스), INFRA-001
### **Blocks**: FR-C-001, FR-C-011 (P1), FR-C-017 (P2), F15 챗봇 (P1)

---

## 4. SEC-004 · Gemini Rate Limiter (P0, Sprint 2 라벨이나 Sprint 1 게이트) ⭐

**Phase**: 🟢 P0 / **Mode**: 명세대로 / **신규 도출** (검토 보고서 §2.2 [추가 E4])

### 신규 도구 도입: **Upstash Redis Free**
- 최대 10K 요청/일 무료
- 환경변수 `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` (INFRA-001 통합)
- `npm i @upstash/ratelimit @upstash/redis`

### ⭐ 3중 Rate Limit (`lib/ratelimit.ts`)

| Limiter | 정책 | 보호 대상 |
|---|---|---|
| **`geminiRateLimiter`** | 슬라이딩 윈도우 **14 RPM** (안전 마진 1) | Gemini 무료 RPM 15 |
| **`userDailyLimiter`** | 사용자당 **일 50회** | 1,000 MAU 비용 보호 |
| **`costGuard`** | 일 누적 **≤ $1.00** 임계 | REQ-NF-018 (₩5,250/유저/월) |

### API-011 어댑터 통합 지점
`geminiClient.generateJson()` 진입 시 **3중 체크** (전역 RPM, 사용자 일 한도, 일 비용)

### 초과 응답
`RATE_LIMITED` + `retry_after` (초) → HTTP 429 + Retry-After 헤더

### 비용 추적
호출 후 토큰 사용량 → cost_usd 계산 → Redis INCR / 매일 00:00 UTC 자동 리셋 (TTL 24h)

### Slack 80% 임계 알림
일 누적 80% 도달 시 1회 webhook (**중복 방지 플래그** — 재호출 시 미발송)

### 환경 격리 ⭐
**Production / Preview / Dev** 환경별 Redis 키 prefix 강제:
- `prod:gemini:rpm`
- `preview:gemini:rpm`
- `dev:gemini:rpm`

### G/W/T (6 시나리오)
1. RPM 14 이내 정상 호출
2. **15번째 호출 → 차단** (Gemini 실호출 안 됨, retry_after 반환)
3. 사용자 51번째 (24h 내) → `USER_DAILY_LIMIT`
4. **일 누적 $0.80 → Slack 알림 1회** (재호출 시 중복 발송 안 됨)
5. 환경 격리 검증
6. 자정 UTC 자동 리셋

### Constraints
- REQ-NF-018: 유저당 월 ≤ ₩5,250 ≈ $4 → 일 환산 ≈ $0.13
- G5 가드레일: Gemini 무료 RPM 15 보호
- 모든 Gemini 호출 진입점 **Bypass 불가**
- 비용 모니터링 활성화 (REQ-NF-022 LTV:CAC 가드)

### **Depends on**: API-011, INFRA-001
### **Blocks**: **FR-C-001 (Gemini 호출 시 통과 필수)**, 모든 P1+ AI 호출 (FR-C-011, FR-C-017, F15)

> ⚠️ **Sprint 2 라벨이지만 Sprint 1 합격 게이트**: FR-C-001이 SEC-004 통과를 강제. 즉 SEC-004 미구현 시 FR-C-001 첫 호출에서 차단.

---

## 5. TEST-001 · Vitest 3축 스코어링 단위 테스트 + 부하 100회 (P0)

**Phase**: 🟢 P0 / **Mode**: 명세대로

### 핵심 도구
- `npm i -D vitest @vitest/ui happy-dom @testing-library/react`
- `vitest.config.ts`: `environment: 'happy-dom'`, `coverage.threshold: 80`, alias `'@/'`

### 핵심 Files
- `__tests__/actions/diagnosis.test.ts`
- `helpers/runConcurrent.ts` — `Promise.allSettled([...100])` 부하 헬퍼

### Mock 전략
- `vi.mock('@/lib/ai/gemini')` — Gemini API 차단
- `vi.mocked(prisma)` — `prisma.evaluationResult.create` 모킹
- MOCK-001 3종 픽스처 import

### FR-C-001의 6 Scenario → `it()` 변환

| `it` 블록 | 검증 |
|---|---|
| 1 | 정상 발화 시 3축 점수 0~100 float 반환 |
| 2 | 또래 백분위 0~100 산출 + 시드 100건 활용 |
| 3 | Confidence < 70 시 requiresHITL=true |
| 4 | 금칙어 감지 시 Gemini 재호출 1회 |
| 5 | LLM 응답 15s 초과 시 LLM_TIMEOUT |
| 6 | **100회 정상 호출 시 실패율 < 2%** (`runConcurrent`) |

### `package.json` 스크립트
```json
"test": "vitest run",
"test:watch": "vitest",
"test:coverage": "vitest run --coverage"
```

### G/W/T (4 시나리오)
1. 6/6 PASS, exit 0
2. **실패율 < 2%**: 100회 시뮬레이션, PASS ≥ 98건
3. 커버리지 ≥ 80% (`app/actions/diagnosis.ts`)
4. **격리**: 실제 Gemini API 호출 0회 (Mock 강제)

### Constraints
- TDD 원칙: AC를 테스트로 변환
- 격리: Gemini API + Supabase 실호출 금지
- **CI 통합**: Vercel Preview build hook → `npm run test` 자동

### **Depends on**: FR-C-001, API-001, API-011 (Mock 대상), MOCK-001
### **Blocks**: **Sprint 1 합격 게이트**

---

## 6. TEST-004 · Playwright E2E (5분 체류 + Disclaimer 100%) (P0)

**Phase**: 🟢 P0 / **Mode**: 명세대로

### 핵심 도구
- `npm i -D @playwright/test`
- `npx playwright install chromium`
- `playwright.config.ts`: `baseURL` 환경변수, projects: `chromium-mobile` (iPhone 13) + `chromium-desktop`, `headless: true`, `retries: 2`

### 핵심 Files
- `e2e/diagnosis-flow.spec.ts`

### ⭐ Web Speech API Mocking
```typescript
page.addInitScript(() => {
  window.SpeechRecognition = class {
    start() {
      this.onresult({ results: [[{transcript: '사과'}]] });
    }
  };
})
```

### Server Action Mock
Query param `?mock=success-high` → MOCK-001 활용

### 시나리오 8단계
1. `/diagnose` 진입 → SSR LCP ≤ 1.5s
2. 폼 input ≤ 3
3. 월령(36) + 음소(ㅅ) → "발화 시작"
4. Mock SpeechRecognition 트리거
5. Server Action 호출 → 결과 페이지
6. **t1 - t0 ≤ 300,000ms** (5분)
7. **`[data-testid="disclaimer"]` 3개 + 모두 visible**
8. 페이지 텍스트 정규식 `/(진단|장애|치료|환자)/` 0건

### G/W/T (6 시나리오)
1. **5분 체류 ≤ 300,000ms**
2. **Disclaimer 3중**: count=3, 각각 isVisible
3. 입력 폼 ≤ 3
4. 금칙어 0건
5. **모바일 + 데스크톱 양쪽 PASS**
6. SSR LCP ≤ 1,500ms (Vercel Pro 기준)

### Output
- HTML Report 아티팩트
- 실패 시 스크린샷 + trace 자동 저장

### Constraints
- REQ-FUNC-009/010/011 Disclaimer 100% NeverHide
- CON-04 금칙어 정규식 0건
- `data-testid` 명시 (`isVisible()` 검증)

### **Depends on**: FR-Q-001, FR-Q-002, FR-C-001, MOCK-001, INFRA-001 (Preview URL)
### **Blocks**: **Sprint 1 합격 게이트**

---

## 7. TEST-009 · 보상 정합성 (멱등성 + 동시성) (P0)

**Phase**: 🟢 P0 / **Mode**: 단순화 (Sprint 1엔 핵심만, 오프라인은 P1 D5 디퍼)

### 핵심 Files
- `__tests__/actions/reward.test.ts` (TEST-001 환경 재사용)

### ⭐ DB 격리 전략 (옵션)
- **A. Prisma SQLite in-memory**: `file::memory:?cache=shared`
- **B. Prisma Mock + 트랜잭션 시뮬**

→ 본 task에서 옵션 선택 자유. **R8 보호**: in-memory → Supabase Free 영향 없음.

### FR-C-009 5 Scenario → `it()`

| `it` 블록 | 검증 |
|---|---|
| 1 | 첫 보상 INSERT (row 없을 때) |
| 2 | 누적 UPSERT (cumulativeStars 증가) |
| 3 | **멱등성**: 동일 키 2회 → 1회만 +1 |
| 4 | **파티클 페인트 ≤ 500ms** (Performance.now) |
| 5 | **동시성 5병렬 → 정확히 +5** |

### 동시성 테스트 패턴
```typescript
await Promise.all([1..5].map(i => grantReward(...)))
```
검증: 최종 cumulativeStars +5 (race condition 0건)

### 멱등성 충돌 시뮬
동일 idempotencyKey 2회 호출 → 두 번째 응답 `wasSkipped: true`

### G/W/T (5 시나리오)
1. **멱등성**: "session-X-star-1" 2회 → +1만, wasSkipped=true
2. **동시성 5병렬**: 정확히 +5
3. 파티클 ≤ 500ms (Optimistic UI)
4. 신규 사용자 INSERT
5. 누적 UPSERT (10 → 15)

### Constraints
- REQ-NF-005 ≤ 500ms 파티클
- 격리: 실 Supabase 호출 금지
- **동시성**: race condition 0건 보장
- **CI 안정성**: 10회 반복 100% 성공

### **Depends on**: FR-C-009, API-004, DB-008
### **Blocks**: **Sprint 1 합격 게이트**

---

## ⭐ Sprint 1 합격 게이트 = TEST 3종 통과

```
[Sprint 1 코어 8 + 의존 7 = 15 task 모두 완료]
                     ↓
        TEST-001 (단위) + TEST-004 (E2E) + TEST-009 (동시성)
                     ↓
                Vercel CI 자동 통과
                     ↓
        Sprint 1 합격 → Phase 0 본격 (2-4주차)
```

## ⭐ Tech Stack 추가 도입 (의존 7 task)

| 도구 | 도입 Task | 용도 |
|---|---|---|
| **Upstash Redis (Free)** | SEC-004 | 3중 Rate Limit + 비용 추적 |
| **`@upstash/ratelimit`, `@upstash/redis`** | SEC-004 | 슬라이딩 윈도우 |
| `ai`, `@ai-sdk/google` | API-011 | Vercel AI SDK |
| `@ai-sdk/openai`, `@ai-sdk/anthropic` (옵션) | API-011 | D4 Fallback |
| **Vitest** + happy-dom + @testing-library/react | TEST-001 | 단위 테스트 |
| **Playwright** + chromium | TEST-004 | E2E + Web Speech mock |
| Sentry (선택) | FR-C-002 | Slack 실패 graceful degradation 알림 |

## ⭐ 환경변수 추가 (INFRA-001 보강)

기존 7종 + 추가 2종:
- `UPSTASH_REDIS_REST_URL` (SEC-004)
- `UPSTASH_REDIS_REST_TOKEN` (SEC-004)
- `AI_PROVIDER` (선택, API-011 D4 Fallback — 기본 'gemini')
- `INTERNAL_API_SECRET` (FR-C-002 → API-005 Bearer)

→ Sprint 1 환경변수 **총 9-11종**.

## 인용 가능 위치

| Task | 원본 | 줄 수 |
|---|---|---|
| FR-C-002 | TASK_FR-C-002.md | 91줄 |
| API-004 | TASK_API-004.md | 80줄 |
| API-011 | TASK_API-011.md | 89줄 |
| **SEC-004** | TASK_SEC-004.md | **96줄** ⭐ 가장 상세 |
| TEST-001 | TASK_TEST-001.md | 85줄 |
| TEST-004 | TASK_TEST-004.md | 98줄 |
| TEST-009 | TASK_TEST-009.md | 83줄 |

## Clinical cross-link

- **API-011 시스템 프롬프트 "의료 진단 표현 금지"** = ADR-04 ([[product/concepts/architecture-decisions]]) 의 **시스템 프롬프트 차원 강제**. [[clinical/concepts/한국-언어치료-트랙비교]] § 트랙1 회피.
- **SEC-004 Rate Limiter 일 비용 ≤ $1** = 1인/AI 의존 개발 ([[product/concepts/MVP-descope-plan]]) 의 비용 가드레일. AI 의존 임상 평가 디지털화의 비용 통제.
- **FR-C-002 Slack 알림에 자녀 식별 정보 미포함** = R4 영유아 정보 보호. [[clinical/concepts/언어발달지연]] 임상 평가의 동의·녹음 윤리 디지털 변형.
- **TEST-001 6번 100회 부하 + 실패율 < 2%** = AI 진단 정확도의 정량 검증. **임상 표준 검사** ([[clinical/entities/U-TAP]]) 의 reliability와 비교 가능 후속.

## 관련 product 페이지

- [[product/sources/TASKS-Sprint-1-Core-Detail]] — 코어 8 task 상세 (본 source의 짝)
- [[product/concepts/task-breakdown-overview]] — Sprint 1 합격 게이트 정본
- [[product/concepts/MVP-feature-spec]] § HITL + Lock-in
- [[product/concepts/architecture-decisions]] § ADR-04 (의료 용어 배제)·ADR-07 (Vercel AI SDK)
- [[product/concepts/MVP-descope-plan]] § D4 Slack + D5 오프라인

## 보강 필요
- **API-005** (`/api/hitl/queue` POST Route Handler) 정독 — FR-C-002의 직접 의존이지만 본 ingest 미포함.
- **MOCK-001/002/003** 정독 — TEST-001/004/009 모킹 픽스처. 본 ingest 미포함.
- **TEST-002~003, 005~008, 010~014** (나머지 11 TEST task) — Sprint 1 의존이 아니나 Phase 0 완성에 필요. 후속 ingest 후보.
- SEC-004의 **Slack 알림 중복 방지 플래그** 구현 디테일 (Redis SET + TTL?) — 본 task 명세에 알고리즘 미명시.
- API-011의 **Fallback 환경변수 swap 비용** — `@ai-sdk/openai` 가격이 Gemini 대비 5-10x 차이 → 본 source의 비용 가드(SEC-004)로 자동 차단되는가?
