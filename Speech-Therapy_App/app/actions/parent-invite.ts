"use server";

// FR-Q-009 / FR-C-016 / FR-C-005 — 부모 초대 Server Action.
//
// 흐름 (호출 측 — 원아 등록 / 원장 대시보드 / 가입 흐름):
//   1) RBAC — Supabase auth → User.role 가 principal / admin 인지 검증
//   2) institutionId 일치 — 본인 institution 소속 자녀에만 초대 발송 (R4)
//   3) createParentInviteToken — 7일 JWT 발급
//   4) signupLink = `${BASE_URL}/signup/parent?token=...`
//   5) buildParentInviteEmail — CON-04 검증된 본문 생성
//   6) sendParentInviteEmailWithPreference — User lookup → preference 체크 후 Resend 위임
//      (가입 전 부모: preference 미적용 / 가입된 부모: parentInviteEmail opt-out 시 skipped)
//   7) server-side telemetry log — parent_invite_sent
//
// graceful (throw 절대 금지):
//   - 인증 실패 → { sent: false, skipped: true, reason: 'unauthorized' }
//   - 권한 부족 → { sent: false, skipped: true, reason: 'forbidden' }
//   - JWT secret 미설정 → { sent: false, skipped: true, reason: 'jwt_misconfigured' }
//   - Resend 실패 → { sent: false, skipped: true, reason: 'email_failed' }
//   - 정상 발송 → { sent: true, skipped: false }
//   - 테스트 환경 (NODE_ENV='test') 자동 skip — Resend 측이 이미 보장.
//
// R4:
//   - parentEmail 은 본인 institution 소속 자녀의 부모 본인에게만 전송 — 호출 측이
//     childId 와 parentEmail 매칭을 보장해야 함 (본 Action 은 RBAC 만 검증).
//
// CON-04: buildParentInviteEmail 의 본문은 금칙어 0건 (sendEmail 측 defense 도 작동).

import { createParentInviteToken } from "@/lib/auth/parent-invite";
import { buildParentInviteEmail } from "@/lib/email/templates";
import { sendParentInviteEmailWithPreference } from "@/lib/parent-invite/email-with-preference";
import { getSupabaseServerClient } from "@/lib/supabase/server";

// FR-PERF-3-USE-SERVER-REFACTOR — non-async exports 는 ./parent-invite-shape 으로 분리.
import type {
  SendParentInviteInput,
  SendParentInviteResult,
} from "./parent-invite-shape";

/// 본 Action 허용 role — principal 와 admin (expert 제외, 부모/교사 차단).
const INVITE_ALLOWED_ROLES = ["admin", "principal"] as const;

/// 가입 진입 base URL — 호출 시점에 환경변수로부터 결정.
/// 우선순위: NEXT_PUBLIC_SITE_URL > VERCEL_URL (preview) > "http://localhost:4000".
function getBaseUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit && explicit.trim().length > 0) {
    return explicit.replace(/\/$/, "");
  }
  const vercelUrl = process.env.VERCEL_URL;
  if (vercelUrl && vercelUrl.trim().length > 0) {
    return `https://${vercelUrl}`.replace(/\/$/, "");
  }
  return "http://localhost:4000";
}

/// server-side telemetry — R4 (parentEmail / childId 노출 금지) + Vercel Logs 수집.
function logInviteTelemetry(properties: {
  institutionId: string;
  emailSkipped: boolean;
}): void {
  try {
    console.log(
      JSON.stringify({
        level: "info",
        event: "parent_invite_sent",
        properties,
      }),
    );
  } catch {
    // graceful — 텔레메트리 실패는 사용자 흐름 차단 X.
  }
}

/**
 * 부모 초대 이메일 발송.
 *
 * principal / admin role + 본인 institution 의 자녀에만 전송 (RBAC + R4).
 * Resend / JWT secret 미설정 시 graceful skip — 호출 측은 sent 와 skipped 로 분기.
 */
export async function sendParentInvite(
  input: SendParentInviteInput,
): Promise<SendParentInviteResult> {
  // 1) 입력 sanity (단일 책임 — Zod 미사용, 호출 측 검증 가정).
  const parentEmail = (input.parentEmail ?? "").trim().toLowerCase();
  const childId = (input.childId ?? "").trim();
  const institutionName = (input.institutionName ?? "").trim();
  if (parentEmail.length === 0 || childId.length === 0 || institutionName.length === 0) {
    return {
      sent: false,
      skipped: true,
      reason: "invalid_input",
      tokenIssued: false,
    };
  }
  // RFC 5321 단순 검증 — 길이 + @ 포함.
  if (parentEmail.length > 254 || !parentEmail.includes("@")) {
    return {
      sent: false,
      skipped: true,
      reason: "invalid_input",
      tokenIssued: false,
    };
  }

  // 2) Supabase auth + role + institutionId 검증.
  let supabase;
  try {
    supabase = await getSupabaseServerClient();
  } catch {
    // env 미설정 — graceful (테스트/preview 자동 통과 분기 없음, 명시적 unauthorized).
    return {
      sent: false,
      skipped: true,
      reason: "unauthorized",
      tokenIssued: false,
    };
  }
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return {
      sent: false,
      skipped: true,
      reason: "unauthorized",
      tokenIssued: false,
    };
  }

  // 3) role / institutionId 조회 + RBAC.
  let userRow: { role: string | null; institutionId: string | null } | null;
  try {
    const { data, error } = await supabase
      .from("User")
      .select("role, institutionId")
      .eq("id", user.id)
      .maybeSingle<{ role: string | null; institutionId: string | null }>();
    if (error) {
      return {
        sent: false,
        skipped: true,
        reason: "forbidden",
        tokenIssued: false,
      };
    }
    userRow = data;
  } catch {
    return {
      sent: false,
      skipped: true,
      reason: "forbidden",
      tokenIssued: false,
    };
  }
  if (
    !userRow?.role ||
    !(INVITE_ALLOWED_ROLES as readonly string[]).includes(userRow.role)
  ) {
    return {
      sent: false,
      skipped: true,
      reason: "forbidden",
      tokenIssued: false,
    };
  }
  const callerInstitutionId = userRow.institutionId;
  if (!callerInstitutionId || callerInstitutionId.trim().length === 0) {
    return {
      sent: false,
      skipped: true,
      reason: "forbidden",
      tokenIssued: false,
    };
  }

  // 4) JWT 토큰 발급 — secret 미설정 시 graceful.
  let token: string;
  try {
    token = await createParentInviteToken({
      parentEmail,
      childId,
      institutionId: callerInstitutionId,
    });
  } catch {
    return {
      sent: false,
      skipped: true,
      reason: "jwt_misconfigured",
      tokenIssued: false,
    };
  }

  // 5) signup link + 이메일 본문 생성.
  const signupLink = `${getBaseUrl()}/signup/parent?token=${encodeURIComponent(token)}`;
  const tpl = buildParentInviteEmail({
    institutionName,
    signupLink,
    childName: input.childName,
    senderName: input.senderName,
  });

  // 6) Resend 발송 — graceful (env 미설정 / 5xx / 금칙어 등 모두 skipped 분기).
  //    FR-C-NOTIFICATION-PREFERENCE: 이미 가입한 부모는 parentInviteEmail opt-out 시 skipped.
  const sendResult = await sendParentInviteEmailWithPreference({
    parentEmail,
    subject: tpl.subject,
    html: tpl.html,
    text: tpl.text,
    tags: [{ name: "template", value: "parent_invite" }],
  });

  const skipped = !sendResult.ok;
  // 7) 텔레메트리 — institutionId + 발송 결과만 (R4: 부모 이메일 노출 0).
  logInviteTelemetry({
    institutionId: callerInstitutionId,
    emailSkipped: skipped,
  });

  if (sendResult.ok) {
    return { sent: true, skipped: false, tokenIssued: true };
  }
  // user_opt_out 은 별도 reason 으로 노출 (UI / 분석에서 'email_failed' 와 구분).
  if (sendResult.skipped && sendResult.error === "user_opt_out") {
    return {
      sent: false,
      skipped: true,
      reason: "user_opt_out",
      tokenIssued: true,
    };
  }
  return {
    sent: false,
    skipped: true,
    reason: "email_failed",
    tokenIssued: true,
  };
}
