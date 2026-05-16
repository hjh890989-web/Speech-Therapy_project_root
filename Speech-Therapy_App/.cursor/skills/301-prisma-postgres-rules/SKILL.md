---
name: 301-prisma-postgres-rules
description: Prisma 7 + PostgreSQL (Supabase 호스팅) 데이터 액세스 표준.
---
Globs: prisma/**/*, lib/db.ts, lib/**/*.ts, app/**/*.ts

# Prisma 7 + PostgreSQL Rules

## 1. PrismaClient 인스턴스 (단일 + HMR 안전)

```typescript
// lib/db.ts
import { PrismaClient } from "@/app/generated/prisma";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    // log: ["query"], // 디버그 시 활성화
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
```

⚠️ 컴포넌트나 Server Action 에서 직접 `new PrismaClient()` 생성 절대 금지 (Vercel serverless 환경에서 connection pool 폭주).

## 2. DATABASE_URL vs DIRECT_URL

Supabase + PgBouncer 환경:

```
DATABASE_URL=postgresql://...?pgbouncer=true&connection_limit=1
DIRECT_URL=postgresql://...                  # PgBouncer 우회
```

- 런타임 쿼리: `DATABASE_URL` (PgBouncer 풀러)
- Migration: `DIRECT_URL` (`prisma migrate` 가 prepared statement 필요)
- `schema.prisma` 의 `datasource` 블록에 둘 다 명시:
```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}
```

## 3. JSON 컬럼 (Prisma 제약)

PostgreSQL `JSONB` 컬럼 사용 시:

### 3.1 `null` 대입 제약

Prisma 는 JSON 컬럼에 `null` 직접 대입 불가:

```typescript
// ❌ BAD
await prisma.evaluationResult.create({
  data: { acousticFeatures: null }  // 타입 에러
});

// ✅ GOOD — `?? undefined` 패턴 (DB 컬럼 nullable 시 NULL 로 저장됨)
await prisma.evaluationResult.create({
  data: { acousticFeatures: input.acousticFeatures ?? undefined }
});

// ✅ GOOD — 명시적 Prisma.JsonNull
import { Prisma } from "@/app/generated/prisma";
await prisma.evaluationResult.create({
  data: { acousticFeatures: Prisma.JsonNull }
});
```

### 3.2 타입 안정성

```typescript
// schema 에서 JSON 컬럼 정의
model EvaluationResult {
  acousticFeatures Json?  // nullable JSONB
}

// 사용 시 zod 또는 TS 타입으로 좁히기
const features = result.acousticFeatures as { pitchMean: number; ... } | null;
```

## 4. Migration 흐름

### 4.1 로컬 개발

```powershell
# schema.prisma 수정 후
npx prisma migrate dev --name add_acoustic_features
# → prisma/migrations/<timestamp>_add_acoustic_features/migration.sql 생성
# → 로컬 DB 자동 적용
# → prisma generate (PrismaClient 갱신)
```

### 4.2 Production (Vercel Hobby 제약)

Vercel build 환경은 READ ONLY → `prisma migrate deploy` 자동 실행 불가.

**수동 적용 절차**:
1. PR 머지 후 Vercel 배포 완료 대기
2. Supabase Studio → SQL Editor 열기
3. `prisma/migrations/<timestamp>/migration.sql` 내용을 그대로 붙여넣기
4. Run → 적용 확인 (`information_schema.columns` 등)

⚠️ 미적용 상태로 새 코드 배포 시 런타임 오류 → 배포와 SQL 적용 동시 진행 필수.

## 5. 쿼리 패턴

### 5.1 Nested write (트랜잭션 자동)

```typescript
const session = await prisma.sessionLog.create({
  data: {
    userId,
    targetPhoneme: "ㅅ",
    evaluations: {
      create: { acoustic, linguistic, acousticFeatures: features ?? undefined },
    },
  },
  include: { evaluations: true },
});
```

### 5.2 트랜잭션 (Interactive)

```typescript
const result = await prisma.$transaction(async (tx) => {
  const session = await tx.sessionLog.create({ ... });
  await tx.rewardLog.create({ data: { userId, stars: 3 } });
  return session;
});
```

### 5.3 Upsert (충돌 회피)

```typescript
await prisma.rewardProgress.upsert({
  where: { userId },
  create: { userId, cumulativeStars: stars },
  update: { cumulativeStars: { increment: stars } },
});
```

### 5.4 N+1 회피

```typescript
// ❌ BAD — N+1
const users = await prisma.user.findMany();
for (const u of users) {
  const rewards = await prisma.rewardLog.findMany({ where: { userId: u.id } });
}

// ✅ GOOD — include
const users = await prisma.user.findMany({
  include: { rewardLogs: true },
});
```

## 6. 페이지네이션

- 짧은 목록: `skip` + `take`
- 무한 스크롤 / 큰 목록: cursor 기반
```typescript
const items = await prisma.evaluationResult.findMany({
  take: 20,
  cursor: lastId ? { id: lastId } : undefined,
  skip: lastId ? 1 : 0,
  orderBy: { createdAt: "desc" },
});
```

## 7. 데이터 격리 (REQ-NF-SEC)

모든 사용자 데이터 쿼리에 `userId` 또는 `anonymousUserId` 필수:

```typescript
// ❌ BAD — 모든 사용자 데이터 조회
const all = await prisma.evaluationResult.findMany();

// ✅ GOOD — 사용자 격리
const mine = await prisma.evaluationResult.findMany({
  where: { sessionLog: { userId } },
});
```

## 8. 성능 모니터링

- 느린 쿼리: `log: ["query"]` 활성화 후 100ms+ 쿼리 발견 시 인덱스 추가
- Supabase Studio → Performance 탭에서 slow query 확인

## 9. Migration 명명 컨벤션

```
prisma/migrations/<YYYYMMDDHHMMSS>_<snake_case_summary>/migration.sql
```

예: `20260515120000_add_acoustic_features`

## See also

- [300-nextjs-server-actions-rules](../300-nextjs-server-actions-rules/SKILL.md) — DB 호출 측
- [311-nextjs-layered-architecture-rules](../311-nextjs-layered-architecture-rules/SKILL.md) — 단일 PrismaClient 룰
