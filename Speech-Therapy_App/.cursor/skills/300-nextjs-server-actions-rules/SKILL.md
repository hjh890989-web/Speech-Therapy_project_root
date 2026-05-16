---
name: 300-nextjs-server-actions-rules
description: Speech-Therapy 의 백엔드 entry point — Server Actions 디자인 / 작성 / 에러 처리.
---
Globs: app/actions/**/*, app/**/page.tsx

# Next.js 16 Server Actions Rules

> Speech-Therapy 의 mutation / query 대부분이 Server Actions 으로 처리된다. REST API 가 아니다 (외부 노출 X). [310-api-design-rules](../310-api-design-rules/SKILL.md) 와 구분.

## 1. 정의 / 위치

### 1.1 디렉티브
- 파일 최상단 `"use server"` (파일 단위) — 권장 (모든 export 가 Server Action)
- 또는 함수 단위 `"use server"` (혼합 가능)

### 1.2 위치 패턴
- **`app/actions/<domain>.ts`** (집중 패턴, 권장) — 예: `app/actions/diagnosis.ts`, `app/actions/cushion.ts`
- 또는 page-local (`app/<route>/actions.ts`) — 단일 페이지 전용일 때만

## 2. 작성 표준 패턴

```typescript
// app/actions/diagnosis.ts
"use server";

import { revalidatePath } from "next/cache";
import { diagnosisInputSchema } from "@/lib/schemas/diagnosis";
import { computeAcousticScore } from "@/lib/acoustic-score";
import { computeLinguisticScore } from "@/lib/linguistic-score";
import { generateCushion } from "@/lib/ai/gemini";
import { prisma } from "@/lib/db";

export async function analyzeDiagnosis(rawInput: unknown) {
  // 1) 입력 검증 (필수)
  const input = diagnosisInputSchema.parse(rawInput);

  try {
    // 2) 도메인 로직 (lib 위임)
    const acoustic = computeAcousticScore(input);
    const linguistic = computeLinguisticScore(input.intendedWord, input.transcript, input.sttConfidence);

    // 3) DB 저장 (트랜잭션 권장)
    const session = await prisma.sessionLog.create({
      data: {
        userId: input.anonymousUserId ?? input.userId,
        evaluations: {
          create: {
            acoustic, linguistic,
            acousticFeatures: input.acousticFeatures ?? undefined,  // JSON 컬럼 NULL 안전
          },
        },
      },
      include: { evaluations: true },
    });

    // 4) 캐시 무효화
    revalidatePath("/rewards");

    return { sessionId: session.id };
  } catch (err) {
    // 5) graceful fallback
    console.error("analyzeDiagnosis failed", err);
    throw new Error("INTERNAL_ERROR");  // 클라이언트엔 일반화
  }
}
```

## 3. 입력 검증 (필수)

- 모든 Server Action 첫 줄: Zod schema 로 입력 parse
- failure → throw (Server Action 은 throw 시 클라이언트에 일반 Error 로 전달)
- 사용자 표시 메시지는 catch 측에서 처리 (Server Action 자체는 안전한 코드 throw)

상세: [303-zod-schema-validation-rules](../303-zod-schema-validation-rules/SKILL.md)

## 4. 에러 처리

### 4.1 에러 코드 컨벤션

| Error message | 사용자 카피 |
|---|---|
| `VALIDATION_ERROR` | "입력 정보를 다시 확인해 주세요." |
| `RATE_LIMITED` | "잠시 후 다시 시도해 주세요." |
| `LLM_TIMEOUT` | "분석에 시간이 오래 걸려요. 잠시 후 다시." |
| `GOOGLE_GENERATIVE_AI_API_KEY` | "AI 분석 서비스 설정이 누락되었어요." |
| `INTERNAL_ERROR` | "일시적인 오류가 발생했어요." |

### 4.2 graceful fallback 패턴

```typescript
try {
  return await generateCushion({ userId, transcript });
} catch (err) {
  if (err instanceof RateLimitedError) {
    return SAFE_CUSHION_FALLBACK;  // 사용자에겐 일반 안내 카피
  }
  throw err;  // 그 외는 상위로
}
```

상세: [304-ai-sdk-gemini-rules](../304-ai-sdk-gemini-rules/SKILL.md) §4

## 5. 캐시 / Revalidation

mutation 직후 영향 받는 경로 명시:

```typescript
revalidatePath("/rewards");          // 특정 경로
revalidateTag("user-rewards");        // tag 기반 (fetch 의 tags 옵션과 매칭)
```

읽기 전용 Server Action 은 revalidate 불필요.

## 6. 보안

- ❌ secret env var 를 return value 에 포함 금지
- ❌ Server Action 안에서 클라이언트 React hook (`useState` 등) 호출 시도 금지
- ✅ `cookies()` / `headers()` 로 인증/세션 컨텍스트 추출 가능
- ✅ Prisma RLS / 사용자 ID 격리 강제

## 7. 클라이언트 호출 패턴

```typescript
// Client Component
"use client";
import { analyzeDiagnosis } from "@/app/actions/diagnosis";

async function onSubmit() {
  try {
    const result = await analyzeDiagnosis(formData);
    router.push(`/diagnose/result/${result.sessionId}`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("VALIDATION_ERROR")) setError("입력 정보 다시 확인해 주세요.");
    else setError("일시적인 오류가 발생했어요.");
  }
}
```

## 8. 안티패턴

- ❌ Server Action 안에 lib 도메인 로직 inline (100+줄) → lib 추출
- ❌ Server Action return value 에 Prisma Entity 그대로 (직렬화 안 됨, BigInt/Decimal 등) → 명시 변환
- ❌ Server Action 안에서 `useState` / `useRouter` 호출 — 서버 측이라 무효
- ❌ Zod parse 생략 — 무검증 입력은 SQL injection / NoSQL injection 위험

## See also

- [301-prisma-postgres-rules](../301-prisma-postgres-rules/SKILL.md) — DB 측
- [303-zod-schema-validation-rules](../303-zod-schema-validation-rules/SKILL.md) — 입력 검증
- [304-ai-sdk-gemini-rules](../304-ai-sdk-gemini-rules/SKILL.md) — AI 호출 패턴
- [311-nextjs-layered-architecture-rules](../311-nextjs-layered-architecture-rules/SKILL.md) — 레이어 책임 분리
