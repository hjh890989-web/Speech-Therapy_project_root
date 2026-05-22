// FR-Q-011 (Issue #52) / REQ-FUNC-048 — ROI 시뮬레이터 페이지 (Server Component shell).
//
// P2 B2B 트랙. 원장 (institution principal) 이 도입 결정 시 사용.
//
// 구조:
//   - 상단/하단 Disclaimer 강제 (CON-04 + R1: 본 시뮬은 추정치 명시)
//   - 본문은 Client Component <RoiSimulator /> 로 인터랙티브 계산
//
// G2 비용 가드: 정적 페이지 + 클라이언트 측 계산 → 서버 비용 0.
//
// CON-04 카피 검증: 의료 금칙어 0건 — 비즈니스 표현만 사용.

import { RoiSimulator } from "./RoiSimulator";

export const metadata = {
  title: "ROI 시뮬레이터 — Speech-Therapy",
  description:
    "원아 수 · 월 비용 · 전문가 시간 가정값을 입력해 도입 ROI 를 시뮬해 보세요. 본 시뮬은 추정치입니다.",
};

export default function RoiPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:py-12">
      {/* Disclaimer #1 — 상단 (CON-04 + 추정치 명시) */}
      <p
        data-testid="disclaimer"
        className="mb-6 rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-100"
      >
        본 시뮬은 추정치이며 실 ROI 는 운영 변수에 따라 다릅니다.
      </p>

      <header className="mb-6 space-y-2">
        <h1 className="text-2xl font-bold sm:text-3xl">도입 ROI 시뮬레이터</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          원아 수와 월 비용 가정을 조정하면 예상 매출과 절감 효과를 즉시 확인할 수 있어요.
        </p>
      </header>

      <RoiSimulator />

      {/* Disclaimer #2 — 하단 강조 */}
      <p
        data-testid="disclaimer"
        className="mt-8 rounded-md border border-gray-200 px-4 py-3 text-xs text-gray-600 dark:border-gray-700 dark:text-gray-400"
      >
        본 시뮬은 추정치이며 실 ROI 는 원아 등록 추이, 운영 효율 등 다양한 변수에 따라 다릅니다.
        도입 검토는 정식 견적과 함께 진행해 주세요.
      </p>
    </main>
  );
}
