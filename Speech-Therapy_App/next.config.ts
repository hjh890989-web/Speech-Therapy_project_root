// Performance 감사 2차 — @next/bundle-analyzer 통합.
//
// 사용법:
//   `npm run analyze` (= ANALYZE=true next build) 실행 시 client/server 번들 visualizer
//   HTML 이 .next/analyze/ 아래 생성된다 (client.html / nodejs.html / edge.html).
//   ANALYZE 미설정 시 본 wrap 은 no-op → 일반 `next build` / `next dev` 동작 영향 0.
//
// 기대 효과 (Performance 감사 2차):
//   - recharts (~80KB gzip) 가 client.html 에서 별도 chunk 로 분리되어 있어야 함
//     (FunnelChart / RoiSimulator / WeeklyReportChart / WeeklyReviewTrend 의
//      next/dynamic ssr:false wrap 효과 가시화).
//   - 향후 dependency 추가 시 본 visualizer 로 회귀 모니터링.
//
// 참고:
//   - process.env.ANALYZE 는 ESLint env 검증 대상이 아니어서 안전 (build-time 1회 평가).
//   - withBundleAnalyzer 는 next.config 전체를 wrap 하므로 향후 다른 plugin 추가 시
//     compose 순서 (analyzer outermost) 유지 권장.

import type { NextConfig } from "next";
import bundleAnalyzer from "@next/bundle-analyzer";

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

const nextConfig: NextConfig = {
  /* config options here */
};

export default withBundleAnalyzer(nextConfig);
