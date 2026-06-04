// FR-LANDING §5 — 신뢰. 새 AI 도구가 아이 음성을 다루는 데 대한 회의 해소(Seg A/B).
// AI+전문가 검수(실제 HITL 경로)·음성 미저장(privacy verbatim)·또래 비교 객관성·보조 도구
// 정직성. 의료 아이콘(🩺⚕️🏥) 금지. RSC.

import Link from "next/link";

export function TrustStrip() {
  return (
    <section
      aria-labelledby="trust-heading"
      className="bg-slate-50 px-4 py-14 sm:py-20 dark:bg-slate-900/60"
    >
      <div className="mx-auto max-w-4xl">
        <h2
          id="trust-heading"
          className="text-center text-2xl font-bold sm:text-3xl"
        >
          안심하고 사용할 수 있도록
        </h2>

        <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Pillar emoji="🤝" title="AI 분석에 전문가 검수를 더했어요">
            <p className="text-sm leading-relaxed text-gray-700 dark:text-gray-300">
              발음 분석은 AI가 빠르게 처리하고, 판단이 어려운 경우에는 전문가가 한 번 더
              살펴봐요. 부모님께 더 신뢰할 수 있는 안내를 드리기 위해서예요.
            </p>
          </Pillar>

          <Pillar emoji="🔒" title="아이 목소리 원본은 저장하지 않아요">
            <p className="text-sm leading-relaxed text-gray-700 dark:text-gray-300">
              음성은 텍스트로 바뀐 뒤 그 텍스트와 점수만 안전하게 다뤄요. 음성 원본은 서버에
              저장하지 않아요.
            </p>
            <Link
              href="/privacy"
              data-testid="trust-privacy-link"
              className="mt-3 inline-flex min-h-[44px] items-center text-sm font-semibold text-emerald-700 underline underline-offset-4 transition hover:no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 dark:text-emerald-300 dark:focus-visible:ring-offset-slate-950"
            >
              개인정보 처리방침 보기
            </Link>
          </Pillar>

          <Pillar emoji="📊" title="느낌이 아니라 또래 비교로 안내해요">
            <p className="text-sm leading-relaxed text-gray-700 dark:text-gray-300">
              막연한 걱정 대신, 같은 월령 또래와 비교한 발달 단계로 안내해 드려요.
            </p>
          </Pillar>

          <Pillar emoji="🌱" title="의료적 평가가 아닌, 부모님을 돕는 보조 도구예요">
            <p className="text-sm leading-relaxed text-gray-700 dark:text-gray-300">
              본 서비스는 의료적 평가를 제공하지 않으며, 부모님께 발달 확인 정보를 안내하기 위한
              보조 도구입니다. 발달이 우려되는 경우 전문가 상담을 권장해 드려요.
            </p>
          </Pillar>
        </div>
      </div>
    </section>
  );
}

function Pillar({
  emoji,
  title,
  children,
}: {
  emoji: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-start gap-3">
        <span aria-hidden="true" className="text-2xl">
          {emoji}
        </span>
        <h3 className="text-base font-bold leading-snug">{title}</h3>
      </div>
      <div className="mt-3">{children}</div>
    </article>
  );
}
