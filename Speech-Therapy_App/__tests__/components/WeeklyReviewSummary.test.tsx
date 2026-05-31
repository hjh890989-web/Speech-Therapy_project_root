// FR-Q-WEEKLY-REVIEW — WeeklyReviewSummary 단위 테스트.
//
// 검증 시나리오:
//   [1] 3축 값 정확 반올림 + 카드 3개 렌더
//   [2] W-AUR 달성 (sessionCount=5) → achieved 카드 노출 + pending 카드 미노출
//   [3] W-AUR 미달성 (sessionCount=2) → pending 카드 "2회 더 하면…" + achieved 미노출
//   [4] peerPercentile null → empty 폴백 카피 노출
//   [5] peerPercentile=80 → "상위 20%" 표기 (100 - 80)
//   [6] peerPercentile=20 → "상위 80%" 표기
//   [7] CON-04 금칙어 0건 (모든 케이스)

import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";

// WeeklyReviewSummary 는 lib/reports/weekly-aggregator 에서 W_AUR_MIN_MISSIONS 상수만 import 하나,
// aggregator 가 lib/db (Prisma client) 를 transitively 의존 — Prisma client 가 generate 안 된
// 테스트 환경에서는 vite import-analysis 가 실패한다. mock 으로 lib/db 차단.
vi.mock("@/lib/db", () => ({ prisma: {} }));

import { WeeklyReviewSummary } from "@/components/weekly-review/WeeklyReviewSummary";

const FORBIDDEN_MEDICAL_WORDS = ["치료", "진단", "장애"];

function assertNoMedicalTerms(text: string) {
  for (const word of FORBIDDEN_MEDICAL_WORDS) {
    expect(text).not.toContain(word);
  }
}

describe("WeeklyReviewSummary — FR-Q-WEEKLY-REVIEW 요약 카드", () => {
  it("[1] 3축 값 정확 반올림 + 카드 3개 렌더", () => {
    const { container } = render(
      <WeeklyReviewSummary
        articulationAvg={74.6}
        linguisticAvg={68.4}
        acousticAvg={71}
        peerPercentileAvg={72}
        missionCompletedCount={4}
      />,
    );

    expect(
      container.querySelector("[data-testid='weekly-review-axis-articulation-value']")
        ?.textContent,
    ).toContain("75");
    expect(
      container.querySelector("[data-testid='weekly-review-axis-linguistic-value']")
        ?.textContent,
    ).toContain("68");
    expect(
      container.querySelector("[data-testid='weekly-review-axis-acoustic-value']")
        ?.textContent,
    ).toContain("71");
  });

  it("[2] W-AUR 달성 (sessionCount=5) → achieved 카드 노출 + pending 미노출", () => {
    const { container } = render(
      <WeeklyReviewSummary
        articulationAvg={70}
        linguisticAvg={70}
        acousticAvg={70}
        peerPercentileAvg={50}
        missionCompletedCount={5}
      />,
    );

    expect(container.querySelector("[data-testid='weekly-review-waur-achieved']")).not.toBeNull();
    expect(container.querySelector("[data-testid='weekly-review-waur-pending']")).toBeNull();
  });

  it("[3] W-AUR 미달성 (sessionCount=2) → 'X회 더 하면…' 카피 + achieved 미노출", () => {
    const { container } = render(
      <WeeklyReviewSummary
        articulationAvg={70}
        linguisticAvg={70}
        acousticAvg={70}
        peerPercentileAvg={50}
        missionCompletedCount={2}
      />,
    );

    const pending = container.querySelector("[data-testid='weekly-review-waur-pending']");
    expect(pending).not.toBeNull();
    expect(pending?.textContent).toContain("2회 더");
    expect(container.querySelector("[data-testid='weekly-review-waur-achieved']")).toBeNull();
  });

  it("[4] peerPercentile null → empty 폴백 카피 노출", () => {
    const { container } = render(
      <WeeklyReviewSummary
        articulationAvg={70}
        linguisticAvg={70}
        acousticAvg={70}
        peerPercentileAvg={null}
        missionCompletedCount={4}
      />,
    );

    expect(container.querySelector("[data-testid='weekly-review-peer-empty']")).not.toBeNull();
    expect(container.querySelector("[data-testid='weekly-review-peer-text']")).toBeNull();
  });

  it("[5] peerPercentile=80 → '상위 20%' 표기", () => {
    const { container } = render(
      <WeeklyReviewSummary
        articulationAvg={70}
        linguisticAvg={70}
        acousticAvg={70}
        peerPercentileAvg={80}
        missionCompletedCount={4}
      />,
    );

    const text = container.querySelector("[data-testid='weekly-review-peer-text']")?.textContent ?? "";
    expect(text).toContain("상위 20%");
  });

  it("[6] peerPercentile=20 → '상위 80%' 표기", () => {
    const { container } = render(
      <WeeklyReviewSummary
        articulationAvg={70}
        linguisticAvg={70}
        acousticAvg={70}
        peerPercentileAvg={20}
        missionCompletedCount={4}
      />,
    );

    const text = container.querySelector("[data-testid='weekly-review-peer-text']")?.textContent ?? "";
    expect(text).toContain("상위 80%");
  });

  it("[7] CON-04 의료 금칙어 0건 (achieved / pending / peer empty / peer 일반)", () => {
    // (a) achieved + peer 일반.
    const { container: a } = render(
      <WeeklyReviewSummary
        articulationAvg={80}
        linguisticAvg={75}
        acousticAvg={70}
        peerPercentileAvg={60}
        missionCompletedCount={5}
      />,
    );
    assertNoMedicalTerms(a.textContent ?? "");

    // (b) pending + peer 일반.
    const { container: b } = render(
      <WeeklyReviewSummary
        articulationAvg={50}
        linguisticAvg={40}
        acousticAvg={30}
        peerPercentileAvg={10}
        missionCompletedCount={1}
      />,
    );
    assertNoMedicalTerms(b.textContent ?? "");

    // (c) peer empty.
    const { container: c } = render(
      <WeeklyReviewSummary
        articulationAvg={70}
        linguisticAvg={70}
        acousticAvg={70}
        peerPercentileAvg={null}
        missionCompletedCount={3}
      />,
    );
    assertNoMedicalTerms(c.textContent ?? "");
  });
});
