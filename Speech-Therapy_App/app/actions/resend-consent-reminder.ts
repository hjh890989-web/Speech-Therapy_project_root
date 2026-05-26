"use server";

// FR-CONSENT-REMINDER-UI — 부모 self-service 동의서 재발송 Server Action.
//
// 흐름:
//   1) zod parse — consentSignatureId UUID 검증.
//   2) Supabase auth.getUser → 비로그인 차단 + parentEmail 확보.
//   3) prisma.consentSignature.findUnique → 본인 (parentEmail 매칭) 의 status='pending' 만 통과.
//      - 다른 parent 의 row → not_found (R4 — 정보 노출 최소화, 두 케이스 통합).
//      - status !== 'pending' → not_pending.
//   4) buildConsentReminderEmail 으로 본문 생성 + sendConsentEmailWithPreference 호출 (cron 패턴 일치).
//   5) 발송 성공 / opt-out skipped → markReminded(id, now) 호출 (cron 의 멱등 정책과 정합).
//   6) 분석 메타 반환 — 호출 측 Client Component 가 trackEvent("consent_reminder_resent") 1회.
//
// RBAC (R4):
//   - 외부 인자는 consentSignatureId 만 — parent 가 본인 row 만 재발송 가능.
//   - parentEmail 매칭은 server-side 에서만 — client 가 spoof 불가.
//   - cross-user 재발송 절대 차단 (not_found 응답으로 통합).
//
// 멱등 / spam 방어:
//   - markReminded() 후 다음 자동 cron 후보에서 제외 (remindedAt IS NOT NULL 차단).
//   - 단, 본 self-service action 자체는 button click 마다 호출 가능 — UI 측 (ConsentResendButton)
//     이 success 후 disabled 처리로 1회 click 제한 (per page mount). 다음 page mount 에선 재호출 가능.
//
// graceful (throw 절대 금지):
//   - 모든 분기 success=false + reason + message 로 반환.
//
// CON-04: 본 파일의 모든 메시지 / 주석 / 응답에 "치료/진단/장애" 금칙어 0건.

import { prisma } from "@/lib/db";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { sendConsentEmailWithPreference } from "@/lib/consent/email";
import { buildConsentReminderEmail } from "@/lib/email/templates";
import {
  markReminded,
  daysSince,
  CONSENT_EXPIRE_DAYS,
} from "@/lib/consent/repo";

// FR-PERF-3-USE-SERVER-REFACTOR — non-async exports (zod schema / type) 는
// ./resend-consent-reminder-shape 으로 분리.
import {
  ResendConsentReminderInputSchema,
  type ResendConsentReminderResult,
} from "./resend-consent-reminder-shape";

/** cron 의 resolveBaseUrl 패턴과 동일. helper 화 가능하나 의존성 최소화 위해 inline. */
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

/**
 * 부모 self-service 동의서 재발송 — /settings/consent 의 ConsentResendButton 에서 호출.
 *
 * R4: parent 가 본인 (parentEmail 매칭) status='pending' row 만 재발송 가능.
 * 다른 사용자의 row 는 not_found 로 통합 응답 (정보 노출 최소화).
 */
export async function resendConsentReminder(
  rawInput: unknown,
): Promise<ResendConsentReminderResult> {
  // 1) zod parse.
  const parsedInput = ResendConsentReminderInputSchema.safeParse(rawInput);
  if (!parsedInput.success) {
    return {
      success: false,
      reason: "invalid_input",
      message: "잘못된 요청이에요. 페이지를 새로고침한 후 다시 시도해 주세요.",
    };
  }
  const { consentSignatureId } = parsedInput.data;

  // 2) auth — 비로그인 차단 + parentEmail 확보.
  let userId: string;
  let userEmail: string | null = null;
  try {
    const supabase = await getSupabaseServerClient();
    const { data, error } = await supabase.auth.getUser();
    if (error || !data?.user?.id) {
      return {
        success: false,
        reason: "unauthorized",
        message: "로그인 후 다시 시도해 주세요.",
      };
    }
    userId = data.user.id;
    userEmail = data.user.email ?? null;
  } catch {
    return {
      success: false,
      reason: "unauthorized",
      message: "로그인 상태를 확인할 수 없어요. 잠시 후 다시 시도해 주세요.",
    };
  }

  if (!userEmail) {
    // 이메일이 없는 계정 (OAuth-only 분기) — 자기 동의서 매칭 불가능.
    return {
      success: false,
      reason: "not_found",
      message: "재발송할 동의서를 찾을 수 없어요.",
    };
  }

  // 3) prisma findUnique → 본인 row 매칭 (R4).
  let row: Awaited<ReturnType<typeof prisma.consentSignature.findUnique>>;
  try {
    row = await prisma.consentSignature.findUnique({
      where: { id: consentSignatureId },
    });
  } catch (err) {
    console.error("[resend-consent-reminder] findUnique 실패", err);
    return {
      success: false,
      reason: "db_failed",
      message: "동의서 조회에 실패했어요. 잠시 후 다시 시도해 주세요.",
    };
  }

  // 미존재 + 다른 parent 의 row → 동일 응답 (R4 정보 노출 최소화).
  if (!row || row.parentEmail !== userEmail) {
    return {
      success: false,
      reason: "not_found",
      message: "재발송할 동의서를 찾을 수 없어요.",
    };
  }

  if (row.status !== "pending") {
    return {
      success: false,
      reason: "not_pending",
      message:
        row.status === "signed"
          ? "이미 서명된 동의서예요. 재발송이 필요하지 않습니다."
          : "만료된 동의서예요. 재발급이 필요하면 운영 담당자에게 문의해 주세요.",
    };
  }

  // 4) 이메일 본문 생성 + 발송.
  const now = new Date();
  const baseUrl = resolveBaseUrl();
  const daysFromSent = daysSince(row.sentAt, now);
  const expiresAt = new Date(
    row.sentAt.getTime() + CONSENT_EXPIRE_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString();

  let emailSkipped = false;
  try {
    const template = buildConsentReminderEmail({
      parentName: row.parentName,
      childName: row.childNickname,
      signLink: `${baseUrl}/consent/${row.token}`,
      daysElapsed: daysFromSent,
      consentType:
        row.consentType === "data_usage" ? "데이터 활용" : row.consentType,
      expiresAt,
    });
    const result = await sendConsentEmailWithPreference({
      to: row.parentEmail,
      parentEmail: row.parentEmail,
      subject: template.subject,
      html: template.html,
      text: template.text,
      tags: [{ name: "template", value: "consent_reminder_self_service" }],
      skipPreferenceCheck: false,
    });
    if (result.ok) {
      emailSkipped = false;
    } else if (result.skipped) {
      // RESEND_API_KEY 미설정 / NODE_ENV='test' / user_opt_out — graceful skip.
      emailSkipped = true;
    } else {
      // 실 발송 실패 (5xx / banned_term 등) — markReminded 안 함 (재시도 여지 유지).
      console.warn(
        `[resend-consent-reminder] send failed consentId=${consentSignatureId} reason=${result.error ?? "unknown"}`,
      );
      return {
        success: false,
        reason: "send_failed",
        message:
          "재발송에 실패했어요. 잠시 후 다시 시도해 주세요. 계속 실패하면 운영 담당자에게 문의해 주세요.",
      };
    }
  } catch (err) {
    console.error(
      "[resend-consent-reminder] sendConsentEmailWithPreference 예외",
      err,
    );
    return {
      success: false,
      reason: "send_failed",
      message: "재발송 중 오류가 발생했어요. 잠시 후 다시 시도해 주세요.",
    };
  }

  // 5) markReminded — 발송 성공 또는 opt-out skipped 모두 마킹 (cron 정책 정합).
  try {
    await markReminded(row.id, now);
  } catch (err) {
    // markReminded 실패는 graceful — 이메일은 이미 발송됐으므로 success 응답 유지.
    console.error(
      `[resend-consent-reminder] markReminded 실패 (graceful) consentId=${consentSignatureId}`,
      err,
    );
  }

  // server-side telemetry — analytics SDK 없으므로 console.log.
  console.log(
    `consent_reminder_resent consentId=${row.id} daysFromSent=${daysFromSent} emailSkipped=${emailSkipped}`,
  );

  return {
    success: true,
    consentSuffix: row.id.slice(-4),
    emailSkipped,
    analytics: {
      userId,
      consentSignatureId: row.id,
    },
  };
}
