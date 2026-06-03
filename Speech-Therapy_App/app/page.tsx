// 루트 / — Speech-Therapy 홈 (서비스 소개 + 3 CTA).
// PWA start_url = "/" 이므로 홈화면 설치 후 첫 진입 화면이 본 페이지.

import Link from "next/link";

import { LandingBeacon } from "./LandingBeacon";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-full max-w-2xl flex-col px-4 py-10 sm:py-16">
      {/* MON-001 — funnel 'landing' 진입 1회 영속(browser mount). */}
      <LandingBeacon />
      {/* Disclaimer 1중 */}
      <p
        data-testid="disclaimer"
        className="mb-6 rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-100"
      >
        본 서비스는 의료적 평가가 아닌, 부모님께 발달 확인 정보를 안내하는 보조 도구입니다.
      </p>

      <header className="mb-10 space-y-3">
        <h1 className="text-3xl font-bold sm:text-4xl">Speech-Therapy</h1>
        <p className="text-base text-gray-700 dark:text-gray-300">
          회원가입 없이 <strong>5분</strong> 안에 아이의 발음 발달 단계를 또래와 비교해 확인할 수
          있어요. 매일 짧은 미션으로 즐겁게 이어가요.
        </p>
      </header>

      <section className="space-y-3" aria-label="주요 메뉴">
        <Link
          href="/diagnose"
          className="block rounded-lg border-2 border-emerald-500 bg-emerald-50 p-5 transition hover:bg-emerald-100 dark:bg-emerald-950/30 dark:hover:bg-emerald-950/50"
        >
          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
            5분 발음 확인
          </p>
          <h2 className="mb-1 text-lg font-bold">오늘 아이의 발음을 확인해 보세요</h2>
          <p className="text-sm text-gray-700 dark:text-gray-300">
            월령과 음소를 골라 한 단어만 들려주면 또래 비교 결과를 안내해 드려요.
          </p>
        </Link>

        <Link
          href="/missions"
          className="block rounded-lg border border-gray-300 p-5 transition hover:border-emerald-400 dark:border-gray-700"
        >
          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
            오늘의 미션
          </p>
          <h2 className="mb-1 text-lg font-bold">짧은 발음 미션으로 이어가기</h2>
          <p className="text-sm text-gray-700 dark:text-gray-300">
            하루 1~3분, 발달 단계에 맞춘 미션 카드를 둘러보세요.
          </p>
        </Link>

        <Link
          href="/rewards"
          className="block rounded-lg border border-gray-300 p-5 transition hover:border-emerald-400 dark:border-gray-700"
        >
          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
            보상 도감
          </p>
          <h2 className="mb-1 text-lg font-bold">모은 별과 나무를 함께 보기</h2>
          <p className="text-sm text-gray-700 dark:text-gray-300">
            아이와 함께 모은 보상을 시각으로 확인하며 격려해 주세요.
          </p>
        </Link>
      </section>

      <footer className="mt-10 text-xs text-gray-500 dark:text-gray-400">
        본 결과는 의료적 평가가 아니며, 발달이 우려되는 경우 전문가 상담을 권장합니다.
      </footer>
    </main>
  );
}
