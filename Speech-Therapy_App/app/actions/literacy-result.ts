"use server";

// CR-2026-009 — saveLiteracyResult Server Action (문해력 놀이/probe 결과 영속).
//
// 게이트(순서 = graceful skip):
//   1) Zod 입력 검증 실패 → { success:false, invalid_input }.
//   2) 게임 게이트 — registry 에 있고 활성 플래그 ON 인 놀이만 영속(미공개 콘텐츠 누출 0).
//      → off/미존재면 persisted:false "dormant".
//   3) 인증 user 만 영속 — 익명 놀이는 ephemeral(저장 안 함). 주간 리포트=인증 user 기준.
//   4) 자녀 월령은 **서버에서 조회**(User.childAgeMonths) — 클라이언트 신뢰 X.
//      미상 또는 만 2~12세 도메인 밖이면 persisted:false "age_out_of_domain".
//   5) PIPA 동의 가드(인증 user) — 미동의 시 persisted:false "consent_required".
//   6) INSERT — **rawScore 그대로(보정 금지)**, referenceBand=null(Phase 2 검증 전 연습-only),
//      stage 는 게임 구인 단계(registry)에서 서버 파생. withActor 가 audit actor 캡처.
//
// 임상 안전: 발음 채점(diagnosis)/HITL/escalation 과 무관 — 별도 활동. raw 불변(project 규칙).
// CON-04: 메시지에 "치료/진단/장애" 금칙어 0.

import { prisma } from "@/lib/db";
import { withActor } from "@/lib/db/with-actor";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import {
  assertConsentedIfAuthenticated,
  ConsentRequiredError,
} from "@/lib/policy/consent-guard";
import { LITERACY_GAMES } from "@/lib/literacy/registry";
import { isLiteracyAgeEligible } from "@/lib/literacy/stages";
import {
  LiteracyResultInputSchema,
  type LiteracyResultActionResult,
} from "@/lib/schemas/literacy-result";

export async function saveLiteracyResult(
  rawInput: unknown,
): Promise<LiteracyResultActionResult> {
  // 1) 입력 검증.
  const parsed = LiteracyResultInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { success: false, reason: "invalid_input", message: "입력값이 올바르지 않아요." };
  }
  const input = parsed.data;

  // 2) 게임 게이트 — 활성 플래그 ON 인 등록된 놀이만 영속.
  const game = LITERACY_GAMES.find((g) => g.slug === input.gameSlug);
  if (!game || !game.isEnabled()) {
    return { success: true, persisted: false, reason: "dormant" };
  }

  // 3) 인증 user 확인 — 익명은 저장 안 함(ephemeral).
  let userId: string | null = null;
  try {
    const supabase = await getSupabaseServerClient();
    const { data } = await supabase.auth.getUser();
    userId = data.user?.id ?? null;
  } catch {
    userId = null;
  }
  if (!userId) {
    return { success: true, persisted: false, reason: "anonymous" };
  }

  // 4) 자녀 월령 서버 조회(클라이언트 신뢰 X). 미상/도메인 밖이면 영속 생략.
  let childAgeMonths: number | null = null;
  try {
    const row = await prisma.user.findUnique({
      where: { id: userId },
      select: { childAgeMonths: true },
    });
    childAgeMonths = row?.childAgeMonths ?? null;
  } catch {
    return { success: false, reason: "db_failed", message: "저장 중 문제가 발생했어요." };
  }
  if (childAgeMonths === null || !isLiteracyAgeEligible(childAgeMonths)) {
    return { success: true, persisted: false, reason: "age_out_of_domain" };
  }

  // 5) PIPA 동의 가드 (인증 user) — 미동의 시 graceful skip.
  try {
    await assertConsentedIfAuthenticated();
  } catch (err) {
    if (err instanceof ConsentRequiredError) {
      return { success: true, persisted: false, reason: "consent_required" };
    }
    return { success: false, reason: "db_failed", message: "저장 중 문제가 발생했어요." };
  }

  // 6) INSERT — raw 그대로, stage 는 게임 구인 단계(서버 파생), referenceBand=null.
  const stage = game.stage;
  try {
    const created = await withActor(userId, (tx) =>
      tx.literacyResult.create({
        data: {
          userId,
          stage,
          gameSlug: game.slug,
          rawScore: input.rawScore,
          rawTotal: input.rawTotal ?? null,
          childAgeMonths,
          referenceBand: null,
        },
        select: { id: true },
      }),
    );
    return { success: true, persisted: true, id: created.id, stage };
  } catch {
    return { success: false, reason: "db_failed", message: "저장 중 문제가 발생했어요." };
  }
}
