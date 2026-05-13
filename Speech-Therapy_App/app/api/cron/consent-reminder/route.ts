// INFRA-002 + FR-C-018 — D+3 동의서 미서명 리마인더 Cron (P2 stub).
// schedule: 매일 09:00 UTC (한국 18시) — vercel.json 의 "0 9 * * *"
//
// 본 핸들러는 DB-010 (consent_signatures) 모델이 도입된 후 본격 동작.
// Sprint 1 엔 No-op 응답 (DB-010 P2 작업).

import { NextResponse } from "next/server";
import { verifyCronSecret } from "@/lib/cron-auth";

export async function GET(request: Request) {
  const auth = verifyCronSecret(request);
  if (!auth.ok) {
    return NextResponse.json({ error: "UNAUTHORIZED", reason: auth.reason }, { status: 401 });
  }

  const start = Date.now();

  // P2: DB-010 + API-008 + Resend 어댑터 (API-012) 도입 후 본격 구현.
  // - consent_signatures 에서 (status='pending', createdAt < now-3d, reminderSentAt is null) 조회
  // - 각 row 에 대해 Resend 이메일 발송 + reminderSentAt 갱신
  const skippedCount = 0;

  return NextResponse.json({
    job: "consent-reminder",
    status: "stub_p2",
    skippedCount,
    durationMs: Date.now() - start,
  });
}
