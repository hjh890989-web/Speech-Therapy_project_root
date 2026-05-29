// REQ-FUNC-CL-07 — ParentCoachingTip 단위 테스트.

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import { ParentCoachingTip } from "@/components/missions/ParentCoachingTip";
import { getCoachingTips } from "@/lib/mocks/coaching-tips";

describe("ParentCoachingTip — 부모 코칭 4대 기법", () => {
  it("코칭 헤딩 + 레벨별 기법 개수만큼 항목 렌더", () => {
    render(<ParentCoachingTip level={3} />);
    expect(screen.getByTestId("parent-coaching-tip")).toBeInTheDocument();
    expect(screen.getByText(/이렇게 도와주세요/)).toBeInTheDocument();
    const items = screen.getAllByTestId("parent-coaching-tip-item");
    expect(items).toHaveLength(getCoachingTips(3).length);
  });

  it("기다리기 기법은 항상 노출 (전 레벨 공통)", () => {
    render(<ParentCoachingTip level={1} />);
    expect(screen.getByText(/기다리기/)).toBeInTheDocument();
    expect(screen.getByText(/3~5초/)).toBeInTheDocument();
  });

  it("레벨대별 기법 차등 (L1 vs L4)", () => {
    const { unmount } = render(<ParentCoachingTip level={1} />);
    expect(screen.queryByText(/평행 발화/)).not.toBeInTheDocument(); // L1~2 엔 미포함
    unmount();

    render(<ParentCoachingTip level={4} />);
    expect(screen.getByText(/평행 발화/)).toBeInTheDocument(); // L3~4 엔 포함
  });
});
