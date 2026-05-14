// Sprint 2 §4 hotfix — anonymous_user_id cookie 이름 server-safe export.
//
// 이전: useAnonymousUserId.ts ("use client") 에서 export 됐는데,
// server component (예: /rewards/page.tsx) 가 import 시 client boundary
// 평가로 인해 undefined 가 전달되는 케이스 관찰됨.
//
// 본 모듈은 directive 없는 순수 모듈 — server / client 양쪽에서 안전.

export const ANONYMOUS_USER_COOKIE = "anonymous_user_id";
export const COOKIE_MAX_AGE_SEC = 60 * 60 * 24 * 365;
