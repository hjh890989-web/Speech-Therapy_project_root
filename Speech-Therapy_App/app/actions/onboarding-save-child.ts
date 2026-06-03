"use server";

// FR-C-PARENT-ONBOARDING — 부모 wizard Step 2 의 자녀 정보 저장 Server Action.
//
// 흐름:
//   1) Supabase auth 확인 — 비로그인이면 reject (unauthorized).
//   2) 입력 검증 — childAgeMonths 범위 24~84 (만 2~7세), targetPhonemes 1~2개.
//   3) prisma.user.update — 본인 row 만 업데이트 (RBAC: 다른 user 변경 절대 차단).
//   4) withActor (DB-011) 가 audit_trigger_fn 의 actor_id 캡처.
//
// graceful (throw 절대 금지):
//   - 모든 분기는 { success: false, reason } 결과 객체 반환.
//   - 성공 시 { success: true, userId, childAgeMonths }.
//
// R4 (자녀 보호):
//   - 자녀 이름 / 생년월일 / 주소 0건 저장 — User.childAgeMonths (월령) + preferredPhonemes (관심 음소) 만.
//   - preferredPhonemes 는 User.preferredPhonemes 컬럼(20260525 마이그레이션)에 영속화 —
//     재방문/다기기 prefill + missions 신규(세션0) fallback 음소로 재사용
//     (update-child-profile 와 동일 컬럼·정합. FR-C-ONBOARDING-PHONEME 번들).
//
// CON-04: 본 Action 의 메시지 / 주석에 의료 단정 금칙어 0건 — "발음 발달 확인" 표현 사용.

import { withActor } from "@/lib/db/with-actor";
import { getSupabaseServerClient } from "@/lib/supabase/server";

// FR-PERF-3-USE-SERVER-REFACTOR — non-async exports (const / type / interface) 는
// ./onboarding-save-child-shape 으로 분리.
import {
  ALLOWED_PHONEMES,
  CHILD_AGE_MIN_MONTHS,
  CHILD_AGE_MAX_MONTHS,
  type AllowedPhoneme,
  type SaveChildInfoInput,
  type SaveChildInfoResult,
} from "./onboarding-save-child-shape";

/**
 * 자녀 정보 저장 — wizard Step 2 완료 시 호출.
 *
 * RBAC 정책:
 *   - Supabase auth uid 만 본인 User row 수정 가능.
 *   - 다른 user.id 변경 시도 차단 (본 Action 은 인증된 본인 id 만 사용).
 */
export async function saveChildInfo(
  input: SaveChildInfoInput,
): Promise<SaveChildInfoResult> {
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

  // 2) age 범위 검증.
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

  // 3) phoneme 검증 — 1~2개 + 화이트리스트.
  const rawPhonemes = Array.isArray(input?.targetPhonemes)
    ? input.targetPhonemes
    : [];
  if (rawPhonemes.length < 1 || rawPhonemes.length > 2) {
    return {
      success: false,
      reason: "invalid_phonemes",
      message: "관심 음소는 1~2개 선택해 주세요.",
    };
  }
  const allowedSet = new Set<string>(ALLOWED_PHONEMES);
  const validPhonemes: AllowedPhoneme[] = [];
  for (const p of rawPhonemes) {
    if (!allowedSet.has(p)) {
      return {
        success: false,
        reason: "invalid_phonemes",
        message: "허용되지 않은 음소가 포함됐어요.",
      };
    }
    if (!validPhonemes.includes(p)) {
      validPhonemes.push(p);
    }
  }

  // 4) prisma update — 본인 row 만. withActor (DB-011) 가 audit actor 캡처.
  //    childAgeMonths + preferredPhonemes 영속화 (검증된 validPhonemes — 화이트리스트 통과분만).
  try {
    await withActor(userId, async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: { childAgeMonths: Math.trunc(age), preferredPhonemes: validPhonemes },
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
    childAgeMonths: Math.trunc(age),
    targetPhonemes: validPhonemes,
  };
}
