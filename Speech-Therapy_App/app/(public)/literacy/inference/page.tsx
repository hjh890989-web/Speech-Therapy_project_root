// FR-Q-LIT-01 (CR-2026-007 / REQ-FUNC-CL-11) — 추론 4수준 미니게임 페이지 (Server Component).
//
// 게이트 (음운인식/해독/RAN/유창성/F15 선례 + ADR-14):
//   - LITERACY_INFERENCE_ENABLED !== 'true' → '준비 중' 휴면 (KOPLAC CL-11 통과 전 default off).
//   - 활성 시: 자녀 월령(인증 user) 적격(만 5-7세, CL-12) 확인 → 게임. 미적격(연령 알 때) → 안내.
// CON-04: '치료/진단/장애' 0건 — 놀이 톤. 유도만, 평가/채점 X.

import { getCachedUser } from "@/lib/auth/cached-get-user";
import { prisma } from "@/lib/db";
import { isInferenceEnabled, isInferenceAgeEligible } from "@/lib/literacy/inference";
import { PA_AGE_MIN_MONTHS, PA_AGE_MAX_MONTHS } from "@/lib/literacy/phonological-awareness";
import { InferenceClient } from "./InferenceClient";

export const metadata = {
  title: "생각 나누기 — Speech-Therapy",
  description: "짧은 이야기로 함께 생각을 나누는 놀이입니다. 의학적 평가가 아닌 발달 놀이예요.",
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
    console.error("inference: user fetch failed", err);
    return null;
  }
}

export default async function InferencePage() {
  // ── 게이트 1: 활성 플래그 (KOPLAC 전 휴면) ──
  if (!isInferenceEnabled()) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-16 text-center" data-testid="inference-page">
        <p className="text-4xl" aria-hidden="true">💭</p>
        <h1 className="mt-3 text-2xl font-bold">생각 나누기는 곧 만나요</h1>
        <p data-testid="inference-coming-soon" className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          짧은 이야기로 함께 생각을 나누는 놀이를 준비하고 있어요. 조금만 기다려 주세요 😊
        </p>
      </main>
    );
  }

  // ── 게이트 2: 연령 (만 5-7세, 월령을 알 때만 강제) ──
  const ageMonths = await loadChildAgeMonths();
  const ageKnownButIneligible = ageMonths !== null && !isInferenceAgeEligible(ageMonths);

  if (ageKnownButIneligible) {
    return (
      <PageShell>
        <section
          data-testid="inference-age-gate"
          className="rounded-lg border border-sky-200 bg-sky-50 p-6 text-sky-900 dark:border-sky-800 dark:bg-sky-950/30 dark:text-sky-100"
        >
          <h2 className="text-lg font-semibold">이 놀이는 만 5~7세 친구들을 위한 활동이에요</h2>
          <p className="mt-2 text-sm">
            생각 나누기는 이야기를 이해하기 시작하는 또래(약 {PA_AGE_MIN_MONTHS / 12}~
            {PA_AGE_MAX_MONTHS / 12}세)에게 맞춰져 있어요. 지금은 다른 소리 놀이로 즐겁게 함께해 보아요.
          </p>
        </section>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <InferenceClient />
    </PageShell>
  );
}

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <main
      className="mx-auto max-w-2xl px-4 py-8 sm:py-12"
      data-testid="inference-page"
      aria-labelledby="inference-heading"
    >
      {/* CON-04 disclaimer */}
      <p
        data-testid="disclaimer"
        className="mb-6 rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-100"
      >
        본 놀이는 아이가 이야기로 생각을 나누도록 돕는 <strong>발달 놀이</strong>예요. 정답을 맞히는 게
        아니라 함께 생각해 보는 시간이에요. 의학적 평가가 아닙니다.
      </p>
      <header className="mb-6">
        <h1 id="inference-heading" className="text-2xl font-bold sm:text-3xl">
          생각 나누기
        </h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          짧은 이야기를 듣고, 아이와 함께 천천히 생각을 나눠 보아요.
        </p>
      </header>
      {children}
    </main>
  );
}
