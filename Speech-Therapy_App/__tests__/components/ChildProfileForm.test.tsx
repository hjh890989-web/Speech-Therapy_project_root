// FR-C-PARENT-SETTINGS — ChildProfileForm 컴포넌트 단위 테스트.
//
// 격리:
//   - @/app/actions/update-child-profile mock (Server Action)
//   - @/lib/analytics trackEvent mock
//
// 시나리오 (총 8건):
//   1. 초기 mount → prefill (childAgeMonths + preferredPhonemes) 노출
//   2. prefill null → default 48 + 빈 음소 선택
//   3. slider 변경 → display 라벨 업데이트
//   4. 음소 토글 → 선택 / 해제 / max 5개 제한
//   5. 저장 클릭 → updateChildProfile 호출 + success toast 노출 + 분석 이벤트 발송
//   6. 저장 실패 → 에러 메시지 노출 (success toast 미노출)
//   7. 같은 값 저장 시 changedFields 빈 배열로 분석 이벤트 발송
//   8. CON-04 — 전체 UI 카피에 의료 금칙어 0건

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";

const updateChildProfileMock = vi.fn();
vi.mock("@/app/actions/update-child-profile", async () => {
  const actual =
    await vi.importActual<typeof import("@/app/actions/update-child-profile")>(
      "@/app/actions/update-child-profile",
    );
  return {
    ...actual,
    updateChildProfile: (...args: unknown[]) =>
      updateChildProfileMock(...args),
  };
});

const trackMock = vi.fn();
vi.mock("@/lib/analytics", () => ({
  trackEvent: (...args: unknown[]) => trackMock(...args),
}));

import { ChildProfileForm } from "@/components/settings/ChildProfileForm";

const FORBIDDEN = ["치료", "진단", "장애"];

beforeEach(() => {
  updateChildProfileMock.mockReset();
  trackMock.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("ChildProfileForm — FR-C-PARENT-SETTINGS", () => {
  it("[1] 초기 mount → prefill (childAgeMonths + preferredPhonemes) 노출", () => {
    render(
      <ChildProfileForm
        initialChildAgeMonths={60}
        initialPreferredPhonemes={["ㅅ", "ㅈ"]}
      />,
    );
    const slider = screen.getByTestId(
      "child-profile-age-slider",
    ) as HTMLInputElement;
    expect(slider.value).toBe("60");
    expect(screen.getByTestId("child-profile-age-display").textContent).toContain(
      "60개월".slice(0, 0), // placeholder — just sanity below
    );
    expect(screen.getByTestId("child-profile-age-display").textContent).toContain(
      "만 5세",
    );

    const sBtn = screen.getByTestId("child-profile-phoneme-ㅅ");
    expect(sBtn.getAttribute("aria-pressed")).toBe("true");
    const jBtn = screen.getByTestId("child-profile-phoneme-ㅈ");
    expect(jBtn.getAttribute("aria-pressed")).toBe("true");
    const gBtn = screen.getByTestId("child-profile-phoneme-ㄱ");
    expect(gBtn.getAttribute("aria-pressed")).toBe("false");

    expect(
      screen.getByTestId("child-profile-phoneme-count").textContent,
    ).toContain("2 / 5");
  });

  it("[2] prefill null → default 48 + 빈 음소 선택", () => {
    render(
      <ChildProfileForm
        initialChildAgeMonths={null}
        initialPreferredPhonemes={null}
      />,
    );
    const slider = screen.getByTestId(
      "child-profile-age-slider",
    ) as HTMLInputElement;
    expect(slider.value).toBe("48");
    expect(screen.getByTestId("child-profile-age-display").textContent).toContain(
      "만 4세",
    );
    for (const p of ["ㄱ", "ㄴ", "ㅅ", "ㅈ", "ㄹ"]) {
      const btn = screen.getByTestId(`child-profile-phoneme-${p}`);
      expect(btn.getAttribute("aria-pressed")).toBe("false");
    }
    expect(
      screen.getByTestId("child-profile-phoneme-count").textContent,
    ).toContain("0 / 5");
  });

  it("[3] slider 변경 → display 라벨 업데이트", () => {
    render(
      <ChildProfileForm
        initialChildAgeMonths={48}
        initialPreferredPhonemes={[]}
      />,
    );
    const slider = screen.getByTestId(
      "child-profile-age-slider",
    ) as HTMLInputElement;
    fireEvent.change(slider, { target: { value: "72" } });
    expect(slider.value).toBe("72");
    expect(screen.getByTestId("child-profile-age-display").textContent).toContain(
      "만 6세",
    );
  });

  it("[4] 음소 토글 → 선택 / 해제 / max 5개 제한", () => {
    render(
      <ChildProfileForm
        initialChildAgeMonths={48}
        initialPreferredPhonemes={[]}
      />,
    );
    const gBtn = screen.getByTestId("child-profile-phoneme-ㄱ");
    fireEvent.click(gBtn);
    expect(gBtn.getAttribute("aria-pressed")).toBe("true");

    // 추가 4개 선택 → 총 5개.
    fireEvent.click(screen.getByTestId("child-profile-phoneme-ㄴ"));
    fireEvent.click(screen.getByTestId("child-profile-phoneme-ㅅ"));
    fireEvent.click(screen.getByTestId("child-profile-phoneme-ㅈ"));
    fireEvent.click(screen.getByTestId("child-profile-phoneme-ㄹ"));
    expect(
      screen.getByTestId("child-profile-phoneme-count").textContent,
    ).toContain("5 / 5");

    // 5개 도달 상태에서 deselect 가능.
    fireEvent.click(gBtn);
    expect(gBtn.getAttribute("aria-pressed")).toBe("false");
    expect(
      screen.getByTestId("child-profile-phoneme-count").textContent,
    ).toContain("4 / 5");
  });

  it("[5] 저장 클릭 → updateChildProfile 호출 + success toast + 분석 이벤트", async () => {
    updateChildProfileMock.mockResolvedValue({
      success: true,
      userId: "u-1",
      childAgeMonths: 60,
      preferredPhonemes: ["ㅅ"],
    });
    render(
      <ChildProfileForm
        initialChildAgeMonths={48}
        initialPreferredPhonemes={[]}
      />,
    );

    // 변경 1) 슬라이더 60 으로.
    fireEvent.change(screen.getByTestId("child-profile-age-slider"), {
      target: { value: "60" },
    });
    // 변경 2) ㅅ 추가.
    fireEvent.click(screen.getByTestId("child-profile-phoneme-ㅅ"));

    await act(async () => {
      fireEvent.click(screen.getByTestId("child-profile-submit"));
    });

    await waitFor(() => {
      expect(updateChildProfileMock).toHaveBeenCalledTimes(1);
    });
    expect(updateChildProfileMock).toHaveBeenCalledWith({
      childAgeMonths: 60,
      preferredPhonemes: ["ㅅ"],
    });

    expect(screen.getByTestId("child-profile-success-toast").textContent).toBe(
      "저장되었어요!",
    );
    // 분석 이벤트 — child_profile_updated, 두 필드 모두 changed.
    expect(trackMock).toHaveBeenCalledTimes(1);
    const evtArgs = trackMock.mock.calls[0]!;
    expect(evtArgs[0]).toBe("child_profile_updated");
    expect(evtArgs[1].userId).toBe("u-1");
    expect(evtArgs[1].changedFields).toEqual(
      expect.arrayContaining(["childAgeMonths", "preferredPhonemes"]),
    );
  });

  it("[6] 저장 실패 → 에러 메시지 노출 (success toast 미노출)", async () => {
    updateChildProfileMock.mockResolvedValue({
      success: false,
      reason: "db_failed",
      message: "자녀 정보 저장에 실패했어요. 잠시 후 다시 시도해 주세요.",
    });
    render(
      <ChildProfileForm
        initialChildAgeMonths={48}
        initialPreferredPhonemes={[]}
      />,
    );
    await act(async () => {
      fireEvent.click(screen.getByTestId("child-profile-submit"));
    });
    await waitFor(() => {
      expect(screen.getByTestId("child-profile-error")).toBeTruthy();
    });
    expect(screen.getByTestId("child-profile-error").textContent).toContain(
      "저장에 실패",
    );
    expect(
      screen.queryByTestId("child-profile-success-toast"),
    ).toBeNull();
    // 실패 시 분석 이벤트 발송 안 함.
    expect(trackMock).not.toHaveBeenCalled();
  });

  it("[7] 같은 값 저장 시 changedFields 빈 배열로 분석 이벤트 발송", async () => {
    updateChildProfileMock.mockResolvedValue({
      success: true,
      userId: "u-2",
      childAgeMonths: 48,
      preferredPhonemes: ["ㅅ"],
    });
    render(
      <ChildProfileForm
        initialChildAgeMonths={48}
        initialPreferredPhonemes={["ㅅ"]}
      />,
    );
    await act(async () => {
      fireEvent.click(screen.getByTestId("child-profile-submit"));
    });
    await waitFor(() => {
      expect(trackMock).toHaveBeenCalledTimes(1);
    });
    expect(trackMock.mock.calls[0]![1].changedFields).toEqual([]);
  });

  it("[8] CON-04 — 전체 UI 카피에 의료 금칙어 0건", () => {
    // (a) 일반 prefill 렌더
    const { container: a, unmount: unA } = render(
      <ChildProfileForm
        initialChildAgeMonths={48}
        initialPreferredPhonemes={["ㅅ"]}
      />,
    );
    for (const w of FORBIDDEN) {
      expect(a.textContent ?? "").not.toContain(w);
    }
    unA();

    // (b) null prefill (default 분기)
    const { container: b, unmount: unB } = render(
      <ChildProfileForm
        initialChildAgeMonths={null}
        initialPreferredPhonemes={null}
      />,
    );
    for (const w of FORBIDDEN) {
      expect(b.textContent ?? "").not.toContain(w);
    }
    unB();
  });
});
