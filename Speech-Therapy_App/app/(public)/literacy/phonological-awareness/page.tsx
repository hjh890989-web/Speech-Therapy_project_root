// FR-Q-LIT-01 (CR-2026-007 / REQ-FUNC-CL-08) — 음운 인식 미니게임 페이지 (Server Component).
//
// 게이트 (F15 /chat 선례):
//   - LITERACY_PA_ENABLED !== 'true' → '준비 중' 휴면 (KOPLAC 자문 통과 전 default off).
//   - 활성 시: 자녀 월령(인증 user) 적격(만 5~7세, CL-12) 확인 → 게임. 미적격(연령 알 때) → 안내.
//     익명/월령 미상 → 게임 노출(연령 게이트는 알 때만 강제).
// CON-04: '치료/진단/장애' 0건 — 놀이 톤. 본 미니게임 = 비의료 발달 놀이.

import { getCachedUser } from "@/lib/auth/cached-get-user";
import { prisma } from "@/lib/db";
import {
  isPhonologicalAwarenessEnabled,
  isPaAgeEligible,
  PA_AGE_MIN_MONTHS,
  PA_AGE_MAX_MONTHS,
  buildPaSession,
} from "@/lib/literacy/phonological-awareness";
import { PaGameClient } from "./PaGameClient";

export const metadata = {
  title: "소리 놀이 — Speech-Therapy",
  description: "소리를 합치고 빼고 바꿔 보는 말소리 놀이입니다. 의학적 평가가 아닌 발달 놀이예요.",
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
    console.error("phonological-awareness: user fetch failed", err);
    return null;
  }
}

export default async function PhonologicalAwarenessPage() {
  // ── 게이트 1: 활성 플래그 (KOPLAC 전 휴면) ──
  if (!isPhonologicalAwarenessEnabled()) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-16 text-center" data-testid="pa-page">
        <p className="text-4xl" aria-hidden="true">🔤</p>
        <h1 className="mt-3 text-2xl font-bold">소리 놀이는 곧 만나요</h1>
        <p
          data-testid="pa-coming-soon"
          className="mt-2 text-sm text-gray-600 dark:text-gray-400"
        >
          소리를 합치고 빼고 바꿔 보는 재미있는 말소리 놀이를 준비하고 있어요. 조금만 기다려 주세요 😊
        </p>
      </main>
    );
  }

  // ── 게이트 2: 연령 (만 5~7세, 월령을 알 때만 강제) ──
  const ageMonths = await loadChildAgeMonths();
  const ageKnownButIneligible = ageMonths !== null && !isPaAgeEligible(ageMonths);

  if (ageKnownButIneligible) {
    return (
      <PageShell>
        <section
          data-testid="pa-age-gate"
          className="rounded-lg border border-sky-200 bg-sky-50 p-6 text-sky-900 dark:border-sky-800 dark:bg-sky-950/30 dark:text-sky-100"
        >
          <h2 className="text-lg font-semibold">이 놀이는 만 5~7세 친구들을 위한 활동이에요</h2>
          <p className="mt-2 text-sm">
            소리 놀이는 글자 읽기를 준비하는 또래(약 {PA_AGE_MIN_MONTHS / 12}~{PA_AGE_MAX_MONTHS / 12}세)에게
            맞춰져 있어요. 지금은 발음 미션으로 즐겁게 함께해 보아요.
          </p>
        </section>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <PaGameClient items={buildPaSession()} />
    </PageShell>
  );
}

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <main
      className="mx-auto max-w-2xl px-4 py-8 sm:py-12"
      data-testid="pa-page"
      aria-labelledby="pa-heading"
    >
      {/* CON-04 disclaimer */}
      <p
        data-testid="disclaimer"
        className="mb-6 rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-100"
      >
        본 놀이는 아이가 말소리에 친해지도록 돕는 <strong>발달 놀이</strong>예요. 의학적 평가가 아닙니다.
      </p>
      <header className="mb-6">
        <h1 id="pa-heading" className="text-2xl font-bold sm:text-3xl">
          소리 놀이
        </h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          소리를 합치고, 빼고, 바꿔 보며 말소리와 친해져요.
        </p>
      </header>
      {children}
    </main>
  );
}
