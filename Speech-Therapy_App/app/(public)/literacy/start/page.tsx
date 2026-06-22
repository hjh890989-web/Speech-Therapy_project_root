// 문해력 시작 — 발달 단계 라우팅 진입점 (Server Component) — CR-2026-009 (학령기 전면확장).
//
// 자녀 월령 → 5단계(stages.ts) 판정 → 그 단계의 활성 놀이 안내. 발음 diagnose(만2~7)와
//   분리된 literacy 전용 연령 도메인(만 2~12세, 24~144개월).
//
// ⚠️ 현 단계(scaffold): 채점·참고밴드 미산출 = '연습-only'(임상 규준 Phase 2 / KOPLAC 검증 전).
//    점수 산출 probe(저장·밴드)는 후속(연령상한 해제 + Prisma 영속 + 규준 wiring).
// 게이트: 활성 놀이가 하나도 없으면(플래그 전부 off) '준비 중' — 미공개 콘텐츠 누출 없음.
// CON-04: '치료/진단/장애' 0건 — 놀이 톤. 본 진입점 = 비의료 발달 안내.

import Link from "next/link";

import { getCachedUser } from "@/lib/auth/cached-get-user";
import { prisma } from "@/lib/db";
import { stageForAgeMonths } from "@/lib/literacy/stages";
import { enabledGamesForAgeOrAll } from "@/lib/literacy/start";

export const metadata = {
  title: "문해력 시작 — Speech-Therapy",
  description:
    "아이 연령에 맞는 읽기·말 놀이를 안내해요. 의학적 평가가 아닌 발달 놀이예요.",
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
    console.error("literacy/start: user fetch failed", err);
    return null;
  }
}

export default async function LiteracyStartPage() {
  const ageMonths = await loadChildAgeMonths();
  const stage = ageMonths !== null ? stageForAgeMonths(ageMonths) : null;
  // 월령을 알면 그 단계 놀이만, 모르면(익명) 전체 활성 놀이를 안내.
  const games = enabledGamesForAgeOrAll(ageMonths);

  return (
    <main
      className="mx-auto max-w-2xl px-4 py-8 sm:py-12"
      data-testid="literacy-start"
      aria-labelledby="literacy-start-heading"
    >
      <p
        data-testid="disclaimer"
        className="mb-6 rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-100"
      >
        아이의 발달 단계에 맞춰 <strong>읽기·말 놀이</strong>를 안내해요. 점수를 매기는 게
        아니라 함께 즐기는 시간이에요. 의학적 평가가 아닙니다.
      </p>

      <header className="mb-6">
        <h1 id="literacy-start-heading" className="text-2xl font-bold sm:text-3xl">
          문해력 시작
        </h1>
        {stage ? (
          <p
            data-testid="literacy-start-stage"
            className="mt-1 text-sm text-gray-600 dark:text-gray-400"
          >
            지금은 <strong>{stage.title}</strong> 시기({stage.ageLabel})예요. {stage.blurb}
          </p>
        ) : (
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            아이와 함께 즐길 수 있는 읽기·말 놀이를 모았어요.
          </p>
        )}
      </header>

      {games.length === 0 ? (
        <section
          data-testid="literacy-start-empty"
          className="rounded-lg border border-sky-200 bg-sky-50 p-6 text-center text-sky-900 dark:border-sky-800 dark:bg-sky-950/30 dark:text-sky-100"
        >
          <p className="text-4xl" aria-hidden="true">🧩</p>
          <p className="mt-2 text-sm">
            이 시기에 맞는 놀이를 준비하고 있어요. 조금만 기다려 주세요 😊
          </p>
        </section>
      ) : (
        <ul
          className="grid grid-cols-1 gap-3 sm:grid-cols-2"
          data-testid="literacy-start-list"
        >
          {games.map((g) => (
            <li key={g.slug}>
              <Link
                href={`/literacy/${g.slug}`}
                data-testid={`literacy-start-card-${g.slug}`}
                className="flex h-full items-start gap-3 rounded-2xl border-2 border-emerald-200 bg-emerald-50 p-4 transition hover:border-emerald-400 dark:border-emerald-800 dark:bg-emerald-950/30 dark:hover:border-emerald-600"
              >
                <span className="text-3xl" aria-hidden="true">{g.emoji}</span>
                <span>
                  <span className="block font-bold text-gray-900 dark:text-gray-100">{g.title}</span>
                  <span className="mt-0.5 block text-sm text-gray-600 dark:text-gray-300">{g.blurb}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-6 text-center text-sm">
        <Link
          href="/literacy"
          className="text-emerald-700 underline hover:text-emerald-900 dark:text-emerald-300"
        >
          전체 놀이 보기 →
        </Link>
      </p>
    </main>
  );
}
