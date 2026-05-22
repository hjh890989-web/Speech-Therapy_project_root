// SEC-003 — CSRF Origin / Referer 검증 헬퍼.
//
// 외부 도메인에서 POST 차단 1차 방어. proxy.ts 의 sameSite=lax cookie 가 GET 기반
// CSRF 를 막지만, fetch / form POST 는 cross-origin 으로 도달 가능 → Route Handler
// 단계에서 Origin 검증 추가 필수.
//
// 환경별 정책 (SEC-004 / MON-002 prefix 패턴 참고):
//  - production: 화이트리스트 엄격 — origin 불일치 시 차단
//  - preview: VERCEL_URL 동적 origin 허용 (preview 도메인 매번 변경)
//  - development: localhost:4000 / localhost:3000 통과 (편의)
//
// Origin 헤더가 null/누락 시 Referer 로 fallback (구형 브라우저 / Safari Cross-origin
// 일부 케이스). Referer 도 없으면 production 에서는 차단, dev/preview 통과 (보수적).
//
// 본 PR 범위 외:
//  - 정식 CSRF token (double-submit cookie) — 별도 task. Origin 검증 만으로 일반 폼
//    공격 표면 1차 차단. 권한 sensitive endpoint 는 후속 token 추가 검토.
//
// Refs: GitHub Issue #73 (SEC-003), REQ-NF-019 (RBAC + 보안).

const PROD_ALLOWED_ORIGINS = [
  // Vercel production deployment.
  "https://speech-therapy-project-root.vercel.app",
];

const DEV_ALLOWED_ORIGINS = [
  "http://localhost:4000",
  "http://localhost:3000",
  // 단위 테스트 (vitest) 가 만드는 Request 의 default origin.
  "http://localhost",
];

export type CsrfFailureReason =
  | "CSRF_ORIGIN_MISMATCH"
  | "CSRF_ORIGIN_MISSING";

export interface VerifyOriginResult {
  ok: boolean;
  reason?: CsrfFailureReason;
  /** 디버깅 — 실제 검증된 origin (Origin 헤더 우선, fallback Referer 의 origin). */
  observedOrigin?: string;
}

/// 환경 prefix — SEC-004 / MON-002 패턴.
/// 우선순위: VERCEL_ENV (production/preview/development) > NODE_ENV (test/development/production).
/// Vercel preview 환경은 NODE_ENV=production 으로 빌드되지만 VERCEL_ENV=preview 로 식별 가능 →
/// VERCEL_ENV 가 명시되면 그 값을 권위로 사용.
function isProduction(): boolean {
  if (process.env.VERCEL_ENV) {
    return process.env.VERCEL_ENV === "production";
  }
  return process.env.NODE_ENV === "production";
}

function isPreview(): boolean {
  return process.env.VERCEL_ENV === "preview";
}

/**
 * 허용 origin 집합 — 환경에 따라 동적 구성.
 *  - production: 하드코딩 prod origin 만
 *  - preview: VERCEL_URL (preview 도메인) + prod origin
 *  - development: dev origin + prod (편의)
 */
function getAllowedOrigins(): string[] {
  const allowed: string[] = [];
  if (isProduction()) {
    allowed.push(...PROD_ALLOWED_ORIGINS);
  } else if (isPreview()) {
    // Vercel preview 의 동적 도메인.
    if (process.env.VERCEL_URL) {
      allowed.push(`https://${process.env.VERCEL_URL}`);
    }
    allowed.push(...PROD_ALLOWED_ORIGINS);
  } else {
    // development.
    allowed.push(...DEV_ALLOWED_ORIGINS);
    allowed.push(...PROD_ALLOWED_ORIGINS);
  }
  return allowed;
}

/// Referer URL → origin 문자열 추출 (parse 실패 시 null).
function extractOriginFromReferer(referer: string | null): string | null {
  if (!referer) return null;
  try {
    const url = new URL(referer);
    return url.origin;
  } catch {
    return null;
  }
}

/**
 * Origin 헤더 (없으면 Referer fallback) 가 허용 화이트리스트에 있는지 검증.
 *
 * 정책 요약:
 *  - production: Origin null + Referer null → 차단 (CSRF_ORIGIN_MISSING)
 *                Origin / Referer 둘 다 화이트리스트 외 → 차단 (CSRF_ORIGIN_MISMATCH)
 *  - preview/dev: Origin null + Referer null → 통과 (편의; curl / Postman 호환)
 *                 화이트리스트 매칭 시 통과.
 */
export function verifyOrigin(request: Request): VerifyOriginResult {
  const origin = request.headers.get("Origin");
  const referer = request.headers.get("Referer");
  const allowed = getAllowedOrigins();

  // 1차: Origin 헤더 우선.
  if (origin) {
    if (allowed.includes(origin)) {
      return { ok: true, observedOrigin: origin };
    }
    return {
      ok: false,
      reason: "CSRF_ORIGIN_MISMATCH",
      observedOrigin: origin,
    };
  }

  // 2차: Origin null → Referer fallback.
  const refererOrigin = extractOriginFromReferer(referer);
  if (refererOrigin) {
    if (allowed.includes(refererOrigin)) {
      return { ok: true, observedOrigin: refererOrigin };
    }
    return {
      ok: false,
      reason: "CSRF_ORIGIN_MISMATCH",
      observedOrigin: refererOrigin,
    };
  }

  // 3차: 둘 다 없음 — production 만 강제 차단, dev/preview 는 통과.
  if (isProduction()) {
    return { ok: false, reason: "CSRF_ORIGIN_MISSING" };
  }
  return { ok: true };
}
