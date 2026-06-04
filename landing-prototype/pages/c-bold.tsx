// FR-LANDING — 시안 C (Bold / App-style) 미리보기.
//
// ⚠️ 임시/미적용: 시안 비교용. 라이브 `/` 미변경. 카피는 공유 content.ts(시안 A/B 와 동일),
// 디자인만 다르게 — 그래디언트 풀블리드 hero·디바이스 목업·생동감 있는 컬러 밴드·큰 이모지·
// 모바일 하단 고정 CTA(앱 느낌). noindex + LandingBeacon 제외. 적용 시 선택 시안만 이관.

import type { Metadata } from "next";
import Link from "next/link";

import { AuthAwareHeroCta } from "@/components/landing/AuthAwareHeroCta";
import { LandingCtaLink } from "@/components/landing/LandingCtaLink";
import {
  HERO,
  HOW_HEADING,
  HOW_CTA,
  STEPS,
  RESULT_PREVIEWS,
  URGENCY,
  VALUE_HEADING,
  VALUE_CARDS,
  COMING_SOON,
  TRUST_HEADING,
  TRUST_PILLARS,
  FAQ_HEADING,
  FAQ_CTA,
  LANDING_FAQ,
  FINAL,
  DISCLAIMER,
  INSTITUTION_PROMPT,
  INSTITUTION_CTA,
} from "@/components/landing/content";

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "http://localhost:4000");
const contactEmail = process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "partners@speech-therapy.kr";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "[미리보기 C · Bold] Speech-Therapy 랜딩",
  description:
    "회원가입 없이 5분 안에 아이의 발음 발달을 또래와 비교해 확인하는 부모용 보조 도구.",
  robots: { index: false, follow: false },
};

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: LANDING_FAQ.map((item) => ({
    "@type": "Question",
    name: item.q,
    acceptedAnswer: { "@type": "Answer", text: item.a },
  })),
};

// C 토큰 — 큰 라운드 버튼. 밝은 배경용(emerald) / 그래디언트 위용(흰색).
const BTN_SOLID =
  "inline-flex min-h-[52px] items-center justify-center rounded-full bg-emerald-600 px-8 py-3.5 text-lg font-bold text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-950";
const BTN_ON_GRADIENT =
  "inline-flex min-h-[52px] items-center justify-center rounded-full bg-white px-8 py-3.5 text-lg font-bold text-emerald-700 shadow-lg transition hover:bg-emerald-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-emerald-600";

export default function LandingPreviewC() {
  return (
    <main className="overflow-hidden">
      {/* Hero — 그래디언트 풀블리드 + 디바이스 목업 */}
      <section
        aria-labelledby="c-hero"
        className="bg-gradient-to-br from-emerald-500 to-teal-600 px-4 pt-14 pb-20 text-white sm:pt-20 dark:from-emerald-700 dark:to-teal-800"
      >
        <div className="mx-auto grid max-w-5xl items-center gap-12 sm:grid-cols-2">
          <div>
            <AuthAwareHeroCta />
            <h1 id="c-hero" className="text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">
              {HERO.headline}
            </h1>
            <p className="mt-5 text-lg leading-relaxed text-emerald-50">{HERO.sub}</p>
            <div className="mt-8">
              <LandingCtaLink cta="diagnose" placement="hero" testId="hero-cta-primary" className={BTN_ON_GRADIENT}>
                {HERO.primaryCta}
              </LandingCtaLink>
            </div>
            <ul className="mt-7 flex flex-wrap gap-2">
              {HERO.microcopy.map((m) => (
                <li
                  key={m.text}
                  className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-sm font-medium text-white backdrop-blur"
                >
                  <span aria-hidden="true">{m.icon}</span>
                  {m.text}
                </li>
              ))}
            </ul>
          </div>

          {/* 디바이스 목업 — 결과 카드 미리보기(이미지 없이 CSS) */}
          <div className="flex justify-center sm:justify-end" aria-hidden="true">
            <div className="w-60 rounded-[2.2rem] border-[7px] border-slate-900/90 bg-white p-4 shadow-2xl">
              <div className="rounded-2xl bg-emerald-50 p-5 text-center">
                <p className="text-5xl">🌟</p>
                <p className="mt-2 text-base font-bold text-slate-900">
                  {RESULT_PREVIEWS[0].text}
                </p>
                <div className="mt-4 h-2.5 w-full rounded-full bg-slate-200">
                  <div className="h-2.5 w-3/4 rounded-full bg-emerald-500" />
                </div>
                <p className="mt-2 text-xs font-medium text-slate-500">또래 비교</p>
              </div>
              <div className="mt-3 rounded-xl bg-slate-900 py-2.5 text-center text-sm font-bold text-white">
                미션 이어가기
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How — 컬러 번호 원 + 결과 칩 */}
      <section id="c-how" aria-labelledby="c-how-h" className="bg-white px-4 py-16 sm:py-20 dark:bg-slate-950">
        <div className="mx-auto max-w-5xl">
          <h2 id="c-how-h" className="text-center text-3xl font-extrabold tracking-tight sm:text-4xl">
            {HOW_HEADING}
          </h2>
          <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-3">
            {STEPS.map((step) => (
              <div
                key={step.num}
                className="rounded-3xl bg-slate-50 p-7 text-center shadow-sm dark:bg-slate-900"
              >
                <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500 text-2xl font-extrabold text-white">
                  {step.num}
                </span>
                <h3 className="mt-4 text-lg font-bold">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                  {step.body}
                </p>
              </div>
            ))}
          </div>
          <ul className="mt-10 flex flex-wrap items-center justify-center gap-2.5">
            {RESULT_PREVIEWS.map((r) => (
              <li
                key={r.text}
                className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200"
              >
                <span aria-hidden="true">{r.icon}</span>
                {r.text}
              </li>
            ))}
          </ul>
          <div className="mt-10 text-center">
            <LandingCtaLink cta="diagnose" placement="how_it_works" testId="how-cta" className={BTN_SOLID}>
              {HOW_CTA}
            </LandingCtaLink>
          </div>
        </div>
      </section>

      {/* Urgency — 부드러운 컬러 밴드 */}
      <section aria-labelledby="c-urg" className="bg-emerald-50 px-4 py-16 sm:py-20 dark:bg-emerald-950/20">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-5xl" aria-hidden="true">🌱</p>
          <h2 id="c-urg" className="mt-4 text-3xl font-extrabold leading-snug tracking-tight sm:text-4xl">
            {URGENCY.heading}
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-slate-700 dark:text-slate-300">
            {URGENCY.body}
          </p>
          <p className="mt-4 text-lg font-bold text-emerald-800 dark:text-emerald-200">
            {URGENCY.reassurance}
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <LandingCtaLink cta="diagnose" placement="urgency" testId="urgency-cta-primary" className={BTN_SOLID}>
              {URGENCY.cta}
            </LandingCtaLink>
            <LandingCtaLink
              cta="missions"
              placement="urgency"
              testId="urgency-cta-missions"
              className="inline-flex min-h-[44px] items-center font-semibold text-emerald-700 underline underline-offset-4 hover:no-underline dark:text-emerald-300"
            >
              {URGENCY.missionsLink}
            </LandingCtaLink>
          </div>
        </div>
      </section>

      {/* Value — 컬러 카드 + 그림자 */}
      <section aria-labelledby="c-val" className="bg-white px-4 py-16 sm:py-20 dark:bg-slate-950">
        <div className="mx-auto max-w-5xl">
          <h2 id="c-val" className="text-center text-3xl font-extrabold tracking-tight sm:text-4xl">
            {VALUE_HEADING}
          </h2>
          <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2">
            {VALUE_CARDS.map((card) => (
              <article
                key={card.title}
                className="rounded-3xl border border-slate-100 bg-white p-7 shadow-md dark:border-slate-800 dark:bg-slate-900"
              >
                <span aria-hidden="true" className="text-4xl">{card.emoji}</span>
                <h3 className="mt-3 text-xl font-bold">{card.title}</h3>
                <p className="mt-2 leading-relaxed text-slate-600 dark:text-slate-400">{card.body}</p>
                {card.cta && card.linkLabel ? (
                  <LandingCtaLink
                    cta={card.cta}
                    placement="value_props"
                    testId={`value-cta-${card.cta}`}
                    className="mt-4 inline-flex min-h-[44px] items-center font-bold text-emerald-700 hover:underline dark:text-emerald-300"
                  >
                    {card.linkLabel}
                  </LandingCtaLink>
                ) : null}
              </article>
            ))}
            <article className="rounded-3xl border-2 border-dashed border-violet-200 bg-violet-50 p-7 sm:col-span-2 dark:border-violet-900 dark:bg-violet-950/30">
              <div className="flex items-center gap-3">
                <span aria-hidden="true" className="text-4xl">{COMING_SOON.emoji}</span>
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-bold">{COMING_SOON.title}</h3>
                  <span className="rounded-full bg-violet-200 px-2.5 py-0.5 text-xs font-bold text-violet-800 dark:bg-violet-900 dark:text-violet-200">
                    {COMING_SOON.badge}
                  </span>
                </div>
              </div>
              <p className="mt-3 leading-relaxed text-slate-600 dark:text-slate-400">{COMING_SOON.body}</p>
            </article>
          </div>
        </div>
      </section>

      {/* Trust — 카드 + 그림자 */}
      <section aria-labelledby="c-trust" className="bg-slate-50 px-4 py-16 sm:py-20 dark:bg-slate-900/60">
        <div className="mx-auto max-w-5xl">
          <h2 id="c-trust" className="text-center text-3xl font-extrabold tracking-tight sm:text-4xl">
            {TRUST_HEADING}
          </h2>
          <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2">
            {TRUST_PILLARS.map((p) => (
              <article
                key={p.title}
                className="rounded-3xl bg-white p-7 shadow-sm dark:bg-slate-900"
              >
                <span aria-hidden="true" className="text-3xl">{p.emoji}</span>
                <h3 className="mt-3 text-lg font-bold leading-snug">{p.title}</h3>
                <p className="mt-2 leading-relaxed text-slate-600 dark:text-slate-400">{p.body}</p>
              </article>
            ))}
          </div>
          <div className="mt-8 text-center">
            <Link
              href="/privacy"
              data-testid="trust-privacy-link"
              className="inline-flex min-h-[44px] items-center font-semibold text-emerald-700 underline underline-offset-4 hover:no-underline dark:text-emerald-300"
            >
              개인정보 처리방침 보기
            </Link>
          </div>
        </div>
      </section>

      {/* FAQ — 라운드 카드 아코디언 */}
      <section aria-labelledby="c-faq" className="bg-white px-4 py-16 sm:py-20 dark:bg-slate-950">
        <div className="mx-auto max-w-3xl">
          <h2 id="c-faq" className="text-center text-3xl font-extrabold tracking-tight sm:text-4xl">
            {FAQ_HEADING}
          </h2>
          <ul className="mt-10 space-y-3">
            {LANDING_FAQ.map((item) => (
              <li key={item.q}>
                <details className="group rounded-2xl bg-slate-50 px-5 shadow-sm dark:bg-slate-900">
                  <summary className="flex min-h-[56px] cursor-pointer list-none items-center justify-between gap-4 py-4 font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-950">
                    <span>{item.q}</span>
                    <span aria-hidden="true" className="shrink-0 text-xl text-emerald-500 transition-transform group-open:rotate-45">
                      +
                    </span>
                  </summary>
                  <p className="pb-5 leading-relaxed text-slate-600 dark:text-slate-400">{item.a}</p>
                </details>
              </li>
            ))}
          </ul>
          <div className="mt-10 text-center">
            <LandingCtaLink cta="diagnose" placement="faq" testId="faq-cta" className={BTN_SOLID}>
              {FAQ_CTA}
            </LandingCtaLink>
          </div>
        </div>
      </section>

      {/* Final — 그래디언트 밴드 */}
      <section
        aria-labelledby="c-final"
        className="bg-gradient-to-br from-emerald-500 to-teal-600 px-4 py-20 text-center text-white dark:from-emerald-700 dark:to-teal-800"
      >
        <div className="mx-auto max-w-3xl">
          <h2 id="c-final" className="text-3xl font-extrabold tracking-tight sm:text-4xl">
            {FINAL.heading}
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg leading-relaxed text-emerald-50">{FINAL.sub}</p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <LandingCtaLink cta="diagnose" placement="final" testId="final-cta-primary" className={BTN_ON_GRADIENT}>
              {FINAL.primaryCta}
            </LandingCtaLink>
            <LandingCtaLink
              cta="signup"
              placement="final"
              testId="final-cta-signup"
              className="inline-flex min-h-[52px] items-center justify-center rounded-full border-2 border-white/70 px-8 py-3 text-lg font-bold text-white transition hover:bg-white/10"
            >
              {FINAL.secondaryCta}
            </LandingCtaLink>
          </div>
        </div>
      </section>

      {/* 면책 + 기관 문의 */}
      <section aria-label="안내" className="bg-white px-4 py-10 text-center dark:bg-slate-950">
        <div className="mx-auto max-w-3xl space-y-3">
          <p
            data-testid="disclaimer"
            className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-100"
          >
            {DISCLAIMER}
          </p>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {INSTITUTION_PROMPT}{" "}
            <a
              href={`mailto:${contactEmail}`}
              data-testid="institution-inquiry"
              className="font-semibold text-emerald-700 underline underline-offset-4 hover:no-underline dark:text-emerald-300"
            >
              {INSTITUTION_CTA}
            </a>
          </p>
        </div>
      </section>

      {/* 모바일 하단 고정 CTA (앱 느낌) — 콘텐츠 가림 방지 spacer 동반 */}
      <div className="h-24 sm:hidden" aria-hidden="true" />
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 p-3 backdrop-blur sm:hidden dark:border-slate-800 dark:bg-slate-950/95">
        <LandingCtaLink
          cta="diagnose"
          placement="hero"
          testId="sticky-cta"
          className="flex min-h-[52px] w-full items-center justify-center rounded-full bg-emerald-600 text-lg font-bold text-white shadow-lg"
        >
          {HERO.primaryCta}
        </LandingCtaLink>
      </div>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
    </main>
  );
}
