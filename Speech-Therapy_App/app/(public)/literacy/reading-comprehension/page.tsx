// FR-Q-LIT (CR-2026-009 / Phase 3b S3) — 사실적 읽기이해 미니게임 페이지 (Server Component).
//
// 게이트: LITERACY_COMPREHENSION_ENABLED !== 'true' → '준비 중' 휴면 / 활성 시 연령(만9~11=초3~4,
//   월령 알 때만 강제). CON-04: '치료/진단/장애' 0건 — 놀이 톤(연습-only).

import { getCachedUser } from "@/lib/auth/cached-get-user";
import { prisma } from "@/lib/db";
import {
  isComprehensionEnabled,
  isComprehensionAgeEligible,
  COMPREHENSION_AGE_MIN_MONTHS,
  COMPREHENSION_AGE_MAX_MONTHS,
  buildComprehensionSession,
} from "@/lib/literacy/reading-comprehension";
import { ReadingComprehensionClient } from "./ReadingComprehensionClient";

export const metadata = {
  title: "글 읽고 답하기 — Speech-Therapy",
  description:
    "짧은 글을 읽고 내용을 확인하는 읽기 놀이입니다. 의학적 평가가 아닌 발달 놀이예요.",
};

export const dynamic = "force-dynamic";

async function loadChildAgeMonths(): Promise<number | null> {
  const user = await getCachedUser();
  if (!user) return null;
  try {
    const row = await prisma.user.findUnique({
      where: { id: user.id },
      select: { childAgeMonths: true },
    });
    return row?.childAgeMonths ?? null;
  } catch (err) {
    console.error("reading-comprehension: user fetch failed", err);
    return null;
  }
}

export default async function ReadingComprehensionPage() {
  // ── 게이트 1: 활성 플래그 (default off) ──
  if (!isComprehensionEnabled()) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-16 text-center" data-testid="reading-comprehension-page">
        <p className="text-4xl" aria-hidden="true">📖</p>
        <h1 className="mt-3 text-2xl font-bold">글 읽고 답하기는 곧 만나요</h1>
        <p
          data-testid="reading-comprehension-coming-soon"
          className="mt-2 text-sm text-gray-600 dark:text-gray-400"
        >
          짧은 글을 읽고 내용을 알아맞히는 재미있는 읽기 놀이를 준비하고 있어요. 조금만 기다려 주세요 😊
        </p>
      </main>
    );
  }

  // ── 게이트 2: 연령 (만 9~11세=초3~4, 월령을 알 때만 강제) ──
  const ageMonths = await loadChildAgeMonths();
  const ageKnownButIneligible =
    ageMonths !== null && !isComprehensionAgeEligible(ageMonths);

  if (ageKnownButIneligible) {
    return (
      <PageShell>
        <section
          data-testid="reading-comprehension-age-gate"
          className="rounded-lg border border-sky-200 bg-sky-50 p-6 text-sky-900 dark:border-sky-800 dark:bg-sky-950/30 dark:text-sky-100"
        >
          <h2 className="text-lg font-semibold">이 놀이는 초등 3~4학년 친구들을 위한 활동이에요</h2>
          <p className="mt-2 text-sm">
            글 읽고 답하기는 글의 내용을 확인하는 또래(약 {COMPREHENSION_AGE_MIN_MONTHS / 12}~
            {Math.floor(COMPREHENSION_AGE_MAX_MONTHS / 12)}세)에게 맞춰져 있어요. 지금은 다른 말놀이로
            즐겁게 함께해 보아요.
          </p>
        </section>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <ReadingComprehensionClient items={buildComprehensionSession()} />
    </PageShell>
  );
}

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <main
      className="mx-auto max-w-2xl px-4 py-8 sm:py-12"
      data-testid="reading-comprehension-page"
      aria-labelledby="reading-comprehension-heading"
    >
      <p
        data-testid="disclaimer"
        className="mb-6 rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-100"
      >
        본 놀이는 아이가 글을 읽고 내용을 즐겁게 확인하도록 돕는 <strong>발달 놀이</strong>예요. 의학적 평가가 아닙니다.
      </p>
      <header className="mb-6">
        <h1 id="reading-comprehension-heading" className="text-2xl font-bold sm:text-3xl">
          글 읽고 답하기
        </h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          짧은 글을 읽고, 내용에 맞는 답을 골라요. 다시 읽어도 좋아요.
        </p>
      </header>
      {children}
    </main>
  );
}
