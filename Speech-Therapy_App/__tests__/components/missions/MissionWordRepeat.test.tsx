// FR-Q-003-CONTENT-V2 — MissionWordRepeat 단위 테스트.
// 검증: 카드 progression / 진행률 / onComplete 호출 / done UI / 빈 배열 방어.

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

import { MissionWordRepeat } from "@/components/missions/MissionWordRepeat";
import type { MissionWordSimple } from "@/lib/mocks/mission-content";

const WORDS: MissionWordSimple[] = [
  { text: "사과", reading: "사·과" },
  { text: "신발", reading: "신·발" },
];

describe("MissionWordRepeat — 난이도 1 단어 따라하기", () => {
  it("초기 진입: 1번째 단어 text + reading + 진행률(1/N) 노출", () => {
    render(<MissionWordRepeat phoneme="ㅅ" words={WORDS} />);
    expect(screen.getByTestId("mission-word-repeat")).toBeInTheDocument();
    expect(screen.getByTestId("mission-word-repeat-text").textContent).toBe("사과");
    expect(screen.getByTestId("mission-word-repeat-reading").textContent).toMatch(/사·과/);
    expect(screen.getByTestId("mission-word-repeat-progress").textContent).toMatch(
      /^\s*1\s*\/\s*2\s*$/,
    );
  });

  it("다음 단어 클릭 → index 증가 + 다음 단어 노출", () => {
    render(<MissionWordRepeat phoneme="ㅅ" words={WORDS} />);
    fireEvent.click(screen.getByTestId("mission-word-repeat-next"));
    expect(screen.getByTestId("mission-word-repeat-text").textContent).toBe("신발");
    expect(screen.getByTestId("mission-word-repeat-progress").textContent).toMatch(/2\s*\/\s*2/);
  });

  it("마지막 단어 완료 → onComplete 호출 + done UI 노출", () => {
    const onComplete = vi.fn();
    render(<MissionWordRepeat phoneme="ㅅ" words={WORDS} onComplete={onComplete} />);
    fireEvent.click(screen.getByTestId("mission-word-repeat-next")); // → 2번째
    fireEvent.click(screen.getByTestId("mission-word-repeat-next")); // → done

    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("mission-word-repeat-done")).toBeInTheDocument();
    expect(screen.getByText(/잘 했어요/)).toBeInTheDocument();
  });

  it("마지막 단어 위에 'last' 카피 — 다음 버튼 라벨 변화", () => {
    render(<MissionWordRepeat phoneme="ㅅ" words={WORDS} />);
    fireEvent.click(screen.getByTestId("mission-word-repeat-next")); // → 2번째 (마지막)
    expect(screen.getByTestId("mission-word-repeat-next").textContent).toMatch(/마지막/);
  });

  it("빈 words 배열 → 안내 메시지 + crash 없음", () => {
    render(<MissionWordRepeat phoneme="ㅅ" words={[]} />);
    expect(screen.getByText(/준비된 단어가 없어요/)).toBeInTheDocument();
  });
});
