// INFRA-002 + FR-C-018 (#41) — D+3 동의서 미서명 리마인더 Cron (실 구현).
//
// schedule: vercel.json 의 "0 1 * * *" — 매일 UTC 01:00 (한국 10시).
//
// 동작 (어뷰징 방어 + 멱등):
//   1. verifyCronSecret — 401 시 차단
//   2. findReminderCandidates(now) — status='pending' + sentAt < now-3d + remindedAt IS NULL,
//      sentAt asc, max BATCH_LIMIT=100
//   3. per-item:
//      a) sendEmail(buildConsentReminderEmail(...)) — graceful (실패 시 markReminded skip → 다음 cron 재시도)
//      b) sendEmail 성공 → markReminded(id, now) — 같은 row 재발송 차단 (멱등)
//   4. 응답 200 — { sentCount, skippedCount, errors[], durationMs }
//
// 멱등 패턴:
//   - WHERE remindedAt IS NULL — 한 row 는 평생 1회만 리마인더 발송.
//   - 발송 실패 시 remindedAt 미설정 → 다음 cron 자동 재시도 (graceful retry).
//   - 발송 성공 + DB update 실패 시 다음 cron 중복 발송 위험 단발 (운영 수용 — Slack 알림 없음).
//
// R4 / CON-04:
//   - errors[] 에 parentEmail / childName 절대 노출 금지 — consentId / reason 만.
//   - 본 cron 의 모든 로그에서 자녀 식별 정보 0건.

import { NextResponse } from "next/server";
import { verifyCronSecret } from "@/lib/cron-auth";
import {
  findReminderCandidates,
  markReminded,
  daysSince,
  CONSENT_BATCH_LIMIT,
} from "@/lib/consent/repo";
import { sendEmail } from "@/lib/email/resend";
import { buildConsentReminderEmail } from "@/lib/email/templates";

interface ReminderError {
  consentId: string;
  reason: string;
}

/** sign route 와 동일 로직 — 별도 helper 화 가능하나 cron 의존성 최소화 위해 inline. */
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

  let candidates: Awaited<ReturnType<typeof findReminderCandidates>> = [];
  try {
    candidates = await findReminderCandidates(now);
  } catch (err) {
    console.error("consent-reminder: findReminderCandidates 실패", err);
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }

  const baseUrl = resolveBaseUrl();
  const errors: ReminderError[] = [];
  let sentCount = 0;
  let skippedCount = 0;

  for (const row of candidates) {
    const daysFromSent = daysSince(row.sentAt, now);
    try {
      const template = buildConsentReminderEmail({
        parentName: row.parentName,
        // 이메일 본문은 부모용 컨텍스트 — R4 정책상 childNickname (별명) 노출 허용.
        childName: row.childNickname,
        signLink: `${baseUrl}/consent/${row.token}`,
        daysElapsed: daysFromSent,
        consentType: row.consentType === "data_usage" ? "데이터 활용" : row.consentType,
        expiresAt: new Date(
          row.sentAt.getTime() + 7 * 24 * 60 * 60 * 1000,
        ).toISOString(),
      });
      const result = await sendEmail({
        to: row.parentEmail,
        subject: template.subject,
        html: template.html,
        text: template.text,
        tags: [{ name: "template", value: "consent_reminder" }],
      });
      if (result.ok) {
        // 발송 성공 — remindedAt 마킹.
        await markReminded(row.id, now);
        sentCount += 1;
        console.log(
          `consent_reminded consentId=${row.id} daysFromSent=${daysFromSent}`,
        );
      } else if (result.skipped) {
        // RESEND_API_KEY 미설정 / NODE_ENV='test' — markReminded 하지 않음 (다음 cron 재시도).
        skippedCount += 1;
      } else {
        errors.push({
          consentId: row.id,
          reason: result.error ?? "send_failed",
        });
      }
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      errors.push({ consentId: row.id, reason });
      console.error(
        `consent-reminder: per-item 실패 consentId=${row.id} reason=${reason}`,
      );
    }
  }

  return NextResponse.json({
    job: "consent-reminder",
    scannedCount: candidates.length,
    sentCount,
    skippedCount,
    errors,
    batchLimited: candidates.length >= CONSENT_BATCH_LIMIT,
    durationMs: Date.now() - start,
  });
}
