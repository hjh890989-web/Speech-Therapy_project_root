---
name: 304-ai-sdk-gemini-rules
description: @ai-sdk/google (Gemini) 호출 + 구조화 출력 + rate limit + graceful fallback.
---
Globs: lib/ai/**/*, app/actions/**/*

# AI SDK (Gemini) Rules

## 1. SDK 구성

```typescript
// lib/ai/gemini.ts
import { google } from "@ai-sdk/google";
import { generateObject, generateText } from "ai";
import { z } from "zod";
import { checkRateLimit, recordCall, RateLimitedError } from "@/lib/ratelimit";

const MODEL_NAME = "gemini-2.0-flash";  // 최신 안정 버전 고정
const TIMEOUT_MS = 8_000;
```

환경변수:
```
GOOGLE_GENERATIVE_AI_API_KEY=...
```

## 2. generateObject (구조화 출력) — 권장

```typescript
const evaluationSchema = z.object({
  encouragement: z.string().max(120),
  nextStep: z.string().max(120),
  parentTip: z.string().max(160),
});

export async function generateCushion(input: {
  userId: string;
  transcript: string;
  intendedWord: string;
}): Promise<z.infer<typeof evaluationSchema>> {
  await checkRateLimit({ userId: input.userId });

  try {
    const { object } = await generateObject({
      model: google(MODEL_NAME),
      schema: evaluationSchema,
      prompt: buildPrompt(input),
      abortSignal: AbortSignal.timeout(TIMEOUT_MS),
    });
    recordCall({ userId: input.userId });
    return object;
  } catch (err) {
    if (err instanceof RateLimitedError) throw err;
    if (err instanceof Error && err.name === "TimeoutError") {
      throw new Error("LLM_TIMEOUT");
    }
    console.error("Gemini failed:", err);
    return SAFE_CUSHION_FALLBACK;
  }
}
```

## 3. generateText (자유 텍스트) — 제한적 사용

구조화 schema 가 필요 없는 단순 텍스트 출력 시:

```typescript
const { text } = await generateText({
  model: google(MODEL_NAME),
  prompt: "...",
  maxTokens: 200,
  abortSignal: AbortSignal.timeout(TIMEOUT_MS),
});
```

대부분의 경우 generateObject 우선.

## 4. Rate Limiting (`lib/ratelimit.ts`)

### 4.1 정책 (Sprint 3 §2 E)

- **글로벌 RPM**: 14 (Google 무료 15 RPM 의 G5 가드레일)
- **사용자 일일**: 50회 (비용 가드레일, REQ-NF-018)
- 알고리즘: sliding window in-memory `Map`

### 4.2 호출 패턴 (check → call → record)

```typescript
await checkRateLimit({ userId });       // 실패 시 RateLimitedError throw
const result = await generateObject({ ... });
recordCall({ userId });                  // 성공 후에만 카운트
```

실패한 호출은 카운트하지 않음 (재시도 권리 보장).

### 4.3 graceful fallback

```typescript
// Server Action 측
try {
  return await generateCushion({ userId, transcript });
} catch (err) {
  if (err instanceof RateLimitedError) {
    console.warn(`rate limited: ${err.reason}, retry after ${err.retryAfterSec}s`);
    return SAFE_CUSHION_FALLBACK;  // 사용자엔 일반 안내
  }
  throw err;
}
```

⚠️ 절대 429 직접 throw 금지 (UX 저해) — 항상 SAFE_FALLBACK 반환.

## 5. 프롬프트 작성 지침 (CON-04 준수)

### 5.1 금칙어 회피

프롬프트에 "치료", "진단", "장애" 절대 사용 금지:

```typescript
// ❌ BAD
const prompt = `아이의 발음 장애를 진단해 주세요.`;

// ✅ GOOD
const prompt = `아이의 발음 발달을 부모님에게 안내해 주세요. 의료적 판단은 하지 마세요.`;
```

### 5.2 모델 출력 검증

응답에 금칙어 포함 가능성 — `lib/banned-words.ts` 또는 generateObject 의 schema refine 으로 차단:

```typescript
const safeText = z.string().refine(
  (s) => !["치료", "진단", "장애"].some((w) => s.includes(w)),
  "금칙어 포함"
);
```

### 5.3 한국어 톤

- 부모에게 친근한 존댓말 ("~해 주세요", "~해 볼까요?")
- 의료 전문 용어 회피 ("음소" → "소리", "조음" → "발음")

## 6. 비용 / 토큰 관리

- 입력 토큰 1000자 제한 권장 (transcript 길이 등)
- Phase 2 (§E-2): Upstash Redis 어댑터로 토큰 단위 집계 + Slack 80% 임계 알림

## 7. 에러 → 사용자 카피 매핑

| 에러 | 카피 |
|---|---|
| `RateLimitedError` | 사용자엔 SAFE_FALLBACK (rate limit 사실 미노출) |
| `LLM_TIMEOUT` | "분석에 시간이 오래 걸려요. 잠시 후 다시 시도해 주세요." |
| `GOOGLE_GENERATIVE_AI_API_KEY` 미설정 | "AI 분석 서비스 설정이 누락되었어요." |
| 그 외 | "일시적인 오류가 발생했어요." |

## 8. 안티패턴

- ❌ `checkRateLimit` 없이 호출 → 비용 폭주 위험
- ❌ `recordCall` 을 try 블록 밖에 두기 → 실패 호출도 카운트 (UX 저해)
- ❌ generateObject 의 schema 없이 raw text parse — JSON 깨짐 위험
- ❌ 사용자 입력을 그대로 prompt 에 합치기 → prompt injection 위험. 구분자 / 인용 처리

## See also

- [300-nextjs-server-actions-rules](../300-nextjs-server-actions-rules/SKILL.md) — Server Action 의 try/catch graceful fallback
- [303-zod-schema-validation-rules](../303-zod-schema-validation-rules/SKILL.md) — generateObject schema
- 본 프로젝트 `lib/ai/gemini.ts` — 실제 구현
- 본 프로젝트 `lib/ratelimit.ts` — sliding window
