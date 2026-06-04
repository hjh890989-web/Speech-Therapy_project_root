// FR-LANDING §6 — FAQ. 전환 직전 반론 정리(의료/음성/비용/정확/연령/빈도). 네이티브
// <details>/<summary> 아코디언 — JS 0, 키보드 접근성 기본 제공. LANDING_FAQ 는 page.tsx 의
// FAQPage JSON-LD 단일 소스로도 재사용. 모든 카피 금칙어(치료/진단/장애) 회피. RSC.

import { LandingCtaLink } from "./LandingCtaLink";
import { PRIMARY_CTA } from "./cta-styles";

export interface FaqItem {
  q: string;
  a: string;
}

export const LANDING_FAQ: FaqItem[] = [
  {
    q: "이건 의료적 평가인가요?",
    a: "아니에요. 만 2~7세 자녀의 발음 발달을 부모님께서 또래와 비교해 직접 확인하실 수 있도록 돕는 보조 도구예요. 발달이 우려되는 경우에는 전문가 상담을 권장해 드려요.",
  },
  {
    q: "아이 목소리는 저장되나요?",
    a: "음성 원본은 서버에 저장하지 않아요. 음성은 텍스트로 변환된 뒤, 그 텍스트와 발달 점수만 안전하게 다뤄요.",
  },
  {
    q: "비용이 드나요? 가입해야 하나요?",
    a: "5분 발음 확인은 회원가입 없이 무료로 바로 시작할 수 있어요. 가입은 선택이며, 가입하시면 무가입으로 모은 별과 결과가 새 계정에 그대로 옮겨져요.",
  },
  {
    q: "결과가 정확한가요?",
    a: "발음 분석은 AI가 처리하고, 판단이 어려운 경우에는 전문가가 한 번 더 살펴봐요. 같은 월령 또래와 비교한 발달 단계로 안내해 드리며, 이는 의료적 평가가 아닌 부모님을 위한 참고 정보예요.",
  },
  {
    q: "몇 살부터 할 수 있나요?",
    a: "만 2세부터 7세(약 24~84개월) 자녀를 위한 서비스예요. 시작할 때 아이의 개월 수를 입력하면 그에 맞춰 안내해 드려요.",
  },
  {
    q: "매일 얼마나 해야 하나요?",
    a: "하루 1~3분이면 충분해요. 짧고 즐거운 발음 미션을 아이와 함께 이어가면 매일의 작은 변화가 쌓여요.",
  },
];

export function LandingFaq() {
  return (
    <section
      aria-labelledby="faq-heading"
      className="border-t border-slate-100 px-4 py-14 sm:py-20 dark:border-slate-900"
    >
      <div className="mx-auto max-w-3xl">
        <h2
          id="faq-heading"
          className="text-center text-2xl font-bold sm:text-3xl"
        >
          자주 묻는 질문
        </h2>

        <ul className="mt-10 space-y-3">
          {LANDING_FAQ.map((item) => (
            <li key={item.q}>
              <details className="group rounded-2xl border border-slate-200 bg-white px-5 dark:border-slate-800 dark:bg-slate-900">
                <summary className="flex min-h-[56px] cursor-pointer list-none items-center justify-between gap-4 py-4 font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-950">
                  <span>{item.q}</span>
                  <span
                    aria-hidden="true"
                    className="shrink-0 text-xl text-slate-400 transition-transform group-open:rotate-45"
                  >
                    +
                  </span>
                </summary>
                <p className="pb-5 text-sm leading-relaxed text-gray-700 dark:text-gray-300">
                  {item.a}
                </p>
              </details>
            </li>
          ))}
        </ul>

        <div className="mt-10 text-center">
          <LandingCtaLink
            cta="diagnose"
            placement="faq"
            testId="faq-cta"
            className={PRIMARY_CTA}
          >
            궁금증이 풀렸다면, 5분 발음 확인 시작하기
          </LandingCtaLink>
        </div>
      </div>
    </section>
  );
}
