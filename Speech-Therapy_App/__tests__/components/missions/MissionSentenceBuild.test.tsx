// FR-Q-003-CONTENT — MissionSentenceBuild 단위 테스트.

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

import { MissionSentenceBuild } from "@/components/missions/MissionSentenceBuild";
import type { MissionSentence } from "@/lib/mocks/mission-content";

const SENTENCES: MissionSentence[] = [
  { template: "사과를 먹어요", focusWord: "사과", reading: "사·과·를 먹·어·요" },
  { template: "신발을 신어요", focusWord: "신발", reading: "신·발·을 신·어·요" },
];

describe("MissionSentenceBuild — 난이도 3 문장 만들기", () => {
  it("초기 진입: 1번째 문장 template + focusWord 강조 + reading + 진행률(1/N)", () => {
    render(<MissionSentenceBuild phoneme="ㅅ" sentences={SENTENCES} />);
    expect(screen.getByTestId("mission-sentence-build")).toBeInTheDocument();

    const template = screen.getByTestId("mission-sentence-template");
    expect(template.textContent).toContain("사과를 먹어요");

    const focus = screen.getByTestId("mission-sentence-focus");
    expect(focus.textContent).toBe("사과");

    expect(screen.getByTestId("mission-sentence-reading").textContent).toContain("사·과·를");
    expect(screen.getByTestId("mission-sentence-build-progress").textContent).toMatch(
      /1\s*\/\s*2/,
    );
  });

  it("다 했어요 → 다음 문장 progression", () => {
    render(<MissionSentenceBuild phoneme="ㅅ" sentences={SENTENCES} />);
    fireEvent.click(screen.getByTestId("mission-sentence-next"));
    expect(screen.getByTestId("mission-sentence-template").textContent).toContain("신발을 신어요");
    expect(screen.getByTestId("mission-sentence-build-progress").textContent).toMatch(/2\s*\/\s*2/);
  });

  it("마지막 문장 완료 → onComplete 호출 + done UI", () => {
    const onComplete = vi.fn();
    render(
      <MissionSentenceBuild
        phoneme="ㅅ"
        sentences={SENTENCES}
        onComplete={onComplete}
      />,
    );
    fireEvent.click(screen.getByTestId("mission-sentence-next")); // → 2번째
    fireEvent.click(screen.getByTestId("mission-sentence-next")); // → done

    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("mission-sentence-build-done")).toBeInTheDocument();
  });

  it("focusWord 가 template 에 없으면 plain 텍스트 (강조 없음)", () => {
    render(
      <MissionSentenceBuild
        phoneme="ㅅ"
        sentences={[{ template: "안녕하세요", focusWord: "사과", reading: "안·녕" }]}
      />,
    );
    expect(screen.getByTestId("mission-sentence-template").textContent).toBe("안녕하세요");
    // strong 마크 부재.
    expect(screen.queryByTestId("mission-sentence-focus")).not.toBeInTheDocument();
  });
});
