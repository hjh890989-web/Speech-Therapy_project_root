// REQ-FUNC-CL-05 — MissionSyllable (L2 음절) 단위 테스트.

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

import { MissionSyllable } from "@/components/missions/MissionSyllable";
import type { MissionSyllable as Syllable } from "@/lib/mocks/mission-content";

const SYLLABLES: Syllable[] = [{ text: "사" }, { text: "수" }];

describe("MissionSyllable — L2 음절", () => {
  it("초기 진입: 1번째 음절 + 진행률(1/N)", () => {
    render(<MissionSyllable phoneme="ㅅ" syllables={SYLLABLES} />);
    expect(screen.getByTestId("mission-syllable-text").textContent).toBe("사");
    expect(screen.getByTestId("mission-syllable-progress").textContent).toMatch(/1\s*\/\s*2/);
  });

  it("다음 음절 클릭 → index 증가 + 다음 음절 노출", () => {
    render(<MissionSyllable phoneme="ㅅ" syllables={SYLLABLES} />);
    fireEvent.click(screen.getByTestId("mission-syllable-next"));
    expect(screen.getByTestId("mission-syllable-text").textContent).toBe("수");
    expect(screen.getByTestId("mission-syllable-progress").textContent).toMatch(/2\s*\/\s*2/);
  });

  it("마지막 음절 완료 → onComplete 호출 + done UI", () => {
    const onComplete = vi.fn();
    render(<MissionSyllable phoneme="ㅅ" syllables={SYLLABLES} onComplete={onComplete} />);
    fireEvent.click(screen.getByTestId("mission-syllable-next")); // → 2번째
    fireEvent.click(screen.getByTestId("mission-syllable-next")); // → done

    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("mission-syllable-done")).toBeInTheDocument();
  });

  it("마지막 음절에서 버튼 라벨 변화", () => {
    render(<MissionSyllable phoneme="ㅅ" syllables={SYLLABLES} />);
    fireEvent.click(screen.getByTestId("mission-syllable-next")); // → 마지막
    expect(screen.getByTestId("mission-syllable-next").textContent).toMatch(/마지막/);
  });

  it("빈 배열 → 안내 메시지 + crash 없음", () => {
    render(<MissionSyllable phoneme="ㅅ" syllables={[]} />);
    expect(screen.getByText(/준비된 음절이 없어요/)).toBeInTheDocument();
  });
});
