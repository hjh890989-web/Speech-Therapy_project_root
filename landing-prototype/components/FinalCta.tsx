// FR-LANDING §7 — 최종 CTA. 스크롤 끝 사용자에게 주 CTA 재요청 + 가입을 "기록 이어가기"
// 업셀로(무가입 별/결과 이관 인센티브, login 페이지 verbatim). 무가입 5분 확인은 절대
// 가입 뒤로 가두지 않음. RSC.

import { LandingCtaLink } from "./LandingCtaLink";

export function FinalCta() {
  return (
    <section
      aria-labelledby="final-heading"
      className="bg-emerald-600 px-4 py-16 sm:py-24 dark:bg-emerald-700"
    >
      <div className="mx-auto max-w-3xl text-center">
        <h2
          id="final-heading"
          className="text-2xl font-extrabold text-white sm:text-4xl"
        >
          오늘 5분이면 충분해요
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-emerald-50">
          회원가입 없이 바로 시작하고, 마음에 들면 그때 가입해도 돼요. 가입하면 무가입으로 모은
          별과 결과가 새 계정에 그대로 옮겨져요.
        </p>

        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <LandingCtaLink
            cta="diagnose"
            placement="final"
            testId="final-cta-primary"
            className="inline-flex min-h-[48px] items-center justify-center rounded-xl bg-white px-7 py-3 text-base font-bold text-emerald-700 shadow-sm transition hover:bg-emerald-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-emerald-600"
          >
            무료로 5분 발음 확인 시작하기
          </LandingCtaLink>
          <LandingCtaLink
            cta="signup"
            placement="final"
            testId="final-cta-signup"
            className="inline-flex min-h-[48px] items-center justify-center rounded-xl border border-white/70 px-7 py-3 text-base font-semibold text-white transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-emerald-600"
          >
            이메일로 가입하고 기록 이어가기
          </LandingCtaLink>
        </div>
      </div>
    </section>
  );
}
