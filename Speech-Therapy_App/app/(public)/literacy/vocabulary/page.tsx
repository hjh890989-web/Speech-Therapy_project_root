// 어휘 놀이 페이지 (Server Component) — CR-2026-007 후속.
//
// 게이트 (음운인식/추론/F15 선례):
//   - LITERACY_VOCAB_ENABLED !== 'true' → '준비 중' 휴면 (KOPLAC 통과 전 default off).
//   - 활성 시: 자녀 월령(인증 user) 적격(만 2~7세) 확인 → 놀이. 미적격(연령 알 때) → 안내.
// CON-04: '치료/진단/장애' 0건 — 놀이 톤. 유도/연습만, 평가/채점 X.

import { getCachedUser } from "@/lib/auth/cached-get-user";
import { prisma } from "@/lib/db";
import {
  isVocabEnabled,
  isVocabAgeEligible,
  CLINICAL_PLAY_AGE_MIN_MONTHS,
  CLINICAL_PLAY_AGE_MAX_MONTHS,
} from "@/lib/literacy/vocabulary";
import { VocabularyClient } from "./VocabularyClient";

export const metadata = {
  title: "낱말 놀이 — Speech-Therapy",
  description: "그림을 보고 이름을 말하며 낱말을 함께 익히는 놀이입니다. 의학적 평가가 아닌 발달 놀이예요.",
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
    console.error("vocabulary: user fetch failed", err);
    return null;
  }
}

export default async function VocabularyPage() {
  // ── 게이트 1: 활성 플래그 (KOPLAC 전 휴면) ──
  if (!isVocabEnabled()) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-16 text-center" data-testid="vocabulary-page">
        <p className="text-4xl" aria-hidden="true">📚</p>
        <h1 className="mt-3 text-2xl font-bold">낱말 놀이는 곧 만나요</h1>
        <p data-testid="vocabulary-coming-soon" className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          그림을 보고 이름을 말하며 낱말을 익히는 놀이를 준비하고 있어요. 조금만 기다려 주세요 😊
        </p>
      </main>
    );
  }

  // ── 게이트 2: 연령 (만 2~7세, 월령을 알 때만 강제) ──
  const ageMonths = await loadChildAgeMonths();
  const ageKnownButIneligible = ageMonths !== null && !isVocabAgeEligible(ageMonths);

  if (ageKnownButIneligible) {
    return (
      <PageShell>
        <section
          data-testid="vocabulary-age-gate"
          className="rounded-lg border border-sky-200 bg-sky-50 p-6 text-sky-900 dark:border-sky-800 dark:bg-sky-950/30 dark:text-sky-100"
        >
          <h2 className="text-lg font-semibold">이 놀이는 만 2~7세 친구들을 위한 활동이에요</h2>
          <p className="mt-2 text-sm">
            낱말 놀이는 낱말을 익히기 좋은 또래(약 {CLINICAL_PLAY_AGE_MIN_MONTHS / 12}~
            {CLINICAL_PLAY_AGE_MAX_MONTHS / 12}세)에게 맞춰져 있어요. 지금은 다른 놀이로 즐겁게 함께해 보아요.
          </p>
        </section>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <VocabularyClient />
    </PageShell>
  );
}

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <main
      className="mx-auto max-w-2xl px-4 py-8 sm:py-12"
      data-testid="vocabulary-page"
      aria-labelledby="vocabulary-heading"
    >
      {/* CON-04 disclaimer */}
      <p
        data-testid="disclaimer"
        className="mb-6 rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-100"
      >
        본 놀이는 아이가 그림을 보고 낱말을 말하며 익히도록 돕는 <strong>발달 놀이</strong>예요.
        점수를 매기는 게 아니라 함께 낱말을 즐기는 시간이에요. 의학적 평가가 아닙니다.
      </p>
      <header className="mb-6">
        <h1 id="vocabulary-heading" className="text-2xl font-bold sm:text-3xl">
          낱말 놀이
        </h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          그림을 보고 이름을 말해 보고, 같은 종류끼리 찾아보아요.
        </p>
      </header>
      {children}
    </main>
  );
}
