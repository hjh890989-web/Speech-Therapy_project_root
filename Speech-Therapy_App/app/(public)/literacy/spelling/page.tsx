// FR-Q-LIT (CR-2026-009 / Phase 3b S2) — 받아쓰기·철자 미니게임 페이지 (Server Component).
//
// 게이트 (literacy 선례):
//   - LITERACY_SPELLING_ENABLED !== 'true' → '준비 중' 휴면 (default off).
//   - 활성 시: 자녀 월령(인증 user) 적격(만 7~9세=초1~3) 확인 → 게임. 미적격(연령 알 때) → 안내.
//     익명/월령 미상 → 게임 노출(연령 게이트는 알 때만 강제).
// CON-04: '치료/진단/장애' 0건 — 놀이 톤. 본 미니게임 = 비의료 발달 놀이(연습-only).

import { getCachedUser } from "@/lib/auth/cached-get-user";
import { prisma } from "@/lib/db";
import {
  isSpellingEnabled,
  isSpellingAgeEligible,
  SPELLING_AGE_MIN_MONTHS,
  SPELLING_AGE_MAX_MONTHS,
  buildSpellingSession,
} from "@/lib/literacy/spelling";
import { SpellingClient } from "./SpellingClient";

export const metadata = {
  title: "받아쓰기 놀이 — Speech-Therapy",
  description:
    "소리를 듣고 바르게 쓴 글자를 골라보는 철자 놀이입니다. 의학적 평가가 아닌 발달 놀이예요.",
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
    console.error("spelling: user fetch failed", err);
    return null;
  }
}

export default async function SpellingPage() {
  // ── 게이트 1: 활성 플래그 (default off) ──
  if (!isSpellingEnabled()) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-16 text-center" data-testid="spelling-page">
        <p className="text-4xl" aria-hidden="true">✏️</p>
        <h1 className="mt-3 text-2xl font-bold">받아쓰기 놀이는 곧 만나요</h1>
        <p
          data-testid="spelling-coming-soon"
          className="mt-2 text-sm text-gray-600 dark:text-gray-400"
        >
          소리를 듣고 바르게 쓴 글자를 찾는 재미있는 철자 놀이를 준비하고 있어요. 조금만 기다려 주세요 😊
        </p>
      </main>
    );
  }

  // ── 게이트 2: 연령 (만 7~9세=초1~3, 월령을 알 때만 강제) ──
  const ageMonths = await loadChildAgeMonths();
  const ageKnownButIneligible = ageMonths !== null && !isSpellingAgeEligible(ageMonths);

  if (ageKnownButIneligible) {
    return (
      <PageShell>
        <section
          data-testid="spelling-age-gate"
          className="rounded-lg border border-sky-200 bg-sky-50 p-6 text-sky-900 dark:border-sky-800 dark:bg-sky-950/30 dark:text-sky-100"
        >
          <h2 className="text-lg font-semibold">이 놀이는 초등 1~3학년 친구들을 위한 활동이에요</h2>
          <p className="mt-2 text-sm">
            받아쓰기 놀이는 글자 규칙을 익히는 또래(약 {SPELLING_AGE_MIN_MONTHS / 12}~
            {Math.floor(SPELLING_AGE_MAX_MONTHS / 12)}세)에게 맞춰져 있어요. 지금은 다른 말놀이로
            즐겁게 함께해 보아요.
          </p>
        </section>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <SpellingClient items={buildSpellingSession()} />
    </PageShell>
  );
}

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <main
      className="mx-auto max-w-2xl px-4 py-8 sm:py-12"
      data-testid="spelling-page"
      aria-labelledby="spelling-heading"
    >
      {/* CON-04 disclaimer */}
      <p
        data-testid="disclaimer"
        className="mb-6 rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-100"
      >
        본 놀이는 아이가 글자 규칙과 친해지도록 돕는 <strong>발달 놀이</strong>예요. 의학적 평가가 아닙니다.
      </p>
      <header className="mb-6">
        <h1 id="spelling-heading" className="text-2xl font-bold sm:text-3xl">
          받아쓰기 놀이
        </h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          부모님이 들려주는 소리를 듣고, 바르게 쓴 글자를 골라요.
        </p>
      </header>
      {children}
    </main>
  );
}
