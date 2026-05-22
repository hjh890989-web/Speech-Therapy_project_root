// API-008 — POST /api/consent/sign (E2 일반 웹폼) stub.
// 구현은 FR-C-018 책임. 별도 /confirm 경로는 추후.
//
// SEC-003 — CSRF 1차 방어: Origin/Referer 헤더 검증 (lib/csrf.verifyOrigin).
// 외부 도메인에서 POST 차단. 화이트리스트 환경 분기 (prod/preview/dev).

import { NextResponse } from "next/server";
import {
  ConsentCreateInputSchema,
  type ConsentCreateOutput,
} from "@/lib/schemas/consent";
import { verifyOrigin } from "@/lib/csrf";

export async function POST(request: Request) {
  // SEC-003 — CSRF Origin 검증. body parse 이전에 차단 (DoS 절약).
  const csrf = verifyOrigin(request);
  if (!csrf.ok) {
    return NextResponse.json(
      { error: csrf.reason ?? "CSRF_ORIGIN_MISMATCH" },
      { status: 403 },
    );
  }

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

  // FR-C-018 구현:
  //    - DB-010 consent_signatures INSERT (token UUID v4)
  //    - 7일 만료 expiresAt 계산
  //    - Resend 이메일 발송 (서명 링크) — API-012 통합
  //    - Rate Limit (동일 parentEmail 1분 5회)
  void parsed;

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
