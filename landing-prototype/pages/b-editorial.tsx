// FR-LANDING — 시안 B (Editorial / Minimal Trust) 미리보기.
//
// ⚠️ 임시/미적용: 시안 비교용. 라이브 `/` 미변경. 카피는 공유 content.ts(시안 A/C 와 동일),
// 디자인만 다르게 — 거의 무채색 + emerald 포인트 1색, 큰 타이포·여백·얇은 구분선, 이모지 최소화.
// noindex + LandingBeacon 제외(funnel 비오염). 적용 결정 시 선택된 시안만 app/page.tsx 로 이관.

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
  title: "[미리보기 B · Editorial] Speech-Therapy 랜딩",
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

// B 공통 토큰 — 정제된 직사각형 emerald 버튼 + 텍스트 링크.
const BTN =
  "inline-flex min-h-[48px] items-center justify-center rounded-md bg-emerald-600 px-6 py-3 text-base font-semibold text-white transition hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-950";
const TXT =
  "inline-flex min-h-[44px] items-center text-sm font-medium text-emerald-700 underline underline-offset-4 transition hover:no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 dark:text-emerald-400 dark:focus-visible:ring-offset-slate-950";

export default function LandingPreviewB() {
  return (
    <main className="bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <div className="mx-auto max-w-3xl px-6">
        {/* Hero — 좌측 정렬 editorial */}
        <section aria-labelledby="b-hero" className="pt-16 pb-16 sm:pt-24 sm:pb-20">
          <AuthAwareHeroCta />
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-400">
            5분 발음 확인
          </p>
          <h1
            id="b-hero"
            className="mt-5 text-4xl font-bold leading-[1.15] tracking-tight sm:text-6xl"
          >
            {HERO.headline}
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-slate-600 dark:text-slate-400">
            {HERO.sub}
          </p>
          <div className="mt-9 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
            <LandingCtaLink cta="diagnose" placement="hero" testId="hero-cta-primary" className={BTN}>
              {HERO.primaryCta}
            </LandingCtaLink>
            <a
              href="#b-how"
              className="text-sm font-medium text-slate-500 underline-offset-4 transition hover:text-slate-900 hover:underline dark:text-slate-400 dark:hover:text-slate-100"
            >
              {HERO.secondaryCta} ↓
            </a>
          </div>
          <p className="mt-8 text-sm text-slate-500 dark:text-slate-500">
            {HERO.microcopy.map((m) => m.text).join("  ·  ")}
          </p>
        </section>

        {/* How it works — 큰 숫자 + 얇은 구분선 */}
        <section id="b-how" aria-labelledby="b-how-h" className="scroll-mt-8 border-t border-slate-200 py-16 dark:border-slate-800">
          <h2 id="b-how-h" className="text-2xl font-bold tracking-tight sm:text-3xl">
            {HOW_HEADING}
          </h2>
          <ol className="mt-10 space-y-8">
            {STEPS.map((step) => (
              <li key={step.num} className="flex gap-6">
                <span className="shrink-0 text-3xl font-bold tabular-nums text-emerald-600/90 dark:text-emerald-500">
                  {step.num.padStart(2, "0")}
                </span>
                <div>
                  <h3 className="text-lg font-semibold">{step.title}</h3>
                  <p className="mt-1.5 leading-relaxed text-slate-600 dark:text-slate-400">
                    {step.body}
                  </p>
                </div>
              </li>
            ))}
          </ol>
          <div className="mt-10 border-l-2 border-emerald-500 pl-5">
            <p className="text-xs uppercase tracking-wider text-slate-400">결과 예시</p>
            <ul className="mt-3 space-y-1.5">
              {RESULT_PREVIEWS.map((r) => (
                <li key={r.text} className="text-slate-700 dark:text-slate-300">
                  “{r.text}”
                </li>
              ))}
            </ul>
          </div>
          <div className="mt-10">
            <LandingCtaLink cta="diagnose" placement="how_it_works" testId="how-cta" className={BTN}>
              {HOW_CTA}
            </LandingCtaLink>
          </div>
        </section>

        {/* Urgency — 조용한 강조 블록 */}
        <section aria-labelledby="b-urg" className="border-t border-slate-200 py-16 dark:border-slate-800">
          <h2 id="b-urg" className="max-w-2xl text-2xl font-bold leading-snug tracking-tight sm:text-3xl">
            {URGENCY.heading}
          </h2>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-slate-600 dark:text-slate-400">
            {URGENCY.body}
          </p>
          <p className="mt-4 max-w-2xl font-semibold text-slate-900 dark:text-slate-100">
            {URGENCY.reassurance}
          </p>
          <div className="mt-8 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
            <LandingCtaLink cta="diagnose" placement="urgency" testId="urgency-cta-primary" className={BTN}>
              {URGENCY.cta}
            </LandingCtaLink>
            <LandingCtaLink cta="missions" placement="urgency" testId="urgency-cta-missions" className={TXT}>
              {URGENCY.missionsLink}
            </LandingCtaLink>
          </div>
        </section>

        {/* Value — definition-list 느낌, 카드 chrome 최소 */}
        <section aria-labelledby="b-val" className="border-t border-slate-200 py-16 dark:border-slate-800">
          <h2 id="b-val" className="text-2xl font-bold tracking-tight sm:text-3xl">
            {VALUE_HEADING}
          </h2>
          <dl className="mt-10 grid grid-cols-1 gap-x-12 gap-y-9 sm:grid-cols-2">
            {VALUE_CARDS.map((card) => (
              <div key={card.title} className="border-t border-slate-100 pt-5 dark:border-slate-900">
                <dt className="text-lg font-semibold">{card.title}</dt>
                <dd className="mt-1.5 leading-relaxed text-slate-600 dark:text-slate-400">
                  {card.body}
                </dd>
                {card.cta && card.linkLabel ? (
                  <LandingCtaLink
                    cta={card.cta}
                    placement="value_props"
                    testId={`value-cta-${card.cta}`}
                    className={`mt-3 ${TXT}`}
                  >
                    {card.linkLabel}
                  </LandingCtaLink>
                ) : null}
              </div>
            ))}
            <div className="border-t border-dashed border-slate-200 pt-5 dark:border-slate-800">
              <dt className="flex items-center gap-2 text-lg font-semibold text-slate-500 dark:text-slate-400">
                {COMING_SOON.title}
                <span className="rounded-sm border border-slate-300 px-1.5 py-0.5 text-xs font-medium uppercase tracking-wide text-slate-500 dark:border-slate-700 dark:text-slate-400">
                  {COMING_SOON.badge}
                </span>
              </dt>
              <dd className="mt-1.5 leading-relaxed text-slate-500 dark:text-slate-500">
                {COMING_SOON.body}
              </dd>
            </div>
          </dl>
        </section>

        {/* Trust — 조용한 행, emerald 마커 */}
        <section aria-labelledby="b-trust" className="border-t border-slate-200 py-16 dark:border-slate-800">
          <h2 id="b-trust" className="text-2xl font-bold tracking-tight sm:text-3xl">
            {TRUST_HEADING}
          </h2>
          <div className="mt-10 grid grid-cols-1 gap-x-12 gap-y-8 sm:grid-cols-2">
            {TRUST_PILLARS.map((p) => (
              <div key={p.title}>
                <h3 className="flex items-start gap-2.5 font-semibold">
                  <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                  {p.title}
                </h3>
                <p className="mt-2 pl-[18px] leading-relaxed text-slate-600 dark:text-slate-400">
                  {p.body}
                </p>
              </div>
            ))}
          </div>
          <Link
            href="/privacy"
            data-testid="trust-privacy-link"
            className={`mt-8 ${TXT}`}
          >
            개인정보 처리방침 보기
          </Link>
        </section>

        {/* FAQ — 미니멀 행(하단 보더) */}
        <section aria-labelledby="b-faq" className="border-t border-slate-200 py-16 dark:border-slate-800">
          <h2 id="b-faq" className="text-2xl font-bold tracking-tight sm:text-3xl">
            {FAQ_HEADING}
          </h2>
          <ul className="mt-8">
            {LANDING_FAQ.map((item) => (
              <li key={item.q} className="border-b border-slate-200 dark:border-slate-800">
                <details className="group">
                  <summary className="flex min-h-[56px] cursor-pointer list-none items-center justify-between gap-4 py-4 font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-950">
                    <span>{item.q}</span>
                    <span aria-hidden="true" className="shrink-0 text-slate-400 transition-transform group-open:rotate-45">
                      +
                    </span>
                  </summary>
                  <p className="pb-5 leading-relaxed text-slate-600 dark:text-slate-400">{item.a}</p>
                </details>
              </li>
            ))}
          </ul>
          <div className="mt-10">
            <LandingCtaLink cta="diagnose" placement="faq" testId="faq-cta" className={BTN}>
              {FAQ_CTA}
            </LandingCtaLink>
          </div>
        </section>

        {/* Final — 정제된 블록(색 밴드 없음) */}
        <section aria-labelledby="b-final" className="border-t border-slate-200 py-20 text-center dark:border-slate-800">
          <h2 id="b-final" className="text-3xl font-bold tracking-tight sm:text-4xl">
            {FINAL.heading}
          </h2>
          <p className="mx-auto mt-4 max-w-xl leading-relaxed text-slate-600 dark:text-slate-400">
            {FINAL.sub}
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <LandingCtaLink cta="diagnose" placement="final" testId="final-cta-primary" className={BTN}>
              {FINAL.primaryCta}
            </LandingCtaLink>
            <LandingCtaLink cta="signup" placement="final" testId="final-cta-signup" className={TXT}>
              {FINAL.secondaryCta}
            </LandingCtaLink>
          </div>
        </section>

        {/* 면책 + 기관 문의 */}
        <section aria-label="안내" className="border-t border-slate-200 py-10 dark:border-slate-800">
          <p data-testid="disclaimer" className="text-sm text-slate-500 dark:text-slate-500">
            {DISCLAIMER}
          </p>
          <p className="mt-3 text-sm text-slate-500 dark:text-slate-500">
            {INSTITUTION_PROMPT}{" "}
            <a
              href={`mailto:${contactEmail}`}
              data-testid="institution-inquiry"
              className="font-medium text-emerald-700 underline underline-offset-4 hover:no-underline dark:text-emerald-400"
            >
              {INSTITUTION_CTA}
            </a>
          </p>
        </section>
      </div>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
    </main>
  );
}
