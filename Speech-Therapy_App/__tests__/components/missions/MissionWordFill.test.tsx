// FR-Q-003-CONTENT — MissionWordFill 단위 테스트.
// 검증: 카드 progression / reveal toggle / onComplete 호출.

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

import { MissionWordFill } from "@/components/missions/MissionWordFill";
import type { MissionWord } from "@/lib/mocks/mission-content";

const WORDS: MissionWord[] = [
  { full: "사과", blank: "_과", hint: "빨간 과일" },
  { full: "신발", blank: "_발", hint: "발에 신어요" },
];

describe("MissionWordFill — 난이도 2 빈칸 채우기", () => {
  it("초기 진입: 1번째 단어 blank + hint + 진행률(1/N) 노출", () => {
    render(<MissionWordFill phoneme="ㅅ" words={WORDS} />);
    expect(screen.getByTestId("mission-word-fill")).toBeInTheDocument();
    expect(screen.getByTestId("mission-word-display").textContent).toBe("_과");
    expect(screen.getByText(/빨간 과일/)).toBeInTheDocument();
    expect(screen.getByTestId("mission-word-fill-progress").textContent).toMatch(
      /^\s*1\s*\/\s*2\s*$/,
    );
  });

  it("정답 보기 → full 단어 노출 + 다음 버튼 전환", () => {
    render(<MissionWordFill phoneme="ㅅ" words={WORDS} />);
    fireEvent.click(screen.getByTestId("mission-word-reveal"));
    expect(screen.getByTestId("mission-word-display").textContent).toBe("사과");
    expect(screen.getByTestId("mission-word-next")).toBeInTheDocument();
  });

  it("다음 단어 → index 증가 + blank 다시 노출", () => {
    render(<MissionWordFill phoneme="ㅅ" words={WORDS} />);
    fireEvent.click(screen.getByTestId("mission-word-reveal"));
    fireEvent.click(screen.getByTestId("mission-word-next"));
    expect(screen.getByTestId("mission-word-display").textContent).toBe("_발");
    expect(screen.getByTestId("mission-word-fill-progress").textContent).toMatch(/2\s*\/\s*2/);
  });

  it("마지막 단어 완료 → onComplete 호출 + done UI 노출", () => {
    const onComplete = vi.fn();
    render(<MissionWordFill phoneme="ㅅ" words={WORDS} onComplete={onComplete} />);
    fireEvent.click(screen.getByTestId("mission-word-reveal"));
    fireEvent.click(screen.getByTestId("mission-word-next")); // → 2번째
    fireEvent.click(screen.getByTestId("mission-word-reveal"));
    fireEvent.click(screen.getByTestId("mission-word-next")); // → done

    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("mission-word-fill-done")).toBeInTheDocument();
  });

  it("빈 words 배열 → 안내 메시지 + crash 없음", () => {
    render(<MissionWordFill phoneme="ㅅ" words={[]} />);
    expect(screen.getByText(/준비된 단어가 없어요/)).toBeInTheDocument();
  });
});
