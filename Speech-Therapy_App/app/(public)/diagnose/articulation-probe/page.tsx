// 다중 단어/위치 조음 프로브 페이지 (Server Component) — 초기 진단 보강(additive).
//
// 게이트 (literacy/F15 선례):
//   - ARTICULATION_PROBE_ENABLED !== 'true' → '준비 중' 휴면 (default off).
//   - 활성 시: 자녀 월령(인증 user) 적격(만 2~7세) 확인 → 프로브. 미적격(연령 알 때) → 안내.
// CON-04: '치료/진단/장애' 0건. 기존 단일단어 진단 흐름은 미수정(하위호환).

import { getCachedUser } from "@/lib/auth/cached-get-user";
import { prisma } from "@/lib/db";
import {
  isArticulationProbeEnabled,
  isArticulationProbeAgeEligible,
  ARTICULATION_PROBE_AGE_MIN_MONTHS,
  ARTICULATION_PROBE_AGE_MAX_MONTHS,
} from "@/lib/diagnose/articulation-probe";
import { ArticulationProbeClient } from "./ArticulationProbeClient";

export const metadata = {
  title: "여러 낱말 발음 확인 — Speech-Therapy",
  description: "한 소리를 여러 낱말·위치에서 확인해 보는 활동입니다. 의학적 평가가 아닌 발달 참고 자료입니다.",
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
    console.error("articulation-probe: user fetch failed", err);
    return null;
  }
}

export default async function ArticulationProbePage() {
  if (!isArticulationProbeEnabled()) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-16 text-center" data-testid="articulation-probe-page">
        <p className="text-4xl" aria-hidden="true">🗣️</p>
        <h1 className="mt-3 text-2xl font-bold">여러 낱말 발음 확인은 곧 만나요</h1>
        <p data-testid="articulation-probe-coming-soon" className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          한 소리를 여러 낱말·위치에서 확인해 보는 활동을 준비하고 있어요. 조금만 기다려 주세요 😊
        </p>
      </main>
    );
  }

  const ageMonths = await loadChildAgeMonths();
  const ageKnownButIneligible = ageMonths !== null && !isArticulationProbeAgeEligible(ageMonths);

  if (ageKnownButIneligible) {
    return (
      <PageShell>
        <section
          data-testid="articulation-probe-age-gate"
          className="rounded-lg border border-sky-200 bg-sky-50 p-6 text-sky-900 dark:border-sky-800 dark:bg-sky-950/30 dark:text-sky-100"
        >
          <h2 className="text-lg font-semibold">이 활동은 만 2~7세 친구들을 위한 확인이에요</h2>
          <p className="mt-2 text-sm">
            여러 낱말 발음 확인은 또래(약 {ARTICULATION_PROBE_AGE_MIN_MONTHS / 12}~
            {ARTICULATION_PROBE_AGE_MAX_MONTHS / 12}세)에게 맞춰져 있어요. 지금은 다른 활동으로 함께해 보아요.
          </p>
        </section>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <ArticulationProbeClient />
    </PageShell>
  );
}

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <main
      className="mx-auto max-w-2xl px-4 py-8 sm:py-12"
      data-testid="articulation-probe-page"
      aria-labelledby="articulation-probe-heading"
    >
      <p
        data-testid="disclaimer"
        className="mb-6 rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-100"
      >
        한 소리를 <strong>여러 낱말과 위치</strong>에서 확인해 보는 활동이에요. 한 단어보다 더 고르게
        살펴볼 수 있어요. 점수를 매겨 판정하는 게 아니라 함께 확인하는 시간이며, 의학적 평가가 아닙니다.
      </p>
      <header className="mb-6">
        <h1 id="articulation-probe-heading" className="text-2xl font-bold sm:text-3xl">
          여러 낱말 발음 확인
        </h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          소리를 하나 고르고, 그 소리가 들어간 여러 낱말을 차례로 말해 보아요.
        </p>
      </header>
      {children}
    </main>
  );
}
