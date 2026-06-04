"use client";

// FR-LANDING — 로그인 부모용 "이어서 계속하기" 단축 (progressive enhancement).
//
// 설계 의도(중요):
//   랜딩(`/`)을 **정적 렌더**로 유지해야 SEO/LCP 가 산다. 따라서 서버에서 auth 를 읽지
//   않는다(서버 auth 읽기는 라우트를 dynamic 으로 강등). 대신 hydration 후 클라이언트에서
//   Supabase **getSession()** (네트워크 호출 없음 — 쿠키의 세션을 로컬 디코드)만 확인해
//   로그인 사용자에게만 단축 링크를 노출한다.
//
//   - 익명 방문자(대다수 + 크롤러): 단축 미노출(null). 추가 비용 0 — Supabase 청크는
//     dynamic import 로 paint 이후 lazy 로드되어 초기 LCP 번들에서 제외.
//   - 비로그인/세션 없음/env 미설정: 모두 graceful 하게 anonymous 처리.
//
// 자동 리다이렉트는 하지 않는다(사용자 승인안: 단축만 노출). 마케팅 페이지 재방문 가치 보존.

import { useEffect, useState } from "react";

import { LandingCtaLink } from "./LandingCtaLink";

export function AuthAwareHeroCta() {
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        // paint 이후 lazy 로드 — 초기 정적 셸 번들에 @supabase/ssr 미포함.
        const { getSupabaseBrowserClient } = await import("@/lib/supabase/client");
        const { data } = await getSupabaseBrowserClient().auth.getSession();
        if (active) setAuthed(Boolean(data.session));
      } catch {
        // env 미설정 / 비로그인 → anonymous (단축 미노출).
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  if (!authed) return null;

  return (
    <div className="mb-5 flex justify-center">
      <LandingCtaLink
        cta="continue"
        placement="hero"
        testId="landing-continue"
        className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 dark:border-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200 dark:focus-visible:ring-offset-slate-950"
      >
        <span aria-hidden="true">↩️</span> 이어서 계속하기 — 오늘의 미션
      </LandingCtaLink>
    </div>
  );
}
