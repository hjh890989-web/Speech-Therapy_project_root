// API-010 §1 — Magic Link 콜백.
//
// 흐름:
//   1. URL 의 ?code= 를 supabase.auth.exchangeCodeForSession 로 세션 토큰 교환
//   2. 인증된 user.id 로 Prisma User upsert (role=parent 기본)
//   3. anonymous_user_id cookie 가 있고 인증 user.id 와 다르면 → 익명 데이터 마이그레이션
//      - RewardProgress / SessionLog / EvaluationResult / RewardLog 모두 userId 갱신
//      - 충돌 시 (이미 인증 user 가 자기 row 보유) — 별 누적 합산
//   4. /rewards 로 리다이렉트 (별 잘 옮겨졌는지 즉시 확인 가능)

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/db";
import { withActor } from "@/lib/db/with-actor";
import { ANONYMOUS_USER_COOKIE } from "@/lib/anonymous-user";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const returnTo = searchParams.get("next") ?? "/rewards";

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`);
  }

  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.user) {
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error?.message ?? "session_failed")}`);
  }

  const authUserId = data.user.id;
  const authEmail = data.user.email ?? null;

  // INFRA-005-FU (#104) — auth_signin_completed 의 isFirstSignin 판정용.
  // upsert 전 존재 여부 확인 — 새 row 면 true.
  let isFirstSignin = false;
  try {
    const existing = await prisma.user.findUnique({
      where: { id: authUserId },
      select: { id: true },
    });
    isFirstSignin = !existing;
  } catch (err) {
    console.error("auth/callback: User 존재 확인 실패 (isFirstSignin 미정)", err);
  }

  // Prisma User upsert (Supabase Auth user.id 와 동일 UUID 사용).
  // DB-011: User 가 기존 row 인 경우 update 분기에서 audit_user_changes TRIGGER 발화 →
  // actorId 미주입 시 'system' 으로 적재됨. withActor(authUserId, ...) 로 본인 id 캡처.
  try {
    await withActor(authUserId, (tx) =>
      tx.user.upsert({
        where: { id: authUserId },
        update: { email: authEmail ?? undefined },
        create: {
          id: authUserId,
          email: authEmail,
          role: "parent",
        },
      }),
    );
  } catch (err) {
    console.error("auth/callback: User upsert 실패", err);
  }

  // 익명 → 인증 마이그레이션.
  const cookieStore = await cookies();
  const anonymousUserId = cookieStore.get(ANONYMOUS_USER_COOKIE)?.value;
  if (anonymousUserId && anonymousUserId !== authUserId) {
    await migrateAnonymousData(anonymousUserId, authUserId);
  }

  // FR-C-SECURITY (MFA 마무리) — AAL 체크: TOTP 등록된 사용자는 /auth/mfa-challenge 로 우회.
  // 정책:
  //   - nextLevel === 'aal2' && currentLevel === 'aal1' → MFA 필수 (challenge 페이지로).
  //   - 그 외 (미등록 / 이미 AAL2) → 정상 returnTo redirect.
  //   - AAL 조회 실패 → graceful 정상 흐름 (회귀 0건 — 후속 PR 에서 strict 검토).
  try {
    const aalResp = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    const currentLevel =
      (aalResp.data as { currentLevel?: string } | null)?.currentLevel ?? null;
    const nextLevel =
      (aalResp.data as { nextLevel?: string } | null)?.nextLevel ?? null;
    if (currentLevel === "aal1" && nextLevel === "aal2") {
      const mfaTarget = new URL(`${origin}/auth/mfa-challenge`);
      // returnTo 가 외부 URL 일 가능성은 위에서 차단 안 했지만 internal default("/rewards") 가
      // 일반 경로 — MfaChallengePage 가 다시 sanitize 한다.
      mfaTarget.searchParams.set("next", returnTo);
      return NextResponse.redirect(mfaTarget);
    }
  } catch (err) {
    console.warn(
      "auth/callback: getAuthenticatorAssuranceLevel 실패 — graceful 정상 흐름",
      err instanceof Error ? err.message : "unknown",
    );
  }

  // 리다이렉트 URL 에 signin 플래그 부착 — 목적지 페이지의 client beacon 이 trackEvent 발송.
  const redirectUrl = new URL(`${origin}${returnTo}`);
  redirectUrl.searchParams.set("signin", "ok");
  redirectUrl.searchParams.set("first", isFirstSignin ? "1" : "0");
  return NextResponse.redirect(redirectUrl);
}

async function migrateAnonymousData(anonymousUserId: string, authUserId: string) {
  try {
    // DB-011: 마이그레이션 트랜잭션 전체를 withActor(authUserId, ...) 안으로 이동.
    // 본 흐름은 _authUserId_ (인증 사용자) 의 의지로 익명 데이터를 본인 계정에 병합 →
    // audit_user_changes (User DELETE) / audit_reward_log_inserts 등 TRIGGER 발화 시
    // authUserId 가 actor 로 캡처되어야 무결성 분석에서 책임 추적 가능.
    //
    // 단, prisma.$transaction([...]) batch 시그니처는 tx (TransactionClient) 와
    // 사용성이 다름 → withActor 의 함수형 트랜잭션으로 직렬 호출 전환.
    await withActor(authUserId, async (tx) => {
      // SessionLog / EvaluationResult / RewardLog 는 userId 단순 갱신.
      await tx.sessionLog.updateMany({ where: { userId: anonymousUserId }, data: { userId: authUserId } });
      await tx.evaluationResult.updateMany({
        where: { userId: anonymousUserId },
        data: { userId: authUserId },
      });
      await tx.rewardLog.updateMany({ where: { userId: anonymousUserId }, data: { userId: authUserId } });

      // RewardProgress 는 @unique(userId) 라 단순 update 가 충돌 가능 — 합산 후 익명 row 삭제.
      const anonymousProgress = await tx.rewardProgress.findUnique({ where: { userId: anonymousUserId } });
      if (anonymousProgress) {
        const authProgress = await tx.rewardProgress.findUnique({ where: { userId: authUserId } });
        if (authProgress) {
          // 두 row 모두 존재 → 합산 후 익명 삭제.
          await tx.rewardProgress.update({
            where: { userId: authUserId },
            data: {
              cumulativeStars: { increment: anonymousProgress.cumulativeStars },
              treeGrowthLevel: { increment: anonymousProgress.treeGrowthLevel },
              aiDrawingCount: { increment: anonymousProgress.aiDrawingCount },
            },
          });
          await tx.rewardProgress.delete({ where: { userId: anonymousUserId } });
        } else {
          // 익명 row 만 존재 → userId 갱신.
          await tx.rewardProgress.update({
            where: { userId: anonymousUserId },
            data: { userId: authUserId },
          });
        }
      }

      // 익명 User row 정리 (FK 제거됐으므로 안전).
      // audit_user_changes (DELETE) TRIGGER 발화 → actorId=authUserId 캡처.
      try {
        await tx.user.delete({ where: { id: anonymousUserId } });
      } catch (err) {
        console.warn("auth/callback: 익명 User 정리 실패 (FK 잔존?)", err);
      }
    });
  } catch (err) {
    console.error("auth/callback: 익명 데이터 마이그레이션 실패", err);
  }
}
