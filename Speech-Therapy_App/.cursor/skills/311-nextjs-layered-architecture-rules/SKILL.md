---
name: 311-nextjs-layered-architecture-rules
description: Speech-Therapy 의 Next.js 16 layered architecture (RSC / Server Action / lib / Prisma).
---
Globs: app/**/*, lib/**/*, prisma/**/*

# Next.js Layered Architecture Rules

## 1. Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│  Client Component Layer (app/**/*.tsx "use client") │  ← Browser
│  - React hooks (useSpeechRecognition 등)            │
│  - User interaction / DOM                            │
│  - NEVER imports server-only modules                 │
└──────────────┬──────────────────────────────────────┘
               │ Server Action 호출 또는 fetch
               ▼
┌─────────────────────────────────────────────────────┐
│  Server Component Layer (app/**/page.tsx, RSC)      │  ← Server-side render
│  - 데이터 사전 페치 (Prisma lib 경유)                │
│  - 인증 가드 (auth helper)                            │
│  - HTML 조립 후 클라이언트 hydrate                    │
└──────────────┬──────────────────────────────────────┘
               │ lib/* 함수 호출
               ▼
┌─────────────────────────────────────────────────────┐
│  Server Action Layer (app/actions/**/*.ts)          │  ← Backend "endpoint"
│  - "use server" 디렉티브 필수                         │
│  - Zod 검증 → lib 위임 → revalidate                  │
│  - 에러 graceful fallback                             │
└──────────────┬──────────────────────────────────────┘
               │ lib/* 함수 호출
               ▼
┌─────────────────────────────────────────────────────┐
│  Lib Layer (lib/**/*.ts)                            │  ← 도메인 로직
│  - 비즈니스 규칙 (lib/acoustic-score, linguistic)     │
│  - 외부 API 통합 (lib/ai/gemini, lib/supabase)        │
│  - rate limit (lib/ratelimit)                         │
│  - Prisma client wrapping                             │
└──────────────┬──────────────────────────────────────┘
               │ Prisma Client
               ▼
┌─────────────────────────────────────────────────────┐
│  Data Access Layer (lib/db.ts → Prisma Client)      │  ← ORM
│  - 단일 PrismaClient 인스턴스 (HMR 안전)              │
│  - 트랜잭션 (prisma.$transaction)                     │
└──────────────┬──────────────────────────────────────┘
               │ SQL via @prisma/adapter-pg
               ▼
┌─────────────────────────────────────────────────────┐
│  PostgreSQL (Supabase 호스팅)                        │
└─────────────────────────────────────────────────────┘
```

## 2. Layer 책임

### 2.1 Client Component (`"use client"`)

- ✅ React 상태 / 이벤트 / hook 사용
- ✅ Server Action 호출 (직접 import)
- ❌ Prisma / 서버 secret env / `next/headers` 사용 금지
- ❌ Server Component import 금지 (Server Action 만 허용)

### 2.2 Server Component (RSC, 기본값)

- ✅ async/await 직접 사용
- ✅ `lib/db.ts` 의 `prisma` import 가능
- ✅ `cookies()`, `headers()`, `redirect()` 사용 가능
- ❌ `useState`, `useEffect` 같은 React hook 사용 금지

### 2.3 Server Action (`"use server"`)

- ✅ mutation / query 모두 가능
- ✅ Zod 입력 검증 필수 (첫 줄)
- ✅ 종료 시 `revalidatePath` / `revalidateTag` 호출 (캐시 갱신)
- ✅ 에러 catch 후 graceful fallback 반환 (사용자에겐 일반화 메시지)
- ❌ secret env var 를 return value 에 노출 금지

상세: [300-nextjs-server-actions-rules](../300-nextjs-server-actions-rules/SKILL.md)

### 2.4 Lib Layer

- ✅ 도메인 함수 (pure 또는 side-effect 명시)
- ✅ Prisma client 사용 가능
- ✅ 외부 API 호출 가능
- ❌ HTTP 객체 (Request/Response) 직접 사용 금지
- ❌ React 의존성 금지

### 2.5 Data Access (Prisma)

- ✅ `lib/db.ts` 한 곳에서 PrismaClient 인스턴스 생성 + export
- ❌ 컴포넌트나 Server Action 에서 직접 `new PrismaClient()` 생성 금지 (connection pool 폭주)

상세: [301-prisma-postgres-rules](../301-prisma-postgres-rules/SKILL.md)

## 3. 데이터 흐름 패턴

### 3.1 Mutation (Client → Server Action → DB)

```
Client Component ("use client")
    ↓ Server Action import + 호출
Server Action ("use server")
    ↓ Zod parse
    ↓ lib 도메인 함수 호출
Lib (lib/*.ts)
    ↓ prisma.<model>.create/update
Prisma → PostgreSQL
    ↓ 결과 반환
Server Action
    ↓ revalidatePath
    ↓ return value
Client Component → UI 갱신
```

### 3.2 Query (RSC → Lib → DB)

```
Server Component (async page.tsx)
    ↓ lib 함수 호출
Lib (lib/*.ts)
    ↓ prisma.<model>.findMany
Prisma → PostgreSQL
    ↓ 결과 반환
Lib → 가공 후 반환
RSC → HTML 생성 → 브라우저
```

## 4. 변환 책임

- Client ↔ Server Action: TypeScript 타입 그대로 (직렬화 가능 객체만)
- Server Action ↔ Lib: 도메인 타입 그대로
- Lib ↔ Prisma: Prisma 생성 타입 사용 (`Prisma.<Model>GetPayload<...>`)

별도 DTO mapping 레이어 불필요 (Spring 의 Entity↔DTO 변환 패턴 X).

## 5. 트랜잭션

- Lib 함수에서 `prisma.$transaction([...])` 또는 interactive `prisma.$transaction(async (tx) => {...})`
- Server Action 또는 RSC 가 트랜잭션 직접 관리 금지 (lib 위임)

## 6. 안티패턴

```typescript
// ❌ BAD: Client Component 에서 Prisma 직접 import
"use client";
import { prisma } from "@/lib/db";  // 컴파일 실패 또는 런타임 오류

// ❌ BAD: Server Action 에서 비즈니스 로직 inline
"use server";
export async function analyzeDiagnosis(input: unknown) {
  // 100줄짜리 acoustic-score 계산 inline...  → lib/acoustic-score.ts 로 추출 필수
}

// ❌ BAD: lib 안에서 React hook
// lib/something.ts
import { useState } from "react"; // React 의존성 금지

// ❌ BAD: Route Handler 에서 비즈니스 로직 직접
// app/api/diagnose/route.ts
export async function POST(req: Request) {
  const data = await req.json();
  // 비즈니스 로직 inline...  → Server Action 또는 lib 함수로 위임
}
```

## 7. 폴더 구조 (현재)

```
app/
├── (public)/                  # Route group (인증 불필요)
│   ├── diagnose/              # 진단 페이지 (Client form)
│   ├── login/                 # 로그인 페이지
│   └── rewards/               # 별 누적 페이지 (RSC)
├── actions/                   # Server Actions
│   ├── diagnosis.ts
│   └── cushion.ts
├── api/                       # Route Handlers
│   ├── debug/identity/
│   └── health/
├── auth/callback/             # OAuth/Magic Link 콜백
└── generated/prisma/          # Prisma Client (생성됨)

lib/
├── ai/gemini.ts               # Gemini SDK wrapper
├── audio/analyzer.ts          # Web Audio capture
├── hooks/*.ts                 # Client Component hooks
├── schemas/*.ts               # Zod schemas
├── supabase/{client,server}.ts
├── acoustic-score.ts
├── linguistic-score.ts
├── ratelimit.ts
├── anonymous-user.ts
└── db.ts                      # PrismaClient 단일 인스턴스
```

## See also

- [300-nextjs-server-actions-rules](../300-nextjs-server-actions-rules/SKILL.md)
- [301-prisma-postgres-rules](../301-prisma-postgres-rules/SKILL.md)
- [302-supabase-auth-ssr-rules](../302-supabase-auth-ssr-rules/SKILL.md)
