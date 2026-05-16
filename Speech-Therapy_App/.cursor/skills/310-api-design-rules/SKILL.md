---
name: 310-api-design-rules
description: Speech-Therapy 의 외부 노출 API (Route Handlers) 디자인 표준. Server Actions 는 별도 (300).
---
Globs: app/api/**/*

# API Design Rules (Route Handlers)

> 우리의 주된 백엔드 entry point 는 **Server Actions** (`app/actions/**`) 이고, 본 룰은 **외부 노출이 필요한 Route Handlers** (`app/api/**/route.ts`) 에만 적용한다.
> Server Actions 디자인 패턴은 [300-nextjs-server-actions-rules](../300-nextjs-server-actions-rules/SKILL.md) 참조.

## 1. Route Handler 사용 기준 (Server Action 대신)

다음 경우에만 Route Handler 사용:
- 외부 시스템 / 웹훅 콜백 (예: Slack webhook 응답)
- 모니터링 / 헬스체크 (`/api/health`)
- 디버그 (`/api/debug/identity`, 운영 환경 게이트 필수)
- third-party 인증 콜백 (`/auth/callback` — Supabase 가 요구)

그 외 모든 mutation / query 는 **Server Action 우선**.

## 2. URL Naming

- 복수형 명사 (`/api/users`, `/api/evaluations`)
- kebab-case (`/api/reward-progress`)
- 동사 금지 (`/createUser` ❌)
- 버전 prefix 필요 시 `/api/v1/...` (현재 미사용)

## 3. HTTP Method

| Method | 의미 | Idempotent |
|---|---|---|
| `GET` | 조회 | ✅ |
| `POST` | 생성 | ❌ |
| `PUT` | 전체 교체 | ✅ |
| `PATCH` | 부분 수정 | ❌ (관례) |
| `DELETE` | 삭제 | ✅ |

## 4. JSON 응답 표준

### 4.1 Property Naming
- camelCase (`anonymousUserId`, `cumulativeStars`)
- 날짜: ISO-8601 (`yyyy-MM-dd'T'HH:mm:ss.SSSZ`)
- null 필드: 의미 없으면 omit, 의미 있으면 명시적 `null`

### 4.2 Envelope 패턴 (선택)

본 프로젝트는 모든 API 에 envelope 강제하지 않음 — 단순 endpoint 는 raw JSON 반환 가능.

복잡한 endpoint (`/api/debug/identity` 등) 는 다음 envelope:

```json
{
  "ok": true,
  "data": { ... },
  "error": null
}
```

또는:

```json
{
  "ok": false,
  "data": null,
  "error": { "code": "RATE_LIMITED", "message": "잠시 후 다시 시도해 주세요." }
}
```

## 5. Status Code

| Code | 사용 |
|---|---|
| 200 OK | 성공 (GET / PATCH) |
| 201 Created | 생성 성공 (POST) |
| 204 No Content | 본문 없는 성공 (DELETE) |
| 400 Bad Request | Zod 검증 실패 |
| 401 Unauthorized | 인증 토큰 없음/유효하지 않음 |
| 403 Forbidden | 권한 부족 |
| 404 Not Found | 리소스 없음 |
| 429 Too Many Requests | rate limit (`lib/ratelimit.ts`) |
| 500 Internal Server Error | 예상 못 한 오류 |

429 응답 시 `Retry-After` 헤더 포함 권장.

## 6. Route Handler 작성 패턴

```typescript
// app/api/health/route.ts
import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ ok: true, version: process.env.VERCEL_GIT_COMMIT_SHA });
}
```

```typescript
// app/api/debug/identity/route.ts
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  // 운영 환경 차단 게이트
  if (process.env.NODE_ENV === "production" && !process.env.DEBUG_ENABLED) {
    return NextResponse.json({ error: "Not Found" }, { status: 404 });
  }
  // ...
}
```

## 7. 안티패턴

- ❌ Route Handler 안에 비즈니스 로직 직접 작성 (lib 모듈로 분리)
- ❌ Route Handler 에서 Prisma 직접 호출 (lib 함수 경유)
- ❌ secret env var 를 응답에 노출
- ❌ `console.log` 로 사용자 입력 그대로 출력 (PII 누수 위험)

## See also

- [300-nextjs-server-actions-rules](../300-nextjs-server-actions-rules/SKILL.md) — 주된 백엔드 entry pattern
- [303-zod-schema-validation-rules](../303-zod-schema-validation-rules/SKILL.md) — 입력 검증
- [308 (Phase 2)-rate-limit-and-error-handling-rules](../) — 에러 graceful fallback
