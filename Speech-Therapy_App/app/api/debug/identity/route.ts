// Sprint 2 §4 — 별 누적 디버깅 endpoint.
// 모바일에서 즉시 호출 → 현재 cookie / RewardProgress 확인.
//
// **공개 endpoint** 이므로 PII 절대 비반환 — userId 와 별 카운트만 노출.
// userId 가 추측 가능한 random UUID 일 뿐이라 안전 (FK 추적 불가).
//
// 사용 예: 모바일 Safari 에서 https://<vercel>/api/debug/identity 직접 호출.

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";

const ANONYMOUS_USER_COOKIE = "anonymous_user_id";

export const dynamic = "force-dynamic";

export async function GET() {
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
