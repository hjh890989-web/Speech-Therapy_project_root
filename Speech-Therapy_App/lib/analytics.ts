// INFRA-005-C — trackEvent 어댑터.
//
// dev/prod 분기:
//  - dev (NODE_ENV !== "production"): console.debug 만 — Vercel Analytics 호출 X (대시보드 노이즈 방지)
//  - prod: @vercel/analytics 의 track() 위임
//
// PII 정책 (AGENTS.md §2.2 REQ-NF-SEC):
//  - userId 같은 식별자는 sha256 해싱 후 8자만 전달
//  - properties 에 raw email / name / transcript 노출 절대 금지 (호출 측 책임)
//  - 본 어댑터는 추가 마스킹 하지 않음 — 카탈로그 (lib/events.ts) 의 shape 으로 컴파일 타임 강제

import { track } from "@vercel/analytics";
import type { AnalyticsEvent } from "./events";

// 클라이언트 컴포넌트 ("use client") 안에서만 호출.
// Server Component / Server Action 에서 호출 금지 (Vercel Analytics 는 브라우저 SDK).
export function trackEvent<E extends AnalyticsEvent>(
  event: E["name"],
  properties: E["properties"],
): void {
  if (process.env.NODE_ENV !== "production") {
    // dev: 디버그 출력만, 실 전송 없음.
    console.debug("[analytics:dev]", event, properties);
    return;
  }
  // prod: Vercel Analytics 전송. properties 값은 string | number | boolean | null 만 허용 — 카탈로그 shape 이 강제.
  track(event, properties as Record<string, string | number | boolean | null>);
}

// userId 등 식별자 해싱용 — Web Crypto API (브라우저).
// Server Action 에서 사용 시 node:crypto 를 별도 호출 (본 어댑터 미사용).
export async function hashIdentifier(value: string): Promise<string> {
  if (typeof window === "undefined" || !window.crypto?.subtle) {
    // SSR / 미지원 환경 — fallback 으로 빈 문자열 (호출 측이 분기 필요).
    return "";
  }
  const data = new TextEncoder().encode(value);
  const digest = await window.crypto.subtle.digest("SHA-256", data);
  const hex = Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return hex.slice(0, 8);
}
