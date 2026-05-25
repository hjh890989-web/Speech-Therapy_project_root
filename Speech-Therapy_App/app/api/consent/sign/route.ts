// API-008 + FR-C-018 (#41) — POST /api/consent/sign 실 구현.
//
// SEC-003 4중 보안 layer 보존 (sentinel 보호):
//   1) verifyOrigin (lib/csrf)        — Origin/Referer 화이트리스트 (403)
//   2) verifyReplay (lib/replay)      — idempotency nonce (24h TTL, 409)
//   3) checkRateLimit (lib/ratelimit) — SEC-004 글로벌 RPM + 사용자 일 50회 (429)
//   4) ConsentCreateInputSchema parse — XSS sanitize + RFC 5321 email (400)
//
// 실 처리 흐름 (501 placeholder 교체):
//   5) lib/consent/repo.createOrReturnPendingConsent — 멱등 발급 (같은 부모/자녀/타입 pending 재사용)
//   6) lib/email/resend.sendEmail(buildConsentSignatureEmail) — 이메일 발송, graceful (skip / error 둘 다 200)
//   7) recordNonce — 처리 성공 후 같은 nonce 24h 차단
//   8) 응답 201 + { id, token, signUrl, status: 'pending', expiresAt, emailSkipped }
//
// graceful 정책 (DB 우선 / 이메일 재시도는 cron):
//   - DB INSERT 실패 → 500 (서비스 핵심 실패)
//   - 이메일 발송 실패 → 200 + emailSkipped=true (cron 이 D+3 리마인더로 자동 재시도)
//
// CON-04 / R4:
//   - 응답에 childName / parentEmail 노출 X (token 만 — 부모 본인 메일 inbox 가 보증)
//   - 로그에도 PII 0건 — consentId / token 만
//
// 멱등성:
//   - 같은 부모/자녀/타입 pending row 가 이미 있으면 기존 token 재사용 (이메일은 재발송).
//   - 같은 X-Idempotency-Key 헤더 24h 내 재전송은 409.
//
// BASE_URL:
//   - NEXT_PUBLIC_BASE_URL 우선, 그 다음 VERCEL_URL 의 https 형태, 마지막 fallback 으로 localhost:4000.

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
import {
  createOrReturnPendingConsent,
  CONSENT_EXPIRE_DAYS,
} from "@/lib/consent/repo";
import { sendConsentEmailWithPreference } from "@/lib/consent/email";
import { buildConsentSignatureEmail } from "@/lib/email/templates";

const IDEMPOTENCY_HEADER = "x-idempotency-key";

/** 서명 페이지 base URL — env 우선 + safe fallback. */
function resolveBaseUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_BASE_URL;
  if (explicit && explicit.trim().length > 0) {
    return explicit.replace(/\/$/, "");
  }
  const vercel = process.env.VERCEL_URL;
  if (vercel && vercel.trim().length > 0) {
    return `https://${vercel.replace(/\/$/, "")}`;
  }
  return "http://localhost:4000";
}

function buildSignUrl(token: string): string {
  return `${resolveBaseUrl()}/consent/${token}`;
}

/** anonymous_user_id cookie → 부재 시 IP / "anonymous" fallback. RateLimit 키 용. */
async function resolveUserId(request: Request): Promise<string> {
  try {
    const cookieStore = await cookies();
    const cookieUserId = cookieStore.get(ANONYMOUS_USER_COOKIE)?.value;
    if (cookieUserId) return cookieUserId;
  } catch {
    // happy-dom / unit test 환경 — cookies() 실패는 fallback 으로 처리.
  }
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

  // 5) DB-010 — 멱등 발급. 같은 (parentEmail + childName + 'data_usage') pending 이 있으면 기존 token 재사용.
  //    childName 자리에 schema 가 sanitize 한 childNickname 사용 (자녀 본명 아닌 닉네임만 저장).
  let consentResult;
  try {
    consentResult = await createOrReturnPendingConsent({
      parentEmail: parsed.parentEmail,
      // parentName 은 schema 에 별도 컬럼 없음 — childNickname 의 parent 컨텍스트.
      // 본 PR 에선 parentEmail 의 local-part 를 fallback parentName 으로 사용 (R4 안전).
      parentName: parsed.parentEmail.split("@")[0] ?? "부모",
      childNickname: parsed.childNickname,
      consentType: "data_usage",
      institutionId: parsed.institutionId,
    });
  } catch (err) {
    console.error("consent/sign: DB create 실패", err);
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }

  const row = consentResult.row;
  const signUrl = buildSignUrl(row.token);
  const expiresAtMs = row.sentAt.getTime() + CONSENT_EXPIRE_DAYS * 24 * 60 * 60 * 1000;
  const expiresAt = new Date(expiresAtMs).toISOString();

  // 6) 이메일 발송 — graceful (skip / 실패 모두 200 응답, cron 이 재시도).
  let emailSkipped = true;
  try {
    const template = buildConsentSignatureEmail({
      parentName: row.parentName,
      // 이메일 본문은 부모용 컨텍스트 — R4 정책상 childNickname (별명) 노출 허용.
      childName: row.childNickname,
      signLink: signUrl,
      consentType: row.consentType === "data_usage" ? "데이터 활용" : row.consentType,
      expiresAt,
    });
    // FR-C-NOTIFICATION-PREFERENCE — sendConsentEmailWithPreference 가 parentEmail 로
    //   가입한 User row 가 있으면 consentReminderEmail 옵션을 확인해 opt-out 시 차단.
    //   가입 전 부모는 DEFAULTS 정책으로 그대로 발송 (FR-C-018 흐름 유지).
    const result = await sendConsentEmailWithPreference({
      to: row.parentEmail,
      parentEmail: row.parentEmail,
      subject: template.subject,
      html: template.html,
      text: template.text,
      tags: [{ name: "template", value: "consent_signature" }],
      // 초기 발송도 가입한 user 의 opt-out 을 존중 (옵션 B). 가입 전이면 자동 발송 진행.
      skipPreferenceCheck: false,
    });
    emailSkipped = !result.ok;
    if (!result.ok && !result.skipped) {
      console.warn(
        `consent/sign: 이메일 발송 실패 — consentId=${row.id} reason=${result.error ?? "unknown"}`,
      );
    }
  } catch (err) {
    // sendEmail 은 throw 하지 않지만 방어적 catch.
    console.error("consent/sign: 이메일 발송 예외", err);
    emailSkipped = true;
  }

  // 7) 처리 성공 후 nonce 기록 — 동일 nonce 재전송 차단 (24h TTL).
  if (nonce) {
    recordNonce(nonce);
  }

  // 8) 응답 — ConsentCreateOutput 스키마 정합 + 신규 필드 (id, status, emailSkipped).
  const output: ConsentCreateOutput & {
    id: string;
    status: string;
    emailSkipped: boolean;
    created: boolean;
  } = {
    id: row.id,
    signatureToken: row.token,
    signUrl,
    expiresAt,
    status: row.status,
    emailSkipped,
    created: consentResult.created,
  };

  // server-side telemetry — analytics SDK 없으므로 console.log (cron telemetry 패턴).
  console.log(
    `consent_sent consentId=${row.id} consentType=${row.consentType} emailSkipped=${emailSkipped} created=${consentResult.created}`,
  );

  return NextResponse.json(output, { status: consentResult.created ? 201 : 200 });
}
