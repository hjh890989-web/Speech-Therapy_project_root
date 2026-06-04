// FR-LANDING §3 — "기다리는 동안"(Seg C 대기형). 대기 중 죄책감을 가정 내 작은 습관으로
// 부드럽게 전환. 비알람 톤(🌱) — ⏳/⚠️/카운트다운 금지. RSC.

import { LandingCtaLink } from "./LandingCtaLink";
import { PRIMARY_CTA, TEXT_LINK } from "./cta-styles";

export function UrgencyBlock() {
  return (
    <section
      aria-labelledby="urgency-heading"
      className="bg-emerald-50 px-4 py-14 sm:py-20 dark:bg-emerald-950/20"
    >
      <div className="mx-auto max-w-3xl text-center">
        <p className="text-4xl" aria-hidden="true">
          🌱
        </p>
        <h2
          id="urgency-heading"
          className="mt-4 text-2xl font-bold sm:text-3xl"
        >
          센터 예약을 기다리는 두세 달, 그냥 흘려보내지 않아도 돼요
        </h2>
        <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-gray-700 sm:text-lg dark:text-gray-300">
          상담이나 예약을 기다리는 동안에도 가정에서 할 수 있는 일이 있어요. 하루 1~3분, 아이와
          함께 짧은 발음 놀이 미션을 이어가면 매일의 작은 변화가 쌓여요. 부담 없이 오늘부터
          시작해 보세요.
        </p>
        <p className="mt-4 text-base font-semibold text-emerald-800 dark:text-emerald-200">
          무엇을 해야 할지 막막했다면, 오늘 5분이 그 시작이 될 수 있어요.
        </p>

        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <LandingCtaLink
            cta="diagnose"
            placement="urgency"
            testId="urgency-cta-primary"
            className={PRIMARY_CTA}
          >
            오늘 5분 미션 시작하기
          </LandingCtaLink>
          <LandingCtaLink
            cta="missions"
            placement="urgency"
            testId="urgency-cta-missions"
            className={TEXT_LINK}
          >
            매일 미션이 궁금하다면 → 오늘의 미션 보기
          </LandingCtaLink>
        </div>
      </div>
    </section>
  );
}
