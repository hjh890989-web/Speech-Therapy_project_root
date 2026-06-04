// FR-LANDING §4 — 가치(매일 루프). 5분 확인 이후 리텐션 가치 미리보기: 미션/보상/연속기록/
// 주간 리포트(Seg B 데이터형 훅) + "이야기 친구" 준비 중(링크 X). RSC.

import { LandingCtaLink } from "./LandingCtaLink";
import { TEXT_LINK } from "./cta-styles";

export function ValueProps() {
  return (
    <section
      aria-labelledby="value-heading"
      className="border-t border-slate-100 px-4 py-14 sm:py-20 dark:border-slate-900"
    >
      <div className="mx-auto max-w-4xl">
        <h2
          id="value-heading"
          className="text-center text-2xl font-bold sm:text-3xl"
        >
          5분 확인 그 다음, 매일 즐겁게 이어가요
        </h2>

        <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2">
          <ValueCard emoji="🎯" title="하루 1~3분 발음 미션">
            <p className="text-sm leading-relaxed text-gray-700 dark:text-gray-300">
              짧고 즐거운 발음 놀이예요. 아이 발달 단계에 맞춰 미션이 자동으로 조정돼요.
            </p>
            <LandingCtaLink
              cta="missions"
              placement="value_props"
              testId="value-cta-missions"
              className={`mt-3 ${TEXT_LINK}`}
            >
              오늘의 미션 보기 →
            </LandingCtaLink>
          </ValueCard>

          <ValueCard emoji="🌟" title="별·나무·AI 그림 모으기">
            <p className="text-sm leading-relaxed text-gray-700 dark:text-gray-300">
              미션을 완료할 때마다 별을 모으고 나무를 키워요. 아이의 동기를 자연스럽게 이어가요.
            </p>
            <LandingCtaLink
              cta="rewards"
              placement="value_props"
              testId="value-cta-rewards"
              className={`mt-3 ${TEXT_LINK}`}
            >
              보상 도감 보기 →
            </LandingCtaLink>
          </ValueCard>

          <ValueCard emoji="🔥" title="함께한 날들이 쌓여요">
            <p className="text-sm leading-relaxed text-gray-700 dark:text-gray-300">
              매일 이어가면 연속 기록이 쌓이고, 다음 보너스까지의 진행도를 한눈에 볼 수 있어요.{" "}
              <span aria-hidden="true">🎁</span>
            </p>
          </ValueCard>

          <ValueCard emoji="📈" title="지난 한 주의 발달 추이">
            <p className="text-sm leading-relaxed text-gray-700 dark:text-gray-300">
              발음 발달 추이를 또래 비교와 함께 그래프로 정리해 드려요. 가족과 함께 변화를
              확인하기 좋아요.
            </p>
            <LandingCtaLink
              cta="reports"
              placement="value_props"
              testId="value-cta-reports"
              className={`mt-3 ${TEXT_LINK}`}
            >
              주간 리포트 살펴보기 →
            </LandingCtaLink>
          </ValueCard>
        </div>

        {/* 이야기 친구 — 준비 중. 링크 금지(/chat 미출시): 약속 깨짐 방지. */}
        <article className="mt-5 flex items-start gap-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 dark:border-slate-700 dark:bg-slate-900/60">
          <span aria-hidden="true" className="text-3xl">
            💬
          </span>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-lg font-bold">이야기 친구</h3>
              <span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs font-semibold text-violet-700 dark:bg-violet-950/50 dark:text-violet-300">
                곧 만나요
              </span>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-gray-700 dark:text-gray-300">
              아이와 자연스럽게 대화하며 발음을 연습하는 AI 친구를 준비하고 있어요.
            </p>
          </div>
        </article>
      </div>
    </section>
  );
}

function ValueCard({
  emoji,
  title,
  children,
}: {
  emoji: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <article className="flex flex-col rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
      <span aria-hidden="true" className="text-3xl">
        {emoji}
      </span>
      <h3 className="mt-3 text-lg font-bold">{title}</h3>
      {children}
    </article>
  );
}
