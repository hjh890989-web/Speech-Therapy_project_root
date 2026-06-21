// 구강 운동 프로브 페이지 (Server Component) — 초기 진단 보강(측정값만).
//
// 게이트 (literacy/F15 선례):
//   - ORAL_MOTOR_PROBE_ENABLED !== 'true' → '준비 중' 휴면 (규준 자문 전 default off).
//   - 활성 시: 자녀 월령(인증 user) 적격(만 3~7세) 확인 → 측정. 미적격(연령 알 때) → 안내.
// CON-04: '치료/진단/장애' 0건 — 확인 톤. **측정만, 판정/규준 X.**

import { getCachedUser } from "@/lib/auth/cached-get-user";
import { prisma } from "@/lib/db";
import {
  isOralMotorEnabled,
  isOralMotorAgeEligible,
  ORAL_MOTOR_AGE_MIN_MONTHS,
  ORAL_MOTOR_AGE_MAX_MONTHS,
} from "@/lib/diagnose/oral-motor";
import { OralMotorClient } from "./OralMotorClient";

export const metadata = {
  title: "입 운동 확인 — Speech-Therapy",
  description: "빠르게 말하기·길게 소리내기로 입 운동을 측정해 보는 활동입니다. 의학적 평가가 아닙니다.",
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
    console.error("oral-motor: user fetch failed", err);
    return null;
  }
}

export default async function OralMotorPage() {
  // ── 게이트 1: 활성 플래그 (규준 자문 전 휴면) ──
  if (!isOralMotorEnabled()) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-16 text-center" data-testid="oral-motor-page">
        <p className="text-4xl" aria-hidden="true">👄</p>
        <h1 className="mt-3 text-2xl font-bold">입 운동 확인은 곧 만나요</h1>
        <p data-testid="oral-motor-coming-soon" className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          빠르게 말하기·길게 소리내기로 입 운동을 측정해 보는 활동을 준비하고 있어요. 조금만 기다려 주세요 😊
        </p>
      </main>
    );
  }

  // ── 게이트 2: 연령 (만 3~7세, 월령을 알 때만 강제) ──
  const ageMonths = await loadChildAgeMonths();
  const ageKnownButIneligible = ageMonths !== null && !isOralMotorAgeEligible(ageMonths);

  if (ageKnownButIneligible) {
    return (
      <PageShell>
        <section
          data-testid="oral-motor-age-gate"
          className="rounded-lg border border-sky-200 bg-sky-50 p-6 text-sky-900 dark:border-sky-800 dark:bg-sky-950/30 dark:text-sky-100"
        >
          <h2 className="text-lg font-semibold">이 활동은 만 3~7세 친구들을 위한 측정이에요</h2>
          <p className="mt-2 text-sm">
            입 운동 확인은 빠르게 말하기·길게 소리내기가 가능한 또래(약 {ORAL_MOTOR_AGE_MIN_MONTHS / 12}~
            {ORAL_MOTOR_AGE_MAX_MONTHS / 12}세)에게 맞춰져 있어요. 지금은 다른 활동으로 즐겁게 함께해 보아요.
          </p>
        </section>
      </PageShell>
    );
  }

  return (
    <PageShell>
      {/* 연령 규준 참고 밴드용 월령 전달(없으면 client 에서 밴드 미표시). */}
      <OralMotorClient ageMonths={ageMonths} />
    </PageShell>
  );
}

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <main
      className="mx-auto max-w-2xl px-4 py-8 sm:py-12"
      data-testid="oral-motor-page"
      aria-labelledby="oral-motor-heading"
    >
      {/* CON-04 disclaimer — 측정만, 판정 아님. */}
      <p
        data-testid="disclaimer"
        className="mb-6 rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-100"
      >
        입 운동을 <strong>측정</strong>해 보는 활동이에요. 잘하고 못하고를 판정하는 게 아니라 함께
        측정값을 확인하는 시간이에요. 또래 비교 기준은 준비 중이며, 의학적 평가가 아닙니다.
      </p>
      <header className="mb-6">
        <h1 id="oral-motor-heading" className="text-2xl font-bold sm:text-3xl">
          입 운동 확인
        </h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          빠르게 말하기와 길게 소리내기로, 입과 목소리의 움직임을 함께 측정해 보아요.
        </p>
      </header>
      {children}
    </main>
  );
}
