// FR-Q-004 (#45) — 보상 도감 Card Grid 페이지.
//
// 자녀 (2-7세) 가 본인 누적 보상 (별 / 나무 / AI 그림) 을 한눈에 보는 페이지.
// 동기부여 + 미션 CTA 연결이 목적. /rewards (요약) 와 분리하여 그리드 전용 큰 화면 제공.
//
// 사용자 식별 (R4 격리):
//   1순위: Supabase auth uid (로그인 사용자)
//   2순위: anonymous_user_id cookie (무로그인 진단 사용자)
//   둘 다 부재 → empty state 노출 (cross-user 차단 + UX 차단 회피).
//
// 데이터 흐름:
//   page (RSC) → loadRewardCollection(userId) → RewardCardGrid (props 표시)
//   → RewardCollectionViewedBeacon (client mount 1회 analytics)
//
// 라우팅 분리 사유: 기존 /rewards 는 RewardProgress 캐시 기반 요약, 본 페이지는 RewardLog
// ground truth 기반 도감 (별 그리드 + AI 그림 placeholder). 두 페이지 코드 분리로 향후 AI
// 그림 모델 도입 시 본 페이지만 갱신 → /rewards 영향 0.

import Link from "next/link";
import { cookies } from "next/headers";
import { ANONYMOUS_USER_COOKIE } from "@/lib/anonymous-user";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { loadRewardCollection } from "@/lib/rewards/aggregator";
import { RewardCardGrid } from "@/components/rewards/RewardCardGrid";
import { RewardCollectionViewedBeacon } from "./RewardCollectionViewedBeacon";

export const metadata = {
  title: "보상 도감 — Speech-Therapy",
  description: "지금까지 모은 별과 나무, AI 그림을 한눈에 살펴봐요.",
};

// cookie 기반 user 식별 → 매 요청 fresh 읽기.
export const dynamic = "force-dynamic";

/**
 * 본인 식별 — auth 1순위, anonymous cookie 2순위.
 * 두 경로 모두 실패 시 undefined (RewardCardGrid 빈 상태 노출).
 */
async function resolveUserId(): Promise<string | undefined> {
  try {
    const supabase = await getSupabaseServerClient();
    const { data } = await supabase.auth.getUser();
    if (data.user?.id) return data.user.id;
  } catch {
    // env 미설정 / 네트워크 — 익명 폴백.
  }
  const cookieStore = await cookies();
  return cookieStore.get(ANONYMOUS_USER_COOKIE)?.value;
}

export default async function RewardCollectionPage() {
  const userId = await resolveUserId();
  const collection = userId
    ? await loadRewardCollection(userId)
    : { stars: 0, trees: 0, aiArtsCount: 0, aiArts: [] };

  return (
    <main
      data-testid="reward-collection-page"
      className="mx-auto max-w-5xl px-4 py-8 sm:py-12"
    >
      <p
        data-testid="reward-collection-disclaimer"
        className="mb-6 rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-100"
      >
        보상은 부모님과 함께 즐기는 놀이의 일부입니다. 의료적 평가가 아닙니다.
      </p>

      <header className="mb-8 space-y-2 text-center">
        <h1
          data-testid="reward-collection-title"
          className="text-3xl font-extrabold text-gray-900 sm:text-4xl dark:text-gray-100"
        >
          나의 보상 도감
        </h1>
        <p className="text-xl text-gray-700 dark:text-gray-300">
          지금까지 모은 별과 나무를 함께 살펴봐요.
        </p>
      </header>

      <RewardCardGrid
        stars={collection.stars}
        trees={collection.trees}
        aiArtsCount={collection.aiArtsCount}
        aiArts={collection.aiArts}
      />

      <div className="mt-10 text-center">
        <Link
          href="/missions"
          data-testid="reward-collection-mission-link"
          className="inline-flex min-h-[56px] items-center justify-center rounded-xl bg-emerald-500 px-8 py-3 text-xl font-bold text-white shadow-md transition hover:bg-emerald-600 focus:outline-none focus:ring-4 focus:ring-emerald-300"
        >
          미션 하러 가기
        </Link>
      </div>

      <RewardCollectionViewedBeacon
        stars={collection.stars}
        trees={collection.trees}
        aiArtsCount={collection.aiArtsCount}
      />
    </main>
  );
}
