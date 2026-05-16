# 06. `.cursor/skills/` 백엔드 정합성 분석 — 삭제·수정·추가 제안 보고서

> **문서 정보**
> - **작성일**: 2026-05-16
> - **작성자**: Claude (Opus 4.7, 1M context) + 사용자 (`hjh890989@gmail.com`)
> - **버전**: v1.0
> - **위치**: `Speech-Therapy_App/tasks/06_Skills_백엔드_정합성_분석_보고서.md`
> - **상위 참조**: [`05_AI_Harness_재정립_계획서.md`](05_AI_Harness_재정립_계획서.md), `package.json`

---

## 0. Executive Summary

`.cursor/skills/` 의 21개 스킬을 Speech-Therapy 백엔드 스택 (Next.js 16 Server Actions + Prisma 7 + PostgreSQL/Supabase + Gemini API + Zod) 기준으로 점검한 결과:

| 분류 | 개수 | 비율 |
|---|---|---|
| 🟢 **KEEP** (유지) — 보편 규칙, 그대로 사용 | 7 | 33% |
| 🟡 **MODIFY** (수정) — 보편이지만 스택 조정 필요 | 3 | 14% |
| 🔴 **DELETE** (삭제) — Java Spring / JPA / Kafka / Flutter 등 우리 스택 아님 | 11 | 53% |
| ➕ **ADD** (추가) — 백엔드 핵심인데 누락 | **9** | (신규) |

**총 작업량**: 11개 삭제 + 3개 수정 + 9개 신규 = **23 항목**

**우선순위**: P0 (즉시) 9개, P1 (1주 내) 8개, P2 (후순위) 6개.

---

## 1. 백엔드 기술 스택 확정 (`package.json` 기반)

### 1.1 런타임 / 프레임워크

| 분야 | 기술 | 버전 |
|---|---|---|
| 런타임 | Node.js (Vercel serverless / Edge 일부) | 20.x |
| 프레임워크 | **Next.js** (App Router, Server Actions, Route Handlers) | **16.2.6** |
| 언어 | TypeScript (strict) | 5.x |
| 미들웨어 | Next.js 16 `proxy.ts` (구 middleware) | — |

### 1.2 데이터 / 인증 / AI

| 분야 | 기술 | 버전 |
|---|---|---|
| ORM | **Prisma** (PG adapter) | **7.8.0** |
| 데이터베이스 | PostgreSQL (Supabase 호스팅) | — |
| 인증 | **@supabase/ssr** (PKCE + cookies) + Magic Link + Google OAuth | 0.10.3 |
| AI SDK | **@ai-sdk/google** (Gemini) | 3.0.73 (`ai` 6.0.180) |
| 검증 | **Zod** | 4.4.3 |

### 1.3 테스트 / 배포 / 도구

| 분야 | 기술 | 버전 |
|---|---|---|
| 단위 테스트 | **Vitest** + `@testing-library/*` + happy-dom | 4.1.6 |
| E2E | **Playwright** | 1.60.0 |
| 배포 | **Vercel** (Hobby) | — |
| 린트 | ESLint 9 + `eslint-config-next` | — |
| 패키지 매니저 | npm | — |

### 1.4 우리 스택에 **없는** 것 (스킬 삭제 근거)

- ❌ Java / Spring Boot / Spring Security
- ❌ Gradle / Maven
- ❌ JPA / QueryDSL / Hibernate
- ❌ Python / FastAPI
- ❌ MySQL
- ❌ Redis (Lettuce / Redisson) — `lib/ratelimit.ts` 가 in-memory Map 으로 대체
- ❌ Kafka / MSA / Saga 패턴 — 우리는 모놀리식 Next.js
- ❌ Swagger / OpenAPI — Server Actions 는 REST 미노출
- ❌ Vite — Next.js 의 webpack/turbopack 사용
- ❌ Flutter / Riverpod — 우리는 web only

---

## 2. 기존 스킬 21개 + 메타 2개 분류

### 2.1 🟢 KEEP — 보편 프로세스 (그대로 유지)

| # | 스킬 | 사유 |
|---|---|---|
| 1 | `100-error-fixing-process` | 7단계 에러 진단 프로세스 — 언어/스택 무관 보편 절차 |
| 2 | `102-gitflow-agent` | Git flow 자체는 보편 |
| 3 | `200-git-commit-push-pr` | Conventional Commits + PR 작성 — 보편 |
| 4 | `201-code-commenting` | 주석 작성 원칙 — 보편 |
| 5 | `202-github-issue-handling` | Issue 관리 — 보편 |
| 6 | `generate-cursor-rule` | 메타 (룰 생성 가이드) |
| 7 | `generate-tasks-from-srs` | 메타 (SRS → 태스크 분해) |

### 2.2 🟡 MODIFY — 보편이지만 스택 조정 필요

| # | 현재 스킬 | 변경 후 | 조정 내용 |
|---|---|---|---|
| 1 | `101-build-and-env-setup` | 유지 (이름 동일) | Gradle/Maven 예시 → **npm + Next.js + Prisma generate + .env.local** 흐름으로 교체 |
| 2 | `304-api-rest-design-rules` | `304-api-design-rules` 로 rename + 분리 | REST 원칙은 외부 API 일부 (예: `/api/health`, `/api/debug/identity`) 에만 적용. **Server Actions 디자인 원칙은 신규 스킬 300 으로 분리** |
| 3 | `306-three-tier-architecture-rules` | `306-nextjs-layered-architecture-rules` | "Controller-Service-Repository" → **"Server Component / Server Action / lib / Prisma client"** 레이어 명시 |

### 2.3 🔴 DELETE — 우리 스택 아님 (11개)

| # | 삭제 대상 | 사유 |
|---|---|---|
| 1 | `300-java-spring-cursor-rules` | Java Spring 미사용 |
| 2 | `301-gradle-groovy-rules` | Gradle 미사용 (npm) |
| 3 | `302-jpa-querydsl-dynamic-query-rules` | JPA 미사용 (Prisma) |
| 4 | `302-python-fastapi-rules` | Python FastAPI 미사용 (Next.js Server Actions) |
| 5 | `303-database-mysql-jpa-rules` | MySQL 미사용 (PostgreSQL) |
| 6 | `303-spring-redis-lettuce-redisson-rules` | Spring + Redis 미사용 (in-memory rate limit) |
| 7 | `304-kafka-data-pipeline-rules` | Kafka 미사용 (모놀리식) |
| 8 | `305-api-swagger-testing-rules` | Swagger 미사용 (Server Actions 는 REST 비노출) |
| 9 | `305-kafka-msa-saga-pattern-rules` | Kafka MSA / Saga 미사용 |
| 10 | `306-react-vite-tailwind-rules` | Vite 미사용 (Next.js webpack/turbopack) |
| 11 | `307-flutter-riverpod-supabase-ai-rules` | Flutter 미사용 (web only) |

**삭제 방식**:
- (옵션 A) 폴더 완전 삭제 — 깔끔하나 복원 어려움
- (옵션 B) `_archived/` 하위 폴더로 이동 후 README 에 "다른 프로젝트 참고용" 표기 — 안전, 추천
- (옵션 C) git rm 후 commit message 로 archive — 깔끔, git history 로 복원 가능

**추천**: B (즉시 안전) 또는 C (장기적 깔끔)

### 2.4 ➕ ADD — 백엔드 핵심 누락 (9개)

> 번호 체계: 기존 300-307 자리를 우리 스택용으로 재배치.

| # | 신규 스킬 (제안 이름) | 다루는 내용 | P-우선순위 |
|---|---|---|---|
| 1 | `300-nextjs-server-actions-rules` | Server Actions 정의 + 호출 + 에러 처리 + Zod 검증 + revalidation | **P0** |
| 2 | `301-prisma-postgres-rules` | Prisma 7 schema 변경 / migration / nested writes / `Prisma.JsonNull` 패턴 / DIRECT_URL 분기 | **P0** |
| 3 | `302-supabase-auth-ssr-rules` | `@supabase/ssr` cookies 어댑터 / PKCE / Magic Link + OAuth callback / 익명→인증 마이그레이션 | **P0** |
| 4 | `303-zod-schema-validation-rules` | Zod 4 schema 작성 + 변환 + parse vs safeParse + Server Action 입력 validation | **P0** |
| 5 | `304-ai-sdk-gemini-rules` | `@ai-sdk/google` 호출 / `generateObject` 구조화 출력 / rate limiter (`lib/ratelimit.ts`) 통합 / fallback | **P0** |
| 6 | `305-vitest-testing-rules` | Unit test 전략 + `happy-dom` 한계 + Server Action 테스트 / 모킹 패턴 | **P1** |
| 7 | `306-playwright-e2e-rules` | E2E 시나리오 작성 + Vercel preview URL 테스트 + 인증 fixture | **P1** |
| 8 | `307-vercel-hobby-deployment-rules` | Vercel Hobby 제약 (Edge 미적용, cron 한계, function timeout, env vars 관리) | **P1** |
| 9 | `308-rate-limit-and-error-handling-rules` | `lib/ratelimit.ts` 패턴 + `RateLimitedError` graceful fallback + Server Action try/catch | **P2** |

---

## 3. 변경 후 디렉터리 트리

```
.cursor/skills/
├── 100-error-fixing-process/            ✅ KEEP
├── 101-build-and-env-setup/             🟡 MODIFY (npm + Next.js 흐름)
├── 102-gitflow-agent/                   ✅ KEEP
├── 200-git-commit-push-pr/              ✅ KEEP
├── 201-code-commenting/                 ✅ KEEP
├── 202-github-issue-handling/           ✅ KEEP
├── 300-nextjs-server-actions-rules/     ➕ NEW (P0)
├── 301-prisma-postgres-rules/           ➕ NEW (P0)
├── 302-supabase-auth-ssr-rules/         ➕ NEW (P0)
├── 303-zod-schema-validation-rules/     ➕ NEW (P0)
├── 304-ai-sdk-gemini-rules/             ➕ NEW (P0)
├── 304-api-design-rules/                🟡 MODIFY (Server Action 분리 + 외부 REST 만 다루도록)
├── 305-vitest-testing-rules/            ➕ NEW (P1)
├── 306-nextjs-layered-architecture-rules/  🟡 MODIFY (rename + 내용 교체)
├── 306-playwright-e2e-rules/            ➕ NEW (P1)
├── 307-vercel-hobby-deployment-rules/   ➕ NEW (P1)
├── 308-rate-limit-and-error-handling-rules/  ➕ NEW (P2)
├── generate-cursor-rule/                ✅ KEEP (메타)
├── generate-tasks-from-srs/             ✅ KEEP (메타)
└── _archived/                           🔴 DELETE 대상 11개 이동 (옵션 B)
    ├── 300-java-spring-cursor-rules/
    ├── 301-gradle-groovy-rules/
    ├── 302-jpa-querydsl-dynamic-query-rules/
    ├── 302-python-fastapi-rules/
    ├── 303-database-mysql-jpa-rules/
    ├── 303-spring-redis-lettuce-redisson-rules/
    ├── 304-kafka-data-pipeline-rules/
    ├── 305-api-swagger-testing-rules/
    ├── 305-kafka-msa-saga-pattern-rules/
    ├── 306-react-vite-tailwind-rules/
    └── 307-flutter-riverpod-supabase-ai-rules/
```

⚠️ 번호 충돌 주의: 304, 306 에 신규 + modified 가 공존 — 위 트리에서는 신규 번호 +modified 이름을 분리해 표기. 실제 적용 시 둘 중 하나의 번호를 재조정 필요 (예: 신규 = 304a, modified = 304b 식으로는 안 함. 대신 modified 의 번호를 30x → 31x 로 옮기는 게 깔끔).

**번호 재배치 권장안**:

```
300-nextjs-server-actions-rules         (NEW)
301-prisma-postgres-rules                (NEW)
302-supabase-auth-ssr-rules              (NEW)
303-zod-schema-validation-rules          (NEW)
304-ai-sdk-gemini-rules                  (NEW)
305-vitest-testing-rules                 (NEW)
306-playwright-e2e-rules                 (NEW)
307-vercel-hobby-deployment-rules        (NEW)
308-rate-limit-and-error-handling-rules  (NEW)
310-api-design-rules                     (MODIFY, 기존 304 → 310)
311-nextjs-layered-architecture-rules    (MODIFY, 기존 306 → 311)
```

---

## 4. 신규 스킬 9개 outline (각 SKILL.md 의 §섹션 미리보기)

### 4.1 `300-nextjs-server-actions-rules`

```
# Next.js Server Actions Rules

## 1. 정의
- "use server" 디렉티브 사용 (파일 최상단 또는 함수 단위)
- 위치: app/actions/*.ts (집중) 또는 페이지 인접 (분산)

## 2. 입력 검증 (필수)
- 모든 Server Action 의 첫 줄: zod schema.parse(input)
- Failure → throw new Error("VALIDATION_ERROR") 또는 안전한 메시지

## 3. 에러 처리
- 클라이언트에 노출되는 메시지는 일반화 ("일시적 오류")
- 상세 에러는 console.error / 모니터링으로

## 4. revalidation
- mutation 후 revalidatePath() / revalidateTag()
- 다음 RSC 렌더가 fresh data 보장

## 5. 안티패턴
- 클라이언트에 secret env var 노출 금지
- Server Action 안에서 setState 호출 시도 금지 (서버 측이라 안 됨)
```

### 4.2 `301-prisma-postgres-rules`

```
# Prisma 7 + PostgreSQL Rules

## 1. Schema 변경 절차
- prisma/schema.prisma 수정 → migration 파일 생성 (prisma migrate dev)
- 프로덕션 적용은 Supabase SQL Editor 에서 수동 (Hobby 제약)
- migrate deploy 는 Vercel build 단계 미적용 (READ ONLY env)

## 2. JSON 컬럼 (Prisma 제약)
- null 직접 대입 불가 → ?? undefined 패턴 (DB nullable 시 NULL 기록)
- 또는 Prisma.JsonNull 명시

## 3. DIRECT_URL vs DATABASE_URL
- DATABASE_URL: 풀러 (PgBouncer) — 일반 쿼리
- DIRECT_URL: 직접 연결 — migration 전용

## 4. Nested Write
- create 안에 nested create — 트랜잭션 자동
- 충돌 가능 시 upsert 사용

## 5. 성능
- N+1 회피: include / select 명시
- pagination: skip/take 또는 cursor
```

### 4.3 `302-supabase-auth-ssr-rules`

```
# Supabase Auth SSR Rules

## 1. 클라이언트 분리
- lib/supabase/client.ts: createBrowserClient (Client Component 전용)
- lib/supabase/server.ts: createServerClient (Server Component / Route Handler)
- 절대 server 클라이언트를 Client Component 에서 import 금지

## 2. PKCE Flow 필수 설정 (2026-05-15 핫픽스)
- 두 클라이언트 모두 명시적 cookies 어댑터 (getAll/setAll) 필요
- 기본 storage 가 localStorage 로 fallback 시 verifier 검출 실패

## 3. Magic Link
- signInWithOtp({ email, options: { emailRedirectTo: `${origin}/auth/callback` } })
- callback 에서 exchangeCodeForSession(code)

## 4. Google OAuth
- signInWithOAuth({ provider: "google", options: { redirectTo: `${origin}/auth/callback` } })
- 같은 callback 으로 PKCE/OAuth code 둘 다 처리됨

## 5. 익명 → 인증 마이그레이션
- anonymous_user_id cookie 기준 RewardProgress / SessionLog / EvaluationResult 마이그레이션
- 충돌 시 누적 (cumulativeStars) 합산
```

### 4.4 `303-zod-schema-validation-rules`

```
# Zod Schema Validation Rules

## 1. Schema 정의 위치
- lib/schemas/*.ts (도메인별 분리)

## 2. parse vs safeParse
- Server Action: parse (throw → 일반 에러 메시지)
- 외부 입력 (API route): safeParse (구조화 에러 반환)

## 3. transform / refine
- 데이터 변환 (string → number, ISO → Date) 은 transform
- 비즈니스 검증 (예: 이메일 도메인 화이트리스트) 은 refine

## 4. 옵셔널 vs nullable
- .optional() = 키 자체 없음 가능
- .nullable() = 키 있고 null 가능
- .nullish() = 둘 다 가능

## 5. 안티패턴
- z.any() / z.unknown() 남용 금지
- Schema 정의 후 TypeScript type 은 z.infer<typeof schema> 로
```

### 4.5 `304-ai-sdk-gemini-rules`

```
# AI SDK (Gemini) Rules

## 1. SDK 사용
- @ai-sdk/google + ai 패키지
- generateObject / generateText 구분

## 2. 구조화 출력
- generateObject + zod schema → 자동 검증 + 타입
- 자유 텍스트는 generatePlainText

## 3. Rate Limiting (lib/ratelimit.ts)
- 글로벌 RPM 14 (G5 가드레일) + 사용자 일 50회
- checkRateLimit → 호출 → recordCall 순서
- RateLimitedError catch → SAFE_*_FALLBACK 반환

## 4. 에러 처리
- LLM_TIMEOUT (8s+) → "분석에 시간이 오래 걸려요" 카피
- API_KEY 누락 → "운영자에게 문의" 카피
- 그 외 → 일반화 메시지

## 5. 비용 / 토큰
- 일일 비용 모니터링 (Phase 2 의 Slack 알림 80% 임계)
- 입력 token 1000자 제한 권장
```

### 4.6 `305-vitest-testing-rules`

```
# Vitest Unit Testing Rules

## 1. 테스트 위치
- __tests__/lib/*.test.ts (lib 모듈)
- __tests__/hooks/*.test.tsx (React hook)
- __tests__/integration/*.test.ts (Server Action + DB)

## 2. happy-dom 한계
- Web Audio API / SpeechRecognition / Web Crypto 일부 미지원
- 미지원 시 SSR safe fallback 분기 테스트

## 3. Server Action 테스트
- Prisma 모킹 vs 실 DB (테스트 DB)
- Sprint 2 기준: 실 DB (prisma.client) + 트랜잭션 rollback

## 4. Mock 패턴
- vi.mock() + factory 함수
- import path 정확히 매칭

## 5. Coverage 목표
- 핵심 lib 75%+ / 핵심 hook 70%+
```

### 4.7 `306-playwright-e2e-rules`

```
# Playwright E2E Rules

## 1. 시나리오 위치
- e2e/*.spec.ts

## 2. 인증 fixture
- 익명 진단 1회 → /rewards 별 누적 확인
- 인증 시나리오는 별도 (Magic Link 이메일 link 자동 클릭 어려움 → 토큰 직접 주입)

## 3. Vercel preview URL
- 환경변수 BASE_URL 으로 preview URL 주입
- PR 머지 전 preview 에서 E2E 자동 실행

## 4. flaky 회피
- waitForResponse / waitForSelector (시간 기반 sleep 금지)
- network idle 대기 후 검증

## 5. screenshot
- 실패 시 자동 screenshot + trace 저장
```

### 4.8 `307-vercel-hobby-deployment-rules`

```
# Vercel Hobby Deployment Rules

## 1. 제약 사항
- Function timeout: 10s (Hobby)
- Edge runtime: 일부 패키지 미적용 (Prisma 등)
- Cron: 1일 1회 (Hobby)
- Bandwidth: 100GB/월

## 2. 환경변수 관리
- Dashboard → Environment Variables
- Production / Preview / Development 분리
- secret 은 절대 git commit 금지 (client_secret_*.json 사례)

## 3. 배포 흐름
- main 브랜치 push → 자동 배포
- preview deployment: PR 생성 시 자동

## 4. 회피 패턴 (대화기록 §1.2 의 8종)
- iOS ITP cookie + localStorage 권위
- Server Action 워밍업
- curl -L follow redirect
- Prisma DIRECT_URL
- Edge 미적용 분기
- 로컬 build 한계 (큰 lib)
- 캐시 / revalidate 최적화

## 5. 모니터링
- Vercel Analytics (INFRA-005 후속)
- 함수 호출 수 / 지속시간 / 에러율
```

### 4.9 `308-rate-limit-and-error-handling-rules`

```
# Rate Limit + Error Handling Rules

## 1. lib/ratelimit.ts 사용
- sliding window (글로벌 + 사용자별)
- checkRateLimit (조회) → 호출 → recordCall (기록) 분리

## 2. Graceful Fallback
- RateLimitedError → SAFE_*_FALLBACK (사용자엔 일반 메시지)
- 절대 429 throw 금지 (UX 저해)

## 3. Server Action 에러 처리 패턴
try {
  ...
} catch (err) {
  if (err instanceof RateLimitedError) return SAFE_FALLBACK;
  if (err.message.includes("LLM_TIMEOUT")) return TIMEOUT_FALLBACK;
  console.error(err);  // 로그는 상세
  return GENERIC_ERROR;  // 사용자엔 일반화
}

## 4. 로깅 vs 노출
- console.error: 상세 (디버깅용)
- 클라이언트 반환: 일반화 (보안)

## 5. 모니터링 알림 (Phase 2 §E-2)
- Upstash Redis 적용 후 Slack 80% 임계 알림
```

---

## 5. 일정 / 작업 추정

| Phase | 작업 | 항목 수 | 추정 시간 |
|---|---|---|---|
| **5.1 즉시 정리 (P0)** | 11개 삭제 (옵션 B: `_archived/` 이동) | 11 | 5분 |
| | 9개 신규 스킬 작성 (P0 표시된 5개 우선) | 5 | 60분 |
| | 3개 modify (`101`, `304→310`, `306→311`) | 3 | 30분 |
| **5.2 1주 내 (P1)** | P1 신규 스킬 3개 (`305`, `306-playwright`, `307`) | 3 | 40분 |
| **5.3 후순위 (P2)** | P2 신규 스킬 1개 (`308`) | 1 | 15분 |
| **합계** | — | **23 항목** | **약 150분** |

---

## 6. 위험 / 결정 필요 사항

### 6.1 위험

| ID | 위험 | 영향 | 완화 |
|---|---|---|---|
| R1 | 11개 삭제 시 다른 프로젝트 참조용 가치 손실 | L | 옵션 B (_archived/ 이동) 채택 권장 |
| R2 | 스킬 번호 충돌 (현 304 + 신규 304 등) | M | 본 보고서 §3 의 번호 재배치 (310, 311) 채택 |
| R3 | 사용자가 신규 스킬 9개 작성 검토 부담 | M | P0 5개 먼저 → 검토 → P1 단계적 |
| R4 | Cursor IDE 가 변경된 룰을 즉시 인식 못 함 | L | IDE 재시작 또는 워크스페이스 리로드 |

### 6.2 결정 필요 사항

| # | 결정사항 | 옵션 / 추천 |
|---|---|---|
| D1 | 삭제 방식 | A. 폴더 완전 삭제 / **B. `_archived/` 이동 (추천)** / C. git rm + commit |
| D2 | 번호 충돌 해결 | **A. modified 의 번호를 310, 311 로 이동 (추천)** / B. 신규를 320+ 로 |
| D3 | 작업 순서 | **A. 본 보고서 § 5.1 (P0) 만 먼저 / 검토 → P1 (추천)** / B. 한 번에 23개 모두 |
| D4 | 메타 스킬 (`generate-cursor-rule`, `generate-tasks-from-srs`) 위치 | **A. `.cursor/skills/` 유지** (추천) / B. `.agents/workflows/` 로 이동 |
| D5 | `_archived/` 안 11개 폴더의 git tracking | **A. git rm 으로 history 만 보존 + working tree 제거 (추천, 디스크 절약)** / B. `_archived/` 그대로 commit (참고용 보존) |

---

## 7. 승인 게이트

| 단계 | 게이트 | 통과 조건 |
|---|---|---|
| **G0** | 본 보고서 검토 | 항목 추가/삭제 요청 0건 또는 반영 완료 |
| **G1** | §6.2 결정사항 5건 확정 | 사용자 답변 |
| **G2** | Phase 5.1 (P0) 완료 | 11 archived + 5 신규 + 3 modified |
| **G3** | Phase 5.2 (P1) 완료 | 3 신규 추가 |
| **G4** | Phase 5.3 (P2) 완료 | 1 신규 추가 |
| **G5** | 본 보고서 archive | tasks/06_*.md 에 "완료" 상태 |

---

## 8. 후속 / 연계 작업

1. **[05_AI_Harness_재정립_계획서.md](05_AI_Harness_재정립_계획서.md) 와 충돌 해소**
   - 05 계획서의 Phase 1 §5.2 항목 5 (`.claude/agents/speech-analysis.md`) 가 본 보고서의 304-ai-sdk-gemini-rules 와 중복 가능성 — agent vs skill 역할 분리 명확화 필요
2. **`.claude/skills/` 동기화**
   - canonical `.cursor/skills/` ↔ `.claude/skills/` 복사 룰 (05 보고서 §4.1 의 B 결정에 따라)
3. **메모리 갱신** (auto-memory 시스템)
   - "Speech-Therapy 백엔드 스택: Next.js Server Actions + Prisma 7 + Supabase + Gemini" 명시 reference 메모리
4. **README-cursor-harness.md 보강**
   - 본 변경 반영 (스킬 번호 체계 + 백엔드 스택 명시)

---

## 부록 A. 진행 보고 양식

본 보고서 검토 후 다음 양식으로 응답:

| 응답 | 액션 |
|---|---|
| **"추천 그대로 진행"** | §6.2 의 권장값 (`D1=B, D2=A, D3=A, D4=A, D5=A`) + Phase 5.1 즉시 진입 |
| **"D N 만 X 로"** (예: "D1 만 A 로") | 해당 결정 변경 후 진행 |
| **"P0 만 일단"** | 11 archived + 5 신규 + 3 modified 만 작업 후 검토 게이트 |
| **"보고서 06 archive, 다음 세션에"** | 본 sub-session 종료, 보고서만 보관 |
| **"§N 추가 설명 / 변경"** | 해당 섹션 보강 후 v1.1 재제출 |

---

**작성 완료**: 2026-05-16
**다음 액션**: 사용자 §6.2 결정사항 확정 → G1 통과 → Phase 5.1 (P0) 작업 시작
