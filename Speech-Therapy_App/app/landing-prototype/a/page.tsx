// FR-LANDING — 마케팅 랜딩 *미리보기* 라우트.
//
// ⚠️ 임시/미적용: 사용자가 결과물을 확인하고 "라이브 `/` 적용 여부"를 결정하기 위한 검토용
// 라우트다. 라이브 루트(app/page.tsx)는 건드리지 않았다. 적용 결정 시:
//   1) 본 파일 내용을 app/page.tsx 로 이동(+ <LandingBeacon /> 1회 마운트 복원)
//   2) app/layout.tsx 에 metadataBase + openGraph 재반영, app/opengraph-image.tsx 추가
//   3) 본 미리보기 라우트 삭제, e2e 경로를 "/" 로 변경
//
// 미리보기 특수처리:
//   - robots: noindex/nofollow (중복 콘텐츠 색인 방지)
//   - LandingBeacon 제외 (검토 트래픽이 funnel 'landing' 단계를 오염시키지 않도록)
//   - 루트 레이아웃만 상속(InstitutionHeader + MedicalDisclaimerFooter) → 실제 `/` 와 동일 chrome

import type { Metadata } from "next";

import { LandingHero } from "@/components/landing/LandingHero";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { UrgencyBlock } from "@/components/landing/UrgencyBlock";
import { ValueProps } from "@/components/landing/ValueProps";
import { TrustStrip } from "@/components/landing/TrustStrip";
import { LandingFaq, LANDING_FAQ } from "@/components/landing/LandingFaq";
import { FinalCta } from "@/components/landing/FinalCta";

// OG 절대경로 해석용 — 미리보기 한정(적용 시 layout 으로 이동). 없으면 dev 폴백.
const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "http://localhost:4000");

// 기관 문의 수신 주소 — env 미설정 시 placeholder(출시 전 실제 주소로 교체 필요).
const contactEmail = process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "partners@speech-therapy.kr";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "[미리보기] Speech-Therapy 랜딩",
  description:
    "회원가입 없이 5분 안에 아이의 발음 발달을 또래와 비교해 확인하고, 매일 1~3분 미션으로 이어가는 부모용 보조 도구.",
  // 미리보기 — 검색 색인 금지 (적용 시 제거하고 canonical "/" 설정).
  robots: { index: false, follow: false },
};

// FAQ 구조화 데이터 — 적용 시 실제 `/` 에서 rich result 로 동작. LANDING_FAQ 단일 소스 재사용.
const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: LANDING_FAQ.map((item) => ({
    "@type": "Question",
    name: item.q,
    acceptedAnswer: { "@type": "Answer", text: item.a },
  })),
};

export default function LandingPreviewPage() {
  return (
    <main className="flex flex-col">
      <LandingHero />
      <HowItWorks />
      <UrgencyBlock />
      <ValueProps />
      <TrustStrip />
      <LandingFaq />
      <FinalCta />

      {/* §8 — 면책 노트 + 기관 문의 (저강도). 전역 법적 푸터는 layout 에서 별도 노출. */}
      <section aria-label="안내" className="px-4 py-10">
        <div className="mx-auto max-w-3xl space-y-4 text-center">
          <p
            data-testid="disclaimer"
            className="rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-100"
          >
            본 서비스는 의료적 평가가 아닌, 부모님께 발달 확인 정보를 안내하는 보조 도구입니다.
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            어린이집·유치원 등 기관에서 단체 도입이 궁금하신가요?{" "}
            <a
              href={`mailto:${contactEmail}`}
              data-testid="institution-inquiry"
              className="font-semibold text-emerald-700 underline underline-offset-4 transition hover:no-underline dark:text-emerald-300"
            >
              기관 문의하기 →
            </a>
          </p>
        </div>
      </section>

      <script
        type="application/ld+json"
        // 정적 데이터만 직렬화 — XSS 위험 없음.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
    </main>
  );
}
