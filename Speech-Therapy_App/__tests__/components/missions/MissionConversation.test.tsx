// REQ-FUNC-CL-05 — MissionConversation (L6 대화) 단위 테스트.

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

import { MissionConversation } from "@/components/missions/MissionConversation";
import type { MissionConversation as Conversation } from "@/lib/mocks/mission-content";

const CONVERSATIONS: Conversation[] = [
  { prompt: "무슨 과일 좋아해?", focusWord: "사과", turnHint: "아이가 답하면 색을 물어보세요" },
  { prompt: "수박은 어떤 맛일까?", focusWord: "수박", turnHint: "또 무슨 과일 아는지 이어가세요" },
];

describe("MissionConversation — L6 대화", () => {
  it("초기 진입: 1번째 prompt + turnHint + 진행률", () => {
    render(<MissionConversation phoneme="ㅅ" conversations={CONVERSATIONS} />);
    expect(screen.getByTestId("mission-conversation-text").textContent).toMatch(/무슨 과일 좋아해/);
    expect(screen.getByTestId("mission-conversation-hint").textContent).toMatch(/색을 물어보세요/);
    expect(screen.getByTestId("mission-conversation-progress").textContent).toMatch(/1\s*\/\s*2/);
  });

  it("다음 질문 클릭 → 다음 prompt 노출", () => {
    render(<MissionConversation phoneme="ㅅ" conversations={CONVERSATIONS} />);
    fireEvent.click(screen.getByTestId("mission-conversation-next"));
    expect(screen.getByTestId("mission-conversation-text").textContent).toMatch(/수박은 어떤 맛/);
  });

  it("마지막 질문 완료 → onComplete 호출 + done UI", () => {
    const onComplete = vi.fn();
    render(
      <MissionConversation phoneme="ㅅ" conversations={CONVERSATIONS} onComplete={onComplete} />,
    );
    fireEvent.click(screen.getByTestId("mission-conversation-next")); // → 2번째
    fireEvent.click(screen.getByTestId("mission-conversation-next")); // → done

    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("mission-conversation-done")).toBeInTheDocument();
  });

  it("빈 배열 → 안내 메시지 + crash 없음", () => {
    render(<MissionConversation phoneme="ㅅ" conversations={[]} />);
    expect(screen.getByText(/준비된 대화가 없어요/)).toBeInTheDocument();
  });
});
