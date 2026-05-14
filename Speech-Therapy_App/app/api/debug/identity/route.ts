// Sprint 2 §4 — 별 누적 디버깅 endpoint.
// 모바일에서 즉시 호출 → 현재 cookie / RewardProgress 확인.
//
// **환경변수 게이트** (API-010 §1 이후 적용):
//   - DEBUG_ENDPOINTS_ENABLED=true 일 때만 응답
//   - 미설정 / 다른 값 → 404 (운영 환경 노출 방지)
//   - 운영 디버깅 필요 시 Vercel Production 환경변수에 일시 추가 → 재배포
//
// PII 비반환: userId 와 별 카운트만 노출 — userId 는 random UUID 라 FK 추적 불가.

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { ANONYMOUS_USER_COOKIE } from "@/lib/anonymous-user";

export const dynamic = "force-dynamic";

function notFound() {
  return new NextResponse(null, { status: 404 });
}

export async function GET() {
  // 환경변수 게이트 — 미설정 시 운영 사용자에겐 404 로 응답.
  if (process.env.DEBUG_ENDPOINTS_ENABLED !== "true") {
    return notFound();
  }

  const cookieStore = await cookies();
  const cookieUserId = cookieStore.get(ANONYMOUS_USER_COOKIE)?.value ?? null;

  let progress: {
    cumulativeStars: number;
    treeGrowthLevel: number;
    aiDrawingCount: number;
  } | null = null;
  let rewardLogCount = 0;

  if (cookieUserId) {
    try {
      const row = await prisma.rewardProgress.findUnique({
        where: { userId: cookieUserId },
        select: { cumulativeStars: true, treeGrowthLevel: true, aiDrawingCount: true },
      });
      progress = row ?? null;
      rewardLogCount = await prisma.rewardLog.count({ where: { userId: cookieUserId } });
    } catch (err) {
      console.error("debug/identity: DB 조회 실패", err);
    }
  }

  return NextResponse.json({
    cookieUserId,
    progress,
    rewardLogCount,
    note:
      "localStorage.anonymousUserId 는 클라이언트 측에서만 확인 가능 — DevTools Application → Local Storage 에서 직접 비교.",
    hint:
      cookieUserId == null
        ? "cookie 부재 → proxy.ts 발급 대기. 페이지 1회 새로고침 후 재호출."
        : progress == null
          ? "cookie userId 에 RewardProgress row 없음 — 다른 userId 로 진단했을 가능성. localStorage 확인."
          : "정상 — cookie userId 의 누적 상태 표시.",
  });
}
