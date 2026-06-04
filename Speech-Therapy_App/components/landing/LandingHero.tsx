// FR-LANDING §1 — Hero. 첫 화면 전환(Seg A 불안형): 무가입·5분·또래 비교 훅 + 주 CTA.
// 상단에 로그인 단축(AuthAwareHeroCta, 비로그인 시 null). RSC — 정적 렌더.

import { AuthAwareHeroCta } from "./AuthAwareHeroCta";
import { LandingCtaLink } from "./LandingCtaLink";
import { PRIMARY_CTA } from "./cta-styles";

export function LandingHero() {
  return (
    <section
      aria-labelledby="hero-heading"
      className="px-4 pt-12 pb-14 sm:pt-16 sm:pb-20"
    >
      <div className="mx-auto max-w-3xl text-center">
        <AuthAwareHeroCta />

        <h1
          id="hero-heading"
          className="text-3xl font-extrabold leading-tight tracking-tight sm:text-5xl"
        >
          우리 아이 발음, 회원가입 없이 5분 안에 또래와 비교해 확인해요
        </h1>

        <p className="mx-auto mt-5 max-w-2xl text-base text-gray-700 sm:text-lg dark:text-gray-300">
          월령과 음소를 고르고 한 단어만 들려주면, 또래와 비교한 발음 발달 단계를 바로 안내해
          드려요.
        </p>

        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <LandingCtaLink
            cta="diagnose"
            placement="hero"
            testId="hero-cta-primary"
            className={PRIMARY_CTA}
          >
            5분 발음 확인 시작하기
          </LandingCtaLink>
          <a
            href="#how-it-works"
            className="inline-flex min-h-[44px] items-center justify-center px-3 py-2 text-sm font-semibold text-gray-600 underline-offset-4 transition hover:text-emerald-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 dark:text-gray-400 dark:hover:text-emerald-300 dark:focus-visible:ring-offset-slate-950"
          >
            서비스가 어떻게 도와주는지 보기 ↓
          </a>
        </div>

        <p className="mt-6 text-sm text-gray-600 dark:text-gray-400">
          <span aria-hidden="true">🎙️</span> 음성 원본 미저장 ·{" "}
          <span aria-hidden="true">🌟</span> 무가입 ·{" "}
          <span aria-hidden="true">⏱️</span> 약 5분
        </p>
      </div>
    </section>
  );
}
