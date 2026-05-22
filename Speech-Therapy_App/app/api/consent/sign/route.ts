// API-008 — POST /api/consent/sign (E2 일반 웹폼) stub.
// 구현은 FR-C-018 책임. 별도 /confirm 경로는 추후.
//
// SEC-003 — 보안 4중 방어 (CSRF → Replay → Rate Limit → Schema):
//   1) verifyOrigin (lib/csrf)        — Origin/Referer 화이트리스트 (403)
//   2) verifyReplay (lib/replay)      — idempotency nonce (24h TTL, 409)
//   3) checkRateLimit (lib/ratelimit) — SEC-004 글로벌 RPM + 사용자 일 50회 (429)
//   4) ConsentCreateInputSchema parse — XSS sanitize + RFC 5321 email (400)
//
// 본 흐름의 _순서_ 는 의도적 (비용 ↑ 순):
//   - CSRF: header 만 검사 (DoS 절약 최대)
//   - Replay: in-memory Map lookup (저비용)
//   - RateLimit: in-memory Map lookup (저비용)
//   - Schema parse: body JSON 파싱 (메모리 ↑)
//   - 실 처리: DB / 외부 API (가장 비용 ↑) — 본 stub 에선 placeholder 501
//
// nonce 추출:
//   클라이언트가 `X-Idempotency-Key` 헤더로 UUID 전달. 헤더 부재 시 _replay 검사 skip_
//   (하위 호환). 본 stub 구현은 501 placeholder 라 실 record 안 함 — 정식 구현
//   (FR-C-018) 시 처리 성공 후 `recordNonce(nonce)` 호출 필요.
//
// userId 추출:
//   `anonymous_user_id` cookie 우선 (proxy.ts 가 발급 보장). cookie 부재 시 IP
//   fallback (서버리스 환경에선 x-forwarded-for) — 사실상 unauthenticated user 의
//   distinct 식별자 역할.

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  ConsentCreateInputSchema,
  type ConsentCreateOutput,
} from "@/lib/schemas/consent";
import { verifyOrigin } from "@/lib/csrf";
import { verifyReplay, recordNonce } from "@/lib/replay";
import { checkRateLimit } from "@/lib/ratelimit";
import { ANONYMOUS_USER_COOKIE } from "@/lib/anonymous-user";

const IDEMPOTENCY_HEADER = "x-idempotency-key";

/** anonymous_user_id cookie → 부재 시 IP / "anonymous" fallback. RateLimit 키 용. */
async function resolveUserId(request: Request): Promise<string> {
  try {
    const cookieStore = await cookies();
    const cookieUserId = cookieStore.get(ANONYMOUS_USER_COOKIE)?.value;
    if (cookieUserId) return cookieUserId;
  } catch {
    // happy-dom / unit test 환경 — cookies() 실패는 fallback 으로 처리.
  }
  // Fallback: x-forwarded-for (Vercel edge) → 클라이언트 IP.
  const xff = request.headers.get("x-forwarded-for");
  if (xff) {
    const firstIp = xff.split(",")[0]?.trim();
    if (firstIp) return `ip:${firstIp}`;
  }
  return "anonymous";
}

export async function POST(request: Request) {
  // 1) SEC-003 — CSRF Origin 검증. body parse 이전 차단 (DoS 절약).
  const csrf = verifyOrigin(request);
  if (!csrf.ok) {
    return NextResponse.json(
      { error: csrf.reason ?? "CSRF_ORIGIN_MISMATCH" },
      { status: 403 },
    );
  }

  // 2) SEC-003 (2차) — Replay 방어. X-Idempotency-Key 헤더가 있을 때만 검사.
  //    헤더 부재 시 하위 호환 (legacy 클라이언트). 신규 클라이언트는 UUID 전달 권장.
  const nonce = request.headers.get(IDEMPOTENCY_HEADER);
  if (nonce) {
    const replay = verifyReplay(nonce);
    if (!replay.ok) {
      return NextResponse.json(
        { error: "REPLAY_DETECTED", reason: replay.reason ?? "replay" },
        { status: 409 },
      );
    }
  }

  // 3) SEC-004 통합 — Rate Limit (글로벌 RPM 14 + 사용자 일 50회).
  const userId = await resolveUserId(request);
  const rate = checkRateLimit(userId);
  if (!rate.allowed) {
    return NextResponse.json(
      {
        error: "RATE_LIMITED",
        reason: rate.reason,
        retryAfterSec: rate.retryAfterSec,
      },
      {
        status: 429,
        headers: rate.retryAfterSec
          ? { "Retry-After": String(rate.retryAfterSec) }
          : undefined,
      },
    );
  }

  // 4) Schema parse — XSS sanitize + RFC 5321 email + UUID / regex 검증.
  // TODO: API-010 — principal / admin 역할 검증.
  let parsed;
  try {
    const body = await request.json();
    parsed = ConsentCreateInputSchema.parse(body);
  } catch (err) {
    return NextResponse.json(
      { error: "INVALID_INPUT", detail: String(err) },
      { status: 400 },
    );
  }

  // 5) 실 처리 — FR-C-018 구현 책임:
  //    - DB-010 consent_signatures INSERT (token UUID v4)
  //    - 7일 만료 expiresAt 계산
  //    - Resend 이메일 발송 (서명 링크) — API-012 통합
  void parsed;

  // 처리 성공 후 nonce 기록 — 동일 nonce 재전송 차단 (24h TTL).
  // placeholder 501 단계에서도 record 하는 이유: replay 시나리오 테스트 가능성 확보.
  if (nonce) {
    recordNonce(nonce);
  }

  const placeholder: ConsentCreateOutput = {
    signatureToken: "00000000-0000-0000-0000-000000000000",
    signUrl: "https://example.com/consent/placeholder",
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  };
  return NextResponse.json(
    { error: "NOT_IMPLEMENTED", placeholder },
    { status: 501 },
  );
}
