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

  // Prisma User upsert (Supabase Auth user.id 와 동일 UUID 사용).
  try {
    await prisma.user.upsert({
      where: { id: authUserId },
      update: { email: authEmail ?? undefined },
      create: {
        id: authUserId,
        email: authEmail,
        role: "parent",
      },
    });
  } catch (err) {
    console.error("auth/callback: User upsert 실패", err);
  }

  // 익명 → 인증 마이그레이션.
  const cookieStore = await cookies();
  const anonymousUserId = cookieStore.get(ANONYMOUS_USER_COOKIE)?.value;
  if (anonymousUserId && anonymousUserId !== authUserId) {
    await migrateAnonymousData(anonymousUserId, authUserId);
  }

  return NextResponse.redirect(`${origin}${returnTo}`);
}

async function migrateAnonymousData(anonymousUserId: string, authUserId: string) {
  try {
    // SessionLog / EvaluationResult / RewardLog 는 userId 단순 갱신.
    await prisma.$transaction([
      prisma.sessionLog.updateMany({ where: { userId: anonymousUserId }, data: { userId: authUserId } }),
      prisma.evaluationResult.updateMany({
        where: { userId: anonymousUserId },
        data: { userId: authUserId },
      }),
      prisma.rewardLog.updateMany({ where: { userId: anonymousUserId }, data: { userId: authUserId } }),
    ]);

    // RewardProgress 는 @unique(userId) 라 단순 update 가 충돌 가능 — 합산 후 익명 row 삭제.
    const anonymousProgress = await prisma.rewardProgress.findUnique({ where: { userId: anonymousUserId } });
    if (anonymousProgress) {
      const authProgress = await prisma.rewardProgress.findUnique({ where: { userId: authUserId } });
      if (authProgress) {
        // 두 row 모두 존재 → 합산 후 익명 삭제.
        await prisma.rewardProgress.update({
          where: { userId: authUserId },
          data: {
            cumulativeStars: { increment: anonymousProgress.cumulativeStars },
            treeGrowthLevel: { increment: anonymousProgress.treeGrowthLevel },
            aiDrawingCount: { increment: anonymousProgress.aiDrawingCount },
          },
        });
        await prisma.rewardProgress.delete({ where: { userId: anonymousUserId } });
      } else {
        // 익명 row 만 존재 → userId 갱신.
        await prisma.rewardProgress.update({
          where: { userId: anonymousUserId },
          data: { userId: authUserId },
        });
      }
    }

    // 익명 User row 정리 (FK 제거됐으므로 안전).
    await prisma.user.delete({ where: { id: anonymousUserId } }).catch((err) => {
      console.warn("auth/callback: 익명 User 정리 실패 (FK 잔존?)", err);
    });
  } catch (err) {
    console.error("auth/callback: 익명 데이터 마이그레이션 실패", err);
  }
}
