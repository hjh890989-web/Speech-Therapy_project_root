// 읽기·언어 놀이 허브 (Server Component) — CR-2026-007 후속.
//
// 활성(플래그 on)인 놀이만 카드로 노출. 전부 off 면 '준비 중' 안내.
// 허브 자체는 게이트 없음 — 각 게임 플래그가 노출을 제어(미공개 콘텐츠 누출 없음).
// CON-04: '치료/진단/장애' 0건 — 놀이 톤.

import Link from "next/link";

import { enabledLiteracyGames } from "@/lib/literacy/registry";

export const metadata = {
  title: "읽기·말 놀이 — Speech-Therapy",
  description: "아이와 함께 즐기는 읽기·말 발달 놀이 모음입니다. 의학적 평가가 아닌 발달 놀이예요.",
};

export const dynamic = "force-dynamic";

export default function LiteracyHubPage() {
  const games = enabledLiteracyGames();

  return (
    <main
      className="mx-auto max-w-2xl px-4 py-8 sm:py-12"
      data-testid="literacy-hub"
      aria-labelledby="literacy-hub-heading"
    >
      <p
        data-testid="disclaimer"
        className="mb-6 rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-100"
      >
        아이와 함께 즐기는 <strong>발달 놀이</strong> 모음이에요. 점수를 매기는 게 아니라
        함께 말과 이야기를 즐기는 시간이에요. 의학적 평가가 아닙니다.
      </p>

      <header className="mb-6">
        <h1 id="literacy-hub-heading" className="text-2xl font-bold sm:text-3xl">
          읽기·말 놀이
        </h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          오늘은 어떤 놀이를 함께 해볼까요?
        </p>
      </header>

      {games.length === 0 ? (
        <section
          data-testid="literacy-hub-empty"
          className="rounded-lg border border-sky-200 bg-sky-50 p-6 text-center text-sky-900 dark:border-sky-800 dark:bg-sky-950/30 dark:text-sky-100"
        >
          <p className="text-4xl" aria-hidden="true">🧩</p>
          <p className="mt-2 text-sm">곧 다양한 읽기·말 놀이가 하나씩 열려요. 조금만 기다려 주세요 😊</p>
        </section>
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2" data-testid="literacy-hub-list">
          {games.map((g) => (
            <li key={g.slug}>
              <Link
                href={`/literacy/${g.slug}`}
                data-testid={`literacy-card-${g.slug}`}
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
    </main>
  );
}
