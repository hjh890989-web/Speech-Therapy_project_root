"use server";

// FR-C-PARENT-SETTINGS — 부모용 자녀 프로필 변경 Server Action.
//
// 가입 후 부모가 /settings/child 페이지에서 자녀 정보 (월령 + 관심 음소) 를 변경할 때 호출.
// Onboarding 의 saveChildInfo 와는 분리된 별도 Action:
//   - saveChildInfo (onboarding-save-child.ts)
//     - 신규 부모 first-time wizard Step2 에서만 호출.
//     - 음소는 1~2개 _필수_ — 신규 user 가 가이드 받기 위한 최소 입력.
//     - targetPhonemes 는 echo 만 (User 스키마 부재) — 본 PR 에서 컬럼 추가 후
//       saveChildInfo 는 그대로 유지 (회귀 0건 원칙).
//   - updateChildProfile (본 파일)
//     - 가입 완료 부모가 언제든 호출 가능 — 설정 변경 UX.
//     - 음소 0~5개 — 빈 배열 (= "시스템 자동 추천") 도 허용.
//     - preferredPhonemes 컬럼에 실 persist (FR-C-PARENT-SETTINGS migration 후).
//
// 흐름:
//   1) Supabase auth.getUser() → userId. 비로그인이면 unauthorized.
//   2) Zod-like validation — childAgeMonths 24~84 int, preferredPhonemes 화이트리스트 0~5개.
//   3) withActor(userId, tx => tx.user.update({...})) — 본인 row 만 + AuditLog actor_id 캡처.
//   4) graceful — throw 절대 금지. 모든 분기 결과 객체 반환.
//
// RBAC (R4):
//   - 본 Action 은 외부에서 user id 입력 받지 않음 — auth.getUser 의 uid 만 사용.
//   - 호출자가 어떤 user id 를 인자로 넘겨도 본 Action 은 무시 (auth 만 신뢰).
//
// CON-04: 본 파일의 모든 메시지 / 주석에 "치료/진단/장애" 금칙어 0건.

import { withActor } from "@/lib/db/with-actor";
import { getSupabaseServerClient } from "@/lib/supabase/server";
// SEC-COMP-PIPA (Grill #3A) — 인증 user 의 PIPA 동의 hard 가드.
import { assertConsentedIfAuthenticated } from "@/lib/policy/consent-guard";

// FR-PERF-3-USE-SERVER-REFACTOR — non-async exports (const / type / interface) 는
// ./update-child-profile-shape 으로 분리.
import {
  ALLOWED_PHONEMES,
  CHILD_AGE_MIN_MONTHS,
  CHILD_AGE_MAX_MONTHS,
  PREFERRED_PHONEMES_MAX,
  type AllowedPhoneme,
  type UpdateChildProfileInput,
  type UpdateChildProfileResult,
} from "./update-child-profile-shape";

/**
 * 자녀 프로필 변경 — /settings/child 에서 부모가 저장 버튼 클릭 시 호출.
 *
 * RBAC: Supabase auth uid 만 본인 User row 수정 — 외부 인자로 받은 user id 는 절대 사용 안 함.
 */
export async function updateChildProfile(
  input: UpdateChildProfileInput,
): Promise<UpdateChildProfileResult> {
  // 1) auth.
  let userId: string;
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
  } catch {
    return {
      success: false,
      reason: "unauthorized",
      message: "로그인 상태를 확인할 수 없어요. 잠시 후 다시 시도해 주세요.",
    };
  }

  // SEC-COMP-PIPA hard 가드 (Grill #3A) — 미동의 인증 user 차단.
  // /settings/child 페이지는 ConsentRedirectGate 제외 path 가 아니라 layout 측에서도
  // 차단되지만, Server Action 측 가드로 UI 우회 (dev tools / 직접 API) 까지 차단.
  try {
    await assertConsentedIfAuthenticated();
  } catch {
    return {
      success: false,
      reason: "consent_required",
      message: "개인정보 동의 후 다시 시도해 주세요.",
    };
  }

  // 2) childAgeMonths 검증.
  const age = input?.childAgeMonths;
  if (
    typeof age !== "number" ||
    !Number.isFinite(age) ||
    age < CHILD_AGE_MIN_MONTHS ||
    age > CHILD_AGE_MAX_MONTHS
  ) {
    return {
      success: false,
      reason: "invalid_age",
      message: `자녀 월령은 ${CHILD_AGE_MIN_MONTHS}~${CHILD_AGE_MAX_MONTHS}개월 (만 2~7세) 사이로 선택해 주세요.`,
    };
  }
  const ageInt = Math.trunc(age);

  // 3) preferredPhonemes 검증 — 0~5개 + 화이트리스트 + 중복 제거.
  const rawPhonemes = Array.isArray(input?.preferredPhonemes)
    ? input.preferredPhonemes
    : [];
  if (rawPhonemes.length > PREFERRED_PHONEMES_MAX) {
    return {
      success: false,
      reason: "invalid_phonemes",
      message: `관심 음소는 최대 ${PREFERRED_PHONEMES_MAX}개까지 선택할 수 있어요.`,
    };
  }
  const allowedSet = new Set<string>(ALLOWED_PHONEMES);
  const dedupedPhonemes: AllowedPhoneme[] = [];
  for (const p of rawPhonemes) {
    if (typeof p !== "string" || !allowedSet.has(p)) {
      return {
        success: false,
        reason: "invalid_phonemes",
        message: "허용되지 않은 음소가 포함됐어요.",
      };
    }
    if (!dedupedPhonemes.includes(p as AllowedPhoneme)) {
      dedupedPhonemes.push(p as AllowedPhoneme);
    }
  }

  // 4) DB update — 본인 row 만. withActor 가 audit_trigger_fn actor_id 캡처.
  try {
    await withActor(userId, async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: {
          childAgeMonths: ageInt,
          preferredPhonemes: dedupedPhonemes,
        },
      });
    });
  } catch {
    return {
      success: false,
      reason: "db_failed",
      message: "자녀 정보 저장에 실패했어요. 잠시 후 다시 시도해 주세요.",
    };
  }

  return {
    success: true,
    userId,
    childAgeMonths: ageInt,
    preferredPhonemes: dedupedPhonemes,
  };
}
