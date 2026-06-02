// API-020 — F16 푸시 설정: feature flag + VAPID 키 getter.
//
// 게이트 정책 (ADR-10 D5 부활 의존):
//   - isF16PushEnabled(): F16_PUSH_ENABLED === "true" AND VAPID 키 쌍 존재.
//     → 둘 다 충족해야 활성. 기본 off (env 미설정) — 코드는 배치되되 활성 0.
//     D5 부활(농촌 비율 + iOS Safari + EXP-2 통과 + 일활성 1,000명+) 후 env 설정 시 활성.
//   - getVapidKeys(): { publicKey, privateKey, subject } | null (둘 다 설정 시에만).
//
// server-only (컨벤션): 본 파일은 VAPID_PRIVATE_KEY 를 읽음 — Client Component import 금지.
//   (Next.js 는 NEXT_PUBLIC_* 만 client 번들에 인라인하므로 client 에선 undefined → null 반환,
//    secret 누출은 발생하지 않으나 의미상 server-only 로 다룬다. 클라이언트 측 공개키는
//    별도 NEXT_PUBLIC_VAPID_PUBLIC_KEY 로 노출 — Full UI PR 범위.)
//
// CON-04: 본 파일 주석 / 상수에 "치료/진단/장애" 금칙어 0건.

export interface VapidKeys {
  /// VAPID 공개키 (base64url). 클라이언트 pushManager.subscribe applicationServerKey 와 동일 값.
  publicKey: string;
  /// VAPID 개인키 (base64url). _절대 client 노출 금지_.
  privateKey: string;
  /// RFC 8292 연락처 — mailto: 또는 https: URL. web-push setVapidDetails 요구.
  subject: string;
}

/**
 * VAPID 키 쌍 — public + private 둘 다 설정된 경우에만 반환, 아니면 null.
 *
 * subject 는 VAPID_SUBJECT env, 미설정 시 안전 default (mailto:).
 */
export function getVapidKeys(): VapidKeys | null {
  // env 복사-붙여넣기 시 끼어드는 공백/개행 + base64 padding('=') 제거 → web-push setVapidDetails 의
  // 엄격한 url-safe base64(무패딩) 검증 통과 보장 (2026-06-03 dispatch 500 "Vapid public key must be
  // URL safe Base 64" fix). 키 바이트 자체는 불변(공백/패딩만 정규화)이라 구독 keypair 와 정합.
  const publicKey = process.env.VAPID_PUBLIC_KEY?.replace(/\s/gu, "").replace(/=+$/u, "");
  const privateKey = process.env.VAPID_PRIVATE_KEY?.replace(/\s/gu, "").replace(/=+$/u, "");
  if (!publicKey || !privateKey) return null;

  const subject =
    process.env.VAPID_SUBJECT && process.env.VAPID_SUBJECT.length > 0
      ? process.env.VAPID_SUBJECT
      : "mailto:ops@speech-therapy.app";

  return { publicKey, privateKey, subject };
}

/**
 * F16 푸시 활성 여부 — 두 조건 모두 충족 시에만 true.
 *   1) F16_PUSH_ENABLED === "true" — 명시 opt-in flag (D5 부활 게이트, ADR-10).
 *   2) getVapidKeys() !== null — 발송 키가 없으면 구독·발송 자체가 무의미.
 *
 * 구독 Server Action / dispatch Cron 진입 직후 본 게이트로 차단 → off 시 무동작.
 */
export function isF16PushEnabled(): boolean {
  return process.env.F16_PUSH_ENABLED === "true" && getVapidKeys() !== null;
}
