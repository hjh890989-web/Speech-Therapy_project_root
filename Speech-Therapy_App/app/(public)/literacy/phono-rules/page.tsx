// 소리 변신 놀이 페이지 (Server Component) — CR-2026-007 후속.
//
// 게이트 (음운인식/추론/F15 선례):
//   - LITERACY_PHONO_RULES_ENABLED !== 'true' → '준비 중' 휴면 (KOPLAC 통과 전 default off).
//   - 활성 시: 자녀 월령(인증 user) 적격(만 2~7세) 확인 → 놀이. 미적격(연령 알 때) → 안내.
// CON-04: '치료/진단/장애' 0건 — 놀이 톤. 유도/연습만, 평가/채점 X.

import { getCachedUser } from "@/lib/auth/cached-get-user";
import { prisma } from "@/lib/db";
import { isPhonoRulesEnabled, isPhonoRulesAgeEligible } from "@/lib/literacy/phono-rules";
import {
  CLINICAL_PLAY_AGE_MIN_MONTHS,
  CLINICAL_PLAY_AGE_MAX_MONTHS,
} from "@/lib/literacy/vocabulary";
import { PhonoRulesClient } from "./PhonoRulesClient";

export const metadata = {
  title: "소리 변신 놀이 — Speech-Therapy",
  description: "글자와 다르게 나는 소리를 알아맞히는 놀이입니다. 의학적 평가가 아닌 발달 놀이예요.",
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
    console.error("phono-rules: user fetch failed", err);
    return null;
  }
}

export default async function PhonoRulesPage() {
  // ── 게이트 1: 활성 플래그 (KOPLAC 전 휴면) ──
  if (!isPhonoRulesEnabled()) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-16 text-center" data-testid="phono-rules-page">
        <p className="text-4xl" aria-hidden="true">🔁</p>
        <h1 className="mt-3 text-2xl font-bold">소리 변신 놀이는 곧 만나요</h1>
        <p data-testid="phono-rules-coming-soon" className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          글자와 다르게 나는 소리를 알아맞히는 놀이를 준비하고 있어요. 조금만 기다려 주세요 😊
        </p>
      </main>
    );
  }

  // ── 게이트 2: 연령 (만 2~7세, 월령을 알 때만 강제) ──
  const ageMonths = await loadChildAgeMonths();
  const ageKnownButIneligible = ageMonths !== null && !isPhonoRulesAgeEligible(ageMonths);

  if (ageKnownButIneligible) {
    return (
      <PageShell>
        <section
          data-testid="phono-rules-age-gate"
          className="rounded-lg border border-sky-200 bg-sky-50 p-6 text-sky-900 dark:border-sky-800 dark:bg-sky-950/30 dark:text-sky-100"
        >
          <h2 className="text-lg font-semibold">이 놀이는 만 2~7세 친구들을 위한 활동이에요</h2>
          <p className="mt-2 text-sm">
            소리 변신 놀이는 소리의 차이를 알아채기 좋은 또래(약 {CLINICAL_PLAY_AGE_MIN_MONTHS / 12}~
            {CLINICAL_PLAY_AGE_MAX_MONTHS / 12}세)에게 맞춰져 있어요. 지금은 다른 놀이로 즐겁게 함께해 보아요.
          </p>
        </section>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <PhonoRulesClient />
    </PageShell>
  );
}

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <main
      className="mx-auto max-w-2xl px-4 py-8 sm:py-12"
      data-testid="phono-rules-page"
      aria-labelledby="phono-rules-heading"
    >
      {/* CON-04 disclaimer */}
      <p
        data-testid="disclaimer"
        className="mb-6 rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-100"
      >
        본 놀이는 아이가 글자와 다르게 나는 소리를 알아채도록 돕는 <strong>발달 놀이</strong>예요.
        점수를 매기는 게 아니라 함께 소리를 즐기는 시간이에요. 의학적 평가가 아닙니다.
      </p>
      <header className="mb-6">
        <h1 id="phono-rules-heading" className="text-2xl font-bold sm:text-3xl">
          소리 변신 놀이
        </h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          글자를 보고, 자연스럽게 읽으면 어떤 소리가 나는지 함께 찾아보아요.
        </p>
      </header>
      {children}
    </main>
  );
}
