// FR-Q-004 — 보상 도감 카드 Grid.
// REQ-FUNC-026. Sprint 2: anonymous_user_id cookie 기반 실 데이터 표시.
// useAnonymousUserId hook 이 localStorage + cookie 동기화 → 본 RSC 가 cookie 로 user 식별.

import Link from "next/link";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { ANONYMOUS_USER_COOKIE } from "@/lib/anonymous-user";

export const metadata = {
  title: "보상 도감 — Speech-Therapy",
  description: "오늘까지 모은 별·나무·AI 그림 컬렉션을 함께 확인해요.",
};

// cookie 가 client mount 이후에야 설정되므로 매 요청 fresh 읽기.
export const dynamic = "force-dynamic";

interface RewardSnapshot {
  cumulativeStars: number;
  treeGrowthLevel: number;
  aiDrawingCount: number;
}

async function fetchRewardProgress(userId: string | undefined): Promise<RewardSnapshot | null> {
  if (!userId) return null;
  try {
    const row = await prisma.rewardProgress.findUnique({
      where: { userId },
      select: { cumulativeStars: true, treeGrowthLevel: true, aiDrawingCount: true },
    });
    if (!row) return null;
    return row;
  } catch (err) {
    console.error("rewardProgress fetch failed:", err);
    return null;
  }
}

export default async function RewardsPage() {
  const cookieStore = await cookies();
  const anonymousUserId = cookieStore.get(ANONYMOUS_USER_COOKIE)?.value;
  const progress = await fetchRewardProgress(anonymousUserId);
  const hasRewards = progress !== null && progress.cumulativeStars + progress.treeGrowthLevel + progress.aiDrawingCount > 0;

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:py-12">
      <p
        data-testid="disclaimer"
        className="mb-6 rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-100"
      >
        보상은 부모님과 함께 즐기는 놀이의 일부입니다. 의료적 판단이 아닙니다.
      </p>

      <header className="mb-8 space-y-2">
        <h1 className="text-2xl font-bold sm:text-3xl">보상 도감</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          오늘까지 모은 별과 나무, AI 그림을 함께 확인해요.
        </p>
      </header>

      {hasRewards && progress ? <RewardGrid progress={progress} /> : <EmptyState />}

      <Link
        href="/missions"
        className="mt-10 inline-block text-sm text-gray-600 underline hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
      >
        오늘의 미션 보기
      </Link>
    </main>
  );
}

function EmptyState() {
  return (
    <section className="rounded-lg border-2 border-dashed border-gray-300 p-8 text-center dark:border-gray-700">
      <p className="mb-2 text-4xl">🌱</p>
      <h2 className="mb-2 text-lg font-semibold">첫 별을 받아볼까요?</h2>
      <p className="mb-6 text-sm text-gray-600 dark:text-gray-400">
        오늘의 미션을 한 번만 완료해도 첫 별이 도감에 모여요.
      </p>
      <Link
        href="/missions"
        className="inline-block min-h-[44px] rounded-md bg-emerald-600 px-5 py-3 text-sm font-medium text-white hover:bg-emerald-700"
      >
        미션 시작하기
      </Link>
    </section>
  );
}

function RewardGrid({ progress }: { progress: RewardSnapshot }) {
  return (
    <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <RewardCard
        label="별"
        emoji="⭐"
        value={progress.cumulativeStars}
        hint={`다음 등급까지 ${Math.max(0, 10 - (progress.cumulativeStars % 10))}개`}
      />
      <RewardCard
        label="나무"
        emoji="🌳"
        value={progress.treeGrowthLevel}
        hint={`${progress.treeGrowthLevel}/10 단계`}
      />
      <RewardCard
        label="AI 그림"
        emoji="🎨"
        value={progress.aiDrawingCount}
        hint={progress.aiDrawingCount === 0 ? "첫 그림을 모아 보세요" : "그림을 더 모아 보세요"}
      />
    </section>
  );
}

function RewardCard({
  label,
  emoji,
  value,
  hint,
}: {
  label: string;
  emoji: string;
  value: number;
  hint: string;
}) {
  return (
    <article className="rounded-lg border border-gray-200 p-4 text-center dark:border-gray-700">
      <p className="text-3xl">{emoji}</p>
      <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">{label}</p>
      <p className="text-2xl font-bold tabular-nums">{value}</p>
      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{hint}</p>
    </article>
  );
}
