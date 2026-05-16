---
name: 302-supabase-auth-ssr-rules
description: Supabase Auth (Magic Link + OAuth) + @supabase/ssr PKCE cookies 패턴.
---
Globs: lib/supabase/**/*, app/auth/**/*, app/(public)/login/**/*, proxy.ts

# Supabase Auth (SSR) Rules

## 1. 두 클라이언트 분리 (필수)

### 1.1 Browser Client (Client Component 전용)

```typescript
// lib/supabase/client.ts
"use client";
import { createBrowserClient } from "@supabase/ssr";

export function getSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: readAllCookiesFromDocument,
        setAll(cookiesToSet) { /* document.cookie 에 write */ },
      },
    }
  );
}
```

### 1.2 Server Client (Server Component / Route Handler)

```typescript
// lib/supabase/server.ts
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function getSupabaseServerClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        },
      },
    }
  );
}
```

⚠️ Client Component 에서 server.ts import 금지 / 반대도 금지.

## 2. PKCE Flow 필수 설정 (2026-05-15 핫픽스 학습)

`createBrowserClient` 가 옵션 미지정 시 PKCE verifier 를 localStorage 에 저장하는 경우가 있어 server callback 의 `exchangeCodeForSession` 이 검출 실패.

**해결**: 명시적 `cookies` 어댑터를 client 와 server 양쪽에 모두 명시 (위 1.1, 1.2 참조).

cookie 옵션:
- `sameSite: "lax"` (기본) — top-level navigation 시 전송 필요
- `secure: true` (HTTPS 환경) — 프로덕션 필수

## 3. Magic Link 흐름

### 3.1 발송 (Client Component)

```typescript
const supabase = getSupabaseBrowserClient();
const origin = window.location.origin;
const { error } = await supabase.auth.signInWithOtp({
  email,
  options: {
    emailRedirectTo: `${origin}/auth/callback`,
  },
});
```

### 3.2 콜백 처리 (Route Handler)

```typescript
// app/auth/callback/route.ts
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  if (!code) return NextResponse.redirect(`${origin}/login?error=missing_code`);

  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error.message)}`);
  }

  // Prisma User upsert + 익명 → 인증 마이그레이션
  // ...

  return NextResponse.redirect(`${origin}/rewards`);
}
```

## 4. Google OAuth 흐름

```typescript
// Client Component
const supabase = getSupabaseBrowserClient();
await supabase.auth.signInWithOAuth({
  provider: "google",
  options: { redirectTo: `${origin}/auth/callback` },
});
// 브라우저 자동 Google 동의 화면 → 인증 → /auth/callback?code=...
// 같은 callback 라우트로 처리 (Magic Link + OAuth code 둘 다 `exchangeCodeForSession` 가 추상화)
```

### 4.1 Google Cloud Console 설정 필수
- OAuth 동의 화면 ("브랜딩" + "대상") 완료
- OAuth Client ID (웹 애플리케이션)
  - 승인된 자바스크립트 원본: 본 앱 URL
  - 승인된 리디렉션 URI: **`https://<project-ref>.supabase.co/auth/v1/callback`** (앱이 아닌 Supabase 콜백!)

### 4.2 Supabase Dashboard 설정 필수
- Authentication → Sign In / Providers → Google → Enable
- Client ID + Client Secret 입력 (양쪽 끝 잘림 없는지 확인)
- URL Configuration → Site URL + Redirect URLs 등록

## 5. 익명 → 인증 마이그레이션

콜백 라우트에서:

```typescript
const cookieStore = await cookies();
const anonymousUserId = cookieStore.get(ANONYMOUS_USER_COOKIE)?.value;
if (anonymousUserId && anonymousUserId !== authUserId) {
  // SessionLog / EvaluationResult / RewardLog: 단순 userId 갱신
  await prisma.$transaction([
    prisma.sessionLog.updateMany({ where: { userId: anonymousUserId }, data: { userId: authUserId } }),
    prisma.evaluationResult.updateMany({ where: { userId: anonymousUserId }, data: { userId: authUserId } }),
    prisma.rewardLog.updateMany({ where: { userId: anonymousUserId }, data: { userId: authUserId } }),
  ]);
  // RewardProgress (@unique userId): 충돌 시 합산 후 익명 row 삭제
  // ...
}
```

## 6. anonymous_user_id 패턴 (Sprint 2 §3, §4)

### 6.1 권위 방향: localStorage > cookie

- `localStorage["anonymousUserId"]` 가 권위
- `cookie["anonymous_user_id"]` 는 sync 본 (iOS ITP 우회용 server-side 발급)
- proxy.ts (구 middleware) 에서 cookie 없으면 새로 발급

### 6.2 hook 패턴 (`useAnonymousUserId`)

```typescript
// 1순위: localStorage
// 2순위: cookie (없으면 발급 + localStorage 도 sync)
```

## 7. 보안

- ❌ `ANON_KEY` 외에 `SERVICE_ROLE_KEY` 를 클라이언트에 노출 금지
- ❌ server.ts import 를 Client Component 에서 시도 금지 (빌드 실패 또는 secret 누수)
- ✅ RLS (Row Level Security) 정책 Supabase Dashboard 에서 설정 (Phase 1)

## 8. 안티패턴

- ❌ `createClient` (구 `@supabase/supabase-js`) 직접 사용 — SSR 환경에서 cookie sync 안 됨
- ❌ PKCE 옵션 미지정 → verifier localStorage 저장 → server callback 실패
- ❌ Magic Link / OAuth 콜백 코드 분리 (둘 다 같은 `/auth/callback` 으로)

## See also

- [300-nextjs-server-actions-rules](../300-nextjs-server-actions-rules/SKILL.md) — Server Action 안에서 인증 컨텍스트
- [301-prisma-postgres-rules](../301-prisma-postgres-rules/SKILL.md) — User upsert
- 대화기록 §13 (2026-05-15) — PKCE 핫픽스 학습
