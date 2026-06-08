// FR-Q-LIT-01 (CR-2026-007 / REQ-FUNC-CL-10) — RAN 미니게임 페이지 (Server Component).
//
// 게이트 (음운인식/해독/F15 선례):
//   - LITERACY_RAN_ENABLED !== 'true' → '준비 중' 휴면 (KOPLAC CL-10 통과 전 default off).
//   - 활성 시: 자녀 월령(인증 user) 적격(만 5~7세, CL-12) 확인 → 게임. 미적격(연령 알 때) → 안내.
// CON-04: '치료/진단/장애' 0건 + ADR-04 '학습장애/난독' 미노출 — 놀이 톤.

import { getCachedUser } from "@/lib/auth/cached-get-user";
import { prisma } from "@/lib/db";
import { isRanEnabled, isRanAgeEligible } from "@/lib/literacy/ran";
import { PA_AGE_MIN_MONTHS, PA_AGE_MAX_MONTHS } from "@/lib/literacy/phonological-awareness";
import { RanGameClient } from "./RanGameClient";

export const metadata = {
  title: "빨리 이름대기 — Speech-Therapy",
  description: "그림과 색깔을 빠르게 이름 붙여 보는 놀이입니다. 의학적 평가가 아닌 발달 놀이예요.",
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
    console.error("ran: user fetch failed", err);
    return null;
  }
}

export default async function RanPage() {
  // ── 게이트 1: 활성 플래그 (KOPLAC 전 휴면) ──
  if (!isRanEnabled()) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-16 text-center" data-testid="ran-page">
        <p className="text-4xl" aria-hidden="true">🎨</p>
        <h1 className="mt-3 text-2xl font-bold">빨리 이름대기는 곧 만나요</h1>
        <p data-testid="ran-coming-soon" className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          그림과 색깔을 빠르게 이름 붙여 보는 놀이를 준비하고 있어요. 조금만 기다려 주세요 😊
        </p>
      </main>
    );
  }

  // ── 게이트 2: 연령 (만 5~7세, 월령을 알 때만 강제) ──
  const ageMonths = await loadChildAgeMonths();
  const ageKnownButIneligible = ageMonths !== null && !isRanAgeEligible(ageMonths);

  if (ageKnownButIneligible) {
    return (
      <PageShell>
        <section
          data-testid="ran-age-gate"
          className="rounded-lg border border-sky-200 bg-sky-50 p-6 text-sky-900 dark:border-sky-800 dark:bg-sky-950/30 dark:text-sky-100"
        >
          <h2 className="text-lg font-semibold">이 놀이는 만 5~7세 친구들을 위한 활동이에요</h2>
          <p className="mt-2 text-sm">
            빨리 이름대기는 또래(약 {PA_AGE_MIN_MONTHS / 12}~{PA_AGE_MAX_MONTHS / 12}세)에게 맞춰져 있어요.
            지금은 발음 미션으로 즐겁게 함께해 보아요.
          </p>
        </section>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <RanGameClient />
    </PageShell>
  );
}

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <main
      className="mx-auto max-w-2xl px-4 py-8 sm:py-12"
      data-testid="ran-page"
      aria-labelledby="ran-heading"
    >
      {/* CON-04 disclaimer */}
      <p
        data-testid="disclaimer"
        className="mb-6 rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-100"
      >
        본 놀이는 아이가 빠르게 이름 붙이기에 익숙해지도록 돕는 <strong>발달 놀이</strong>예요. 의학적 평가가 아닙니다.
      </p>
      <header className="mb-6">
        <h1 id="ran-heading" className="text-2xl font-bold sm:text-3xl">
          빨리 이름대기
        </h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          왼쪽 위부터 차례대로, 보이는 대로 빠르게 이름을 말해 봐요.
        </p>
      </header>
      {children}
    </main>
  );
}
