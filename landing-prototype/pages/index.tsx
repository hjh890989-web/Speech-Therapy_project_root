// FR-LANDING — 랜딩 프로토타입 비교 인덱스 (시안 A/B/C 허브).
//
// ⚠️ 임시/미적용: 시안 비교용 모음. 라이브 `/` 미변경. 각 시안은 카피·구조·컴플라이언스 동일,
// 디자인만 다름(공유 components/landing/content.ts). 선택 시 해당 시안만 `/` 로 이관.
// noindex — 검색 색인 금지.

import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "랜딩 프로토타입 — 시안 비교",
  description: "랜딩 페이지 시안 A/B/C 비교용 미리보기 모음(미적용).",
  robots: { index: false, follow: false },
};

const VARIANTS = [
  {
    slug: "a",
    name: "A — Warm & Friendly",
    desc: "emerald·이모지·둥근 카드, 따뜻함. 현재 앱과 가장 일관된 톤.",
    accent: "border-emerald-300 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/30",
  },
  {
    slug: "b",
    name: "B — Editorial / Minimal",
    desc: "무채색 + emerald 1색, 큰 타이포·여백·얇은 구분선, 이모지 최소화. 신뢰/프리미엄.",
    accent: "border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-900",
  },
  {
    slug: "c",
    name: "C — Bold / App-style",
    desc: "그래디언트 hero·디바이스 목업·모바일 하단 고정 CTA·생동감. 모던 컨슈머 앱.",
    accent: "border-teal-300 bg-teal-50 dark:border-teal-800 dark:bg-teal-950/30",
  },
];

export default function LandingPrototypeIndex() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-12 sm:py-16">
      <h1 className="text-2xl font-bold sm:text-3xl">랜딩 프로토타입 — 시안 비교</h1>
      <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">
        카피·구조·컴플라이언스는 동일하고 <strong>디자인만 다릅니다</strong>. 아래에서 각 시안을
        열어 비교해 보세요. (미적용 — 라이브 홈에는 반영되지 않았어요.)
      </p>

      <ul className="mt-8 space-y-4">
        {VARIANTS.map((v) => (
          <li key={v.slug}>
            <Link
              href={`/landing-prototype/${v.slug}`}
              data-testid={`prototype-link-${v.slug}`}
              className={`block rounded-2xl border-2 p-5 transition hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-950 ${v.accent}`}
            >
              <h2 className="text-lg font-bold">{v.name}</h2>
              <p className="mt-1 text-sm text-gray-700 dark:text-gray-300">{v.desc}</p>
              <p className="mt-2 text-xs font-medium text-emerald-700 dark:text-emerald-300">
                /landing-prototype/{v.slug} 열기 →
              </p>
            </Link>
          </li>
        ))}
      </ul>

      <p className="mt-10 rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
        본 서비스는 의료적 평가가 아닌, 부모님께 발달 확인 정보를 안내하는 보조 도구입니다.
      </p>
    </main>
  );
}
