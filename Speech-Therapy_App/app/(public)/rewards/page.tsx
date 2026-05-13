// FR-Q-004 — 보상 도감 카드 Grid (Sprint 1 단순화).
// REQ-FUNC-026. shadcn/ui · Framer Motion 컨페티 · AI 그림 갤러리는 별도 PR.
// Sprint 1: 무로그인 사용자에게는 빈 상태 + 미션 페이지 CTA 노출.

import Link from "next/link";

export const metadata = {
  title: "보상 도감 — Speech-Therapy",
  description: "오늘까지 모은 별·나무·AI 그림 컬렉션을 함께 확인해요.",
};

// Sprint 1: 로그인 없이는 reward_progress 식별 불가 → 빈 상태.
// API-010 (Auth) + localStorage anonymousUserId 클라이언트 컴포넌트는 별도 PR.
const HAS_REWARDS = false;

export default function RewardsPage() {
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

      {HAS_REWARDS ? (
        <RewardGrid />
      ) : (
        <EmptyState />
      )}

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

function RewardGrid() {
  // Sprint 1 단계엔 미사용. FR-Q-004 후속 PR 에서 prisma.rewardProgress 조회 + 등급 표기.
  return (
    <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <RewardCard label="별" emoji="⭐" value={0} hint="다음 등급까지 10개" />
      <RewardCard label="나무" emoji="🌳" value={0} hint="0/10 단계" />
      <RewardCard label="AI 그림" emoji="🎨" value={0} hint="첫 그림을 모아 보세요" />
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
