// FR-LANDING §2 — 3단계 사용법. "이게 뭐지?" 마찰 제거(Seg A). 결과 밴드 미리보기로
// 실제 결과 톤(인앱 verbatim)을 보여 약속과 결과 화면을 일치 → 신뢰. RSC.

import { LandingCtaLink } from "./LandingCtaLink";
import { PRIMARY_CTA } from "./cta-styles";

interface Step {
  num: string;
  title: string;
  body: string;
}

const STEPS: Step[] = [
  {
    num: "1️⃣",
    title: "월령·음소 고르기",
    body: "아이 개월 수와 확인하고 싶은 소리(ㄱ·ㄴ·ㅅ·ㅈ·ㄹ)를 한 번만 골라요.",
  },
  {
    num: "2️⃣",
    title: "한 단어만 들려주기",
    body: "아이가 단어 하나를 말하면 그 소리를 텍스트로 바꿔 발달 단계를 살펴봐요. 음성 원본은 저장하지 않아요.",
  },
  {
    num: "3️⃣",
    title: "또래 비교 결과 받기",
    body: "“또래와 비슷한 수준이에요” 같은 안내와 함께, 이어서 할 수 있는 짧은 미션을 추천해 드려요.",
  },
];

// 실제 결과 페이지(clinical-interpretation)의 밴드 카피와 동일 — 과대약속 방지.
const RESULT_PREVIEWS = [
  "🌟 또래와 비슷한 발음 수준이에요",
  "👍 조금 더 연습하면 더 또렷해질 거예요",
  "🌱 미션으로 꾸준히 함께 연습하면 도움이 돼요",
];

export function HowItWorks() {
  return (
    <section
      id="how-it-works"
      aria-labelledby="how-heading"
      className="scroll-mt-8 border-t border-slate-100 px-4 py-14 sm:py-20 dark:border-slate-900"
    >
      <div className="mx-auto max-w-4xl">
        <h2
          id="how-heading"
          className="text-center text-2xl font-bold sm:text-3xl"
        >
          이렇게 진행돼요
        </h2>

        <ol className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-3">
          {STEPS.map((step) => (
            <li
              key={step.title}
              className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900"
            >
              <p className="text-3xl" aria-hidden="true">
                {step.num}
              </p>
              <h3 className="mt-3 text-lg font-bold">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-gray-700 dark:text-gray-300">
                {step.body}
              </p>
            </li>
          ))}
        </ol>

        <div className="mt-10 rounded-2xl bg-slate-50 p-6 dark:bg-slate-900/60">
          <p className="text-center text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
            결과 예시
          </p>
          <ul className="mt-4 flex flex-wrap items-center justify-center gap-2">
            {RESULT_PREVIEWS.map((preview) => (
              <li
                key={preview}
                className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-sm text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200"
              >
                {preview}
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-10 text-center">
          <LandingCtaLink
            cta="diagnose"
            placement="how_it_works"
            testId="how-cta"
            className={PRIMARY_CTA}
          >
            지금 5분 발음 확인 해보기
          </LandingCtaLink>
        </div>
      </div>
    </section>
  );
}
