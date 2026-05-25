// INFRA-002 + FR-C-018 (#41) — 7일 미서명 동의서 자동 만료 Cron.
//
// schedule: vercel.json 의 "0 2 * * *" — 매일 UTC 02:00 (한국 11시).
// consent-reminder (01:00 UTC) 와 1시간 간격 — 같은 row 가 한 cron run 안에서 reminder + expire 동시 처리되지 않도록 분리.
//
// 동작 (멱등):
//   1. verifyCronSecret — 401 시 차단
//   2. findExpireCandidates(now) — status='pending' + sentAt < now-7d, sentAt asc, max BATCH_LIMIT=100
//   3. per-item:
//      a) markExpired(id, now) — status='expired' + expiredAt=now() 우선 적용 (DB 정합 우선)
//      b) sendEmail(buildConsentExpiredEmail(...)) — graceful (실패 시 errors 누적, 다음 cron 재시도 X — 이미 expired 됨)
//   4. 응답 200 — { expiredCount, emailSentCount, errors[], durationMs }
//
// 멱등 패턴:
//   - WHERE status='pending' — 이미 expired 된 row 는 두 번째 cron 에서 0건 매칭 (자연 멱등).
//   - 이메일 발송은 status 전환 _후_ 발송 — 발송 실패는 errors[] 만 누적 (재시도 안 함, 사용자 영향 0).
//
// R4 / CON-04:
//   - errors[] 에 parentEmail / childName 절대 노출 금지 — consentId / reason 만.

import { NextResponse } from "next/server";
import { verifyCronSecret } from "@/lib/cron-auth";
import {
  findExpireCandidates,
  markExpired,
  CONSENT_BATCH_LIMIT,
} from "@/lib/consent/repo";
import { sendConsentEmailWithPreference } from "@/lib/consent/email";
import { buildConsentExpiredEmail } from "@/lib/email/templates";

interface ExpireError {
  consentId: string;
  reason: string;
}

export async function GET(request: Request) {
  const auth = verifyCronSecret(request);
  if (!auth.ok) {
    return NextResponse.json(
      { error: "UNAUTHORIZED", reason: auth.reason },
      { status: 401 },
    );
  }

  const start = Date.now();
  const now = new Date();

  let candidates: Awaited<ReturnType<typeof findExpireCandidates>> = [];
  try {
    candidates = await findExpireCandidates(now);
  } catch (err) {
    console.error("consent-expire: findExpireCandidates 실패", err);
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }

  const errors: ExpireError[] = [];
  let expiredCount = 0;
  let emailSentCount = 0;
  let emailSkippedCount = 0;

  for (const row of candidates) {
    // 1) 우선 status 전환 (DB 정합 우선 — 이메일 실패와 무관).
    try {
      await markExpired(row.id, now);
      expiredCount += 1;
      console.log(`consent_expired consentId=${row.id}`);
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      errors.push({ consentId: row.id, reason: `db:${reason}` });
      console.error(
        `consent-expire: markExpired 실패 consentId=${row.id} reason=${reason}`,
      );
      // DB 실패 시 이메일 발송 skip — 다음 cron 주기에 다시 시도.
      continue;
    }

    // 2) 만료 안내 이메일 — graceful (옵션, 실패해도 errors 만 누적).
    try {
      const template = buildConsentExpiredEmail({
        parentName: row.parentName,
        // 이메일 본문은 부모용 컨텍스트 — R4 정책상 childNickname (별명) 노출 허용.
        childName: row.childNickname,
        originalSentAt: row.sentAt.toISOString(),
        consentType: row.consentType === "data_usage" ? "데이터 활용" : row.consentType,
      });
      // FR-C-NOTIFICATION-PREFERENCE — opt-out user 의 만료 안내는 차단 (consentReminderEmail 키 재사용).
      //   markExpired 는 이미 위에서 수행됨 — DB 정합 우선 정책 유지.
      const result = await sendConsentEmailWithPreference({
        to: row.parentEmail,
        parentEmail: row.parentEmail,
        subject: template.subject,
        html: template.html,
        text: template.text,
        tags: [{ name: "template", value: "consent_expired" }],
        skipPreferenceCheck: false,
      });
      if (result.ok) {
        emailSentCount += 1;
      } else if (result.skipped) {
        // opt-out / API key 미설정 모두 동일 카운트 — manual 운영 분리는 본 PR 범위 외.
        emailSkippedCount += 1;
      } else {
        errors.push({
          consentId: row.id,
          reason: `email:${result.error ?? "send_failed"}`,
        });
      }
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      errors.push({ consentId: row.id, reason: `email_exc:${reason}` });
    }
  }

  return NextResponse.json({
    job: "consent-expire",
    scannedCount: candidates.length,
    expiredCount,
    emailSentCount,
    emailSkippedCount,
    errors,
    batchLimited: candidates.length >= CONSENT_BATCH_LIMIT,
    durationMs: Date.now() - start,
  });
}
