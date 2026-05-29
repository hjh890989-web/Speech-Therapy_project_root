// REQ-FUNC-CL-05 — MissionPhonemeIsolation (L1 단독 음소) 단위 테스트.

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

import { MissionPhonemeIsolation } from "@/components/missions/MissionPhonemeIsolation";
import type { MissionPhonemeIsolation as Isolation } from "@/lib/mocks/mission-content";

const ISO: Isolation = {
  phoneme: "ㅅ",
  mouthHint: "윗니와 아랫니를 살짝 붙이고 '스~' 하고 바람을 내보내요",
};

describe("MissionPhonemeIsolation — L1 단독 음소", () => {
  it("초기 진입: 음소 + 입모양 힌트 노출", () => {
    render(<MissionPhonemeIsolation phoneme="ㅅ" isolation={ISO} />);
    expect(screen.getByTestId("mission-phoneme-isolation")).toBeInTheDocument();
    expect(screen.getByTestId("mission-phoneme-isolation-text").textContent).toBe("ㅅ");
    expect(screen.getByTestId("mission-phoneme-isolation-hint").textContent).toMatch(/바람/);
  });

  it("'소리 내봤어요' 클릭 → onComplete 호출 + done UI", () => {
    const onComplete = vi.fn();
    render(<MissionPhonemeIsolation phoneme="ㅅ" isolation={ISO} onComplete={onComplete} />);
    fireEvent.click(screen.getByTestId("mission-phoneme-isolation-next"));

    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("mission-phoneme-isolation-done")).toBeInTheDocument();
    expect(screen.getByText(/잘 했어요/)).toBeInTheDocument();
  });
});
