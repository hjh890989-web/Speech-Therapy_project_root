// REQ-FUNC-CL-05 — MissionPhrase (L4 구) 단위 테스트.

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

import { MissionPhrase } from "@/components/missions/MissionPhrase";
import type { MissionPhrase as Phrase } from "@/lib/mocks/mission-content";

const PHRASES: Phrase[] = [
  { phrase: "빨간 사과", focusWord: "사과", reading: "빨·간 사·과" },
  { phrase: "큰 수박", focusWord: "수박", reading: "큰 수·박" },
];

describe("MissionPhrase — L4 구", () => {
  it("초기 진입: 1번째 구 + focusWord 강조 + reading + 진행률", () => {
    render(<MissionPhrase phoneme="ㅅ" phrases={PHRASES} />);
    expect(screen.getByTestId("mission-phrase-text").textContent).toMatch(/빨간 사과/);
    expect(screen.getByTestId("mission-phrase-focus").textContent).toBe("사과");
    expect(screen.getByTestId("mission-phrase-reading").textContent).toMatch(/빨·간 사·과/);
    expect(screen.getByTestId("mission-phrase-progress").textContent).toMatch(/1\s*\/\s*2/);
  });

  it("다음 구 클릭 → 다음 구 노출", () => {
    render(<MissionPhrase phoneme="ㅅ" phrases={PHRASES} />);
    fireEvent.click(screen.getByTestId("mission-phrase-next"));
    expect(screen.getByTestId("mission-phrase-text").textContent).toMatch(/큰 수박/);
  });

  it("마지막 구 완료 → onComplete 호출 + done UI", () => {
    const onComplete = vi.fn();
    render(<MissionPhrase phoneme="ㅅ" phrases={PHRASES} onComplete={onComplete} />);
    fireEvent.click(screen.getByTestId("mission-phrase-next")); // → 2번째
    fireEvent.click(screen.getByTestId("mission-phrase-next")); // → done

    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("mission-phrase-done")).toBeInTheDocument();
  });

  it("빈 배열 → 안내 메시지 + crash 없음", () => {
    render(<MissionPhrase phoneme="ㅅ" phrases={[]} />);
    expect(screen.getByText(/준비된 구가 없어요/)).toBeInTheDocument();
  });
});
