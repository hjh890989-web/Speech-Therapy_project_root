---
name: 303-zod-schema-validation-rules
description: Zod 4 스키마 작성 + 검증 표준 — Server Action 입력 / Route Handler 입력 / 환경변수 검증.
---
Globs: lib/schemas/**/*, app/actions/**/*, app/api/**/*

# Zod Schema Validation Rules

## 1. 스키마 위치

- 도메인별로 `lib/schemas/<domain>.ts` 에 집중:
  - `lib/schemas/diagnosis.ts` — 진단 입력
  - `lib/schemas/auth.ts` — 인증 입력 (필요 시)
  - `lib/schemas/reward.ts` — 별 적립 등
- inline 스키마는 단순한 1회용에만 (재사용 시 lib/schemas 로 추출)

## 2. 작성 패턴

```typescript
// lib/schemas/diagnosis.ts
import { z } from "zod";

export const acousticFeaturesSchema = z.object({
  pitchMean: z.number().nullable(),
  pitchStd: z.number().nullable(),
  durationSec: z.number().nullable(),
  energy: z.number().nullable(),
}).nullable().optional();

export const diagnosisInputSchema = z.object({
  intendedWord: z.string().min(1, "단어를 선택해 주세요."),
  transcript: z.string().min(1, "발화 결과가 비어 있어요."),
  childAgeMonths: z.number().int().min(24).max(84),
  targetPhoneme: z.enum(["ㄱ", "ㄴ", "ㅅ", "ㅈ", "ㄹ"]),
  anonymousUserId: z.string().uuid().optional(),
  acousticFeatures: acousticFeaturesSchema,
  sttConfidence: z.number().min(0).max(1).nullable().optional(),
});

export type DiagnosisInput = z.infer<typeof diagnosisInputSchema>;
```

## 3. `parse` vs `safeParse`

| 메서드 | 실패 시 | 사용 위치 |
|---|---|---|
| `parse` | throw `ZodError` | **Server Action** (throw → 클라이언트 일반 에러) |
| `safeParse` | `{ success: false, error }` 반환 | **Route Handler** (구조화 응답 필요) |

```typescript
// Server Action
const input = diagnosisInputSchema.parse(rawInput);  // 실패 → throw

// Route Handler
const parsed = diagnosisInputSchema.safeParse(rawInput);
if (!parsed.success) {
  return NextResponse.json({ ok: false, error: parsed.error.flatten() }, { status: 400 });
}
```

## 4. 변환 (`transform`) vs 검증 (`refine`)

- **`transform`** — 데이터 형변환 (string → number, ISO → Date)
- **`refine`** — 비즈니스 규칙 검증 (이메일 도메인 화이트리스트 등)

```typescript
// transform
const numericString = z.string().transform((val, ctx) => {
  const n = Number(val);
  if (Number.isNaN(n)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "숫자가 아님" });
    return z.NEVER;
  }
  return n;
});

// refine
const emailWhitelist = z.string().email().refine(
  (email) => email.endsWith("@example.com"),
  "허용된 도메인이 아닙니다."
);
```

## 5. 옵셔널 / Nullable / Nullish

| 메서드 | 의미 | 예시 |
|---|---|---|
| `.optional()` | 키 자체 없음 가능 (undefined OK) | `{}` 또는 `{ a: undefined }` |
| `.nullable()` | 키 있고 null 가능 | `{ a: null }` |
| `.nullish()` | 위 둘 다 | `{}` 또는 `{ a: null }` 또는 `{ a: undefined }` |

```typescript
z.object({
  required: z.string(),
  maybeEmpty: z.string().optional(),    // key 없을 수 있음
  explicitNull: z.string().nullable(),   // null 가능
  both: z.string().nullish(),            // 둘 다
});
```

## 6. TypeScript 타입 추출

```typescript
const schema = z.object({ id: z.string().uuid() });
type Schema = z.infer<typeof schema>;  // { id: string }
```

직접 `interface` 정의보다 `z.infer` 권장 (single source of truth).

## 7. 에러 메시지 (한국어)

```typescript
z.string().min(1, "값을 입력해 주세요.")
z.string().email("올바른 이메일 형식이 아니에요.")
z.number().min(0, "0 이상이어야 해요.")
```

기본 영문 메시지 그대로 노출 금지 — 사용자에게 친화적 한국어로.

## 8. 환경변수 검증 (선택)

부팅 시 필수 env var 검증:

```typescript
// lib/env.ts
import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  DIRECT_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  GOOGLE_GENERATIVE_AI_API_KEY: z.string().min(1),
});

export const env = envSchema.parse(process.env);
```

⚠️ 클라이언트에서 import 시 `NEXT_PUBLIC_*` 만 노출 (빌드타임에 inline).

## 9. 안티패턴

- ❌ `z.any()` / `z.unknown()` 남용 (검증 회피)
- ❌ 모든 필드 `.optional()` 처리 (실제로 필수면 명시)
- ❌ Server Action 의 첫 줄에 `parse` 생략 → 무검증 입력 위험
- ❌ Zod 스키마 + 별도 TypeScript interface 이중 정의 (sync drift)

## See also

- [300-nextjs-server-actions-rules](../300-nextjs-server-actions-rules/SKILL.md) — Server Action 의 첫 줄 parse 패턴
- [310-api-design-rules](../310-api-design-rules/SKILL.md) — Route Handler 의 safeParse 패턴
