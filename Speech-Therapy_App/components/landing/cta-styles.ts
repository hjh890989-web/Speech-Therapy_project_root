// FR-LANDING — 랜딩 CTA 공통 Tailwind 클래스 (섹션 간 일관성 단일 소스).
//
// 순수 문자열만 export — "use client" 불필요. client(LandingCtaLink) / server(섹션 RSC)
// 양쪽에서 import 가능. 디자인 토큰: emerald-600 primary (테마 컬러 #10b981 정합),
// tap target ≥ 44px (REQ-NF-007 / WCAG 2.5.5), focus-visible ring, dark: 변형 포함.

/// 주 CTA — emerald 채움. 화면당 1개 우세 버튼 원칙.
export const PRIMARY_CTA =
  "inline-flex min-h-[48px] items-center justify-center rounded-xl bg-emerald-600 px-7 py-3 text-base font-bold text-white shadow-sm transition hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-950";

/// 인라인 텍스트 링크 — 가치 카드/섹션 내 보조 내비게이션.
export const TEXT_LINK =
  "inline-flex min-h-[44px] items-center gap-1 text-sm font-semibold text-emerald-700 underline-offset-4 transition hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 dark:text-emerald-300 dark:focus-visible:ring-offset-slate-950";
