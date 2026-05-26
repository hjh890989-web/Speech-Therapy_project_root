"use server";

// FR-Q-009 / FR-C-005 — 부모 초대 link 의 가입 완료 Server Action.
//
// 흐름 (signup link → ParentSignupForm submit):
//   1) token 재검증 (verifyParentInviteToken) — 만료/위조 → invalid_token
//   2) password 형식 검증 (최소 8자)
//   3) Supabase auth.signUp({ email, password }) — 익명 우회 (anon key)
//      - 중복 가입 (이미 user 존재) → reuse (auth.signIn 대신 안내 — 본 PR 단순화)
//   4) prisma.user.upsert — Supabase auth uid 와 동일 PK 로 User 생성/갱신
//      - role: 'parent'
//      - institutionId: token payload
//      - email: token payload (소문자)
//      - withActor (DB-011) 로 audit actor 기록
//   5) 자녀 연결 — 현재 schema 의 User 모델은 부모-자녀 관계 컬럼 부재 (CON-FR-C-016).
//      후속 PR 에서 Student / ChildLink 모델 도입 시 본 Action 의 link 단계만 교체.
//      현재는 child User row 가 존재 시 _확인만_ — 다른 institution 의 child 라면 reject.
//
// graceful (throw 절대 금지):
//   - 모든 분기는 { success: false, reason } 으로 결과 객체 반환.
//   - 성공 시 { success: true, userId }.
//
// R4:
//   - parentEmail 은 token 에서 추출 — 클라이언트가 임의 변경 불가 (token 위조 차단).
//   - childId 와 parentEmail 의 institutionId 일치 검증 (cross-tenant 차단).
//
// CON-04: 본 Action 은 사용자에 노출되는 한국어 카피만 (금칙어 0건 — 직접 검사).

import { prisma } from "@/lib/db";
import { withActor } from "@/lib/db/with-actor";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { verifyParentInviteToken } from "@/lib/auth/parent-invite";

// FR-PERF-3-USE-SERVER-REFACTOR — non-async exports 는 ./complete-parent-signup-shape 으로 분리.
import type {
  CompleteParentSignupInput,
  CompleteParentSignupResult,
} from "./complete-parent-signup-shape";

const PASSWORD_MIN_LENGTH = 8;

/**
 * 부모 가입 완료.
 *
 * 진입 전제: /signup/parent?token=... 페이지에서 verifyParentInviteToken 이 통과한 후
 *   ParentSignupForm 이 password 와 token 을 전달.
 */
export async function completeParentSignup(
  input: CompleteParentSignupInput,
): Promise<CompleteParentSignupResult> {
  // 1) token 재검증 — 페이지 → form submit 사이에 만료된 케이스 대응.
  const payload = await verifyParentInviteToken(input.token ?? "");
  if (!payload) {
    return {
      success: false,
      reason: "invalid_token",
      message: "초대 링크가 만료되었거나 유효하지 않아요. 기관 담당자에게 새 초대를 요청해 주세요.",
    };
  }

  // 2) password 형식 검증.
  const password = typeof input.password === "string" ? input.password : "";
  if (password.length < PASSWORD_MIN_LENGTH) {
    return {
      success: false,
      reason: "invalid_password",
      message: `비밀번호는 ${PASSWORD_MIN_LENGTH}자 이상이어야 해요.`,
    };
  }

  // 3) Supabase auth.signUp — anon key (별도 service-role 불필요).
  let supabase;
  try {
    supabase = await getSupabaseServerClient();
  } catch {
    return {
      success: false,
      reason: "auth_failed",
      message: "인증 서비스 연결에 실패했어요. 잠시 후 다시 시도해 주세요.",
    };
  }

  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email: payload.parentEmail,
    password,
  });
  if (signUpError || !signUpData?.user?.id) {
    return {
      success: false,
      reason: "auth_failed",
      message: signUpError?.message ?? "가입 처리에 실패했어요. 잠시 후 다시 시도해 주세요.",
    };
  }
  const userId = signUpData.user.id;

  // 4) (선택) child 매칭 — 현재 schema 에 ChildLink 부재. child User row 가 존재할 때만
  // institutionId 일치 검증 (cross-tenant 차단). row 가 없으면 skip (후속 PR 에서 연결).
  try {
    const child = await prisma.user.findUnique({
      where: { id: payload.childId },
      select: { institutionId: true },
    });
    if (child && child.institutionId && child.institutionId !== payload.institutionId) {
      return {
        success: false,
        reason: "child_mismatch",
        message: "자녀 정보와 기관이 일치하지 않아요. 기관 담당자에게 문의해 주세요.",
      };
    }
  } catch {
    // graceful — child 검증 실패는 가입 차단 X (후속 PR 에서 강화).
  }

  // 5) prisma.user.upsert — Supabase auth uid 를 PK 로 부모 User row 생성 / 갱신.
  // withActor (DB-011) 가 audit_trigger_fn 의 actor_id 를 캡처.
  try {
    await withActor(userId, async (tx) => {
      await tx.user.upsert({
        where: { id: userId },
        update: {
          email: payload.parentEmail,
          role: "parent",
          institutionId: payload.institutionId,
        },
        create: {
          id: userId,
          email: payload.parentEmail,
          role: "parent",
          institutionId: payload.institutionId,
        },
      });
    });
  } catch {
    return {
      success: false,
      reason: "db_failed",
      message: "사용자 정보 저장에 실패했어요. 잠시 후 다시 시도해 주세요.",
    };
  }

  return {
    success: true,
    userId,
    message: "가입이 완료되었어요. 메일함의 인증 메일도 확인해 주세요.",
  };
}
