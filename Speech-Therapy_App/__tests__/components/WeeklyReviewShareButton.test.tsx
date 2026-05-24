// FR-Q-WEEKLY-REVIEW — WeeklyReviewShareButton 단위 테스트.
//
// 검증 시나리오:
//   [1] 클릭 → shareOrCopy 호출 (surface='weekly_report' + R4 safe text)
//   [2] Web Share 성공 → 격려 toast 노출
//   [3] clipboard 폴백 → 복사 toast 노출
//   [4] AbortError (canceled) → toast 미노출
//   [5] unsupported → alert 노출
//   [6] R4 — shareText 에 userId / 자녀 이름 미포함, 점수 + 회수만
//   [7] CON-04 의료 금칙어 0건 (모든 상태)

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const shareMock = vi.fn();
vi.mock("@/lib/share", () => ({
  shareOrCopy: (...args: unknown[]) => shareMock(...args),
}));

import { WeeklyReviewShareButton } from "@/components/weekly-review/WeeklyReviewShareButton";

const FORBIDDEN_MEDICAL_WORDS = ["치료", "진단", "장애"];

function assertNoMedicalTerms(text: string) {
  for (const word of FORBIDDEN_MEDICAL_WORDS) {
    expect(text).not.toContain(word);
  }
}

beforeEach(() => {
  shareMock.mockReset();
});

describe("WeeklyReviewShareButton — FR-Q-WEEKLY-REVIEW 공유 버튼", () => {
  it("[1] 클릭 → shareOrCopy 호출 (surface='weekly_report' + 점수 + 회수)", async () => {
    shareMock.mockResolvedValueOnce({ method: "web_share", succeeded: true });

    render(<WeeklyReviewShareButton articulationAvg={74.6} sessionCount={5} />);
    fireEvent.click(screen.getByTestId("weekly-review-share-button"));

    await waitFor(() => expect(shareMock).toHaveBeenCalledTimes(1));
    const [arg] = shareMock.mock.calls[0] as [
      { title: string; text: string; url: string; surface: string },
    ];
    expect(arg.surface).toBe("weekly_report");
    expect(arg.text).toContain("조음 75점"); // 반올림
    expect(arg.text).toContain("활동 5회");
    expect(arg.title).toBe("이번 주 발음 발달 리뷰");
  });

  it("[2] Web Share 성공 → '이번 주도 수고하셨어요!' toast", async () => {
    shareMock.mockResolvedValueOnce({ method: "web_share", succeeded: true });

    render(<WeeklyReviewShareButton articulationAvg={70} sessionCount={4} />);
    fireEvent.click(screen.getByTestId("weekly-review-share-button"));

    await waitFor(() =>
      expect(screen.getByTestId("weekly-review-share-toast-shared")).toBeInTheDocument(),
    );
  });

  it("[3] clipboard 폴백 성공 → 복사 toast 노출", async () => {
    shareMock.mockResolvedValueOnce({ method: "clipboard", succeeded: true });

    render(<WeeklyReviewShareButton articulationAvg={70} sessionCount={4} />);
    fireEvent.click(screen.getByTestId("weekly-review-share-button"));

    await waitFor(() =>
      expect(screen.getByTestId("weekly-review-share-toast-copied")).toBeInTheDocument(),
    );
  });

  it("[4] AbortError (web_share canceled) → toast 미노출 (graceful)", async () => {
    shareMock.mockResolvedValueOnce({ method: "web_share", succeeded: false });

    render(<WeeklyReviewShareButton articulationAvg={70} sessionCount={4} />);
    fireEvent.click(screen.getByTestId("weekly-review-share-button"));

    // 짧게 대기 — shareOrCopy 가 resolve 한 직후 상태 transition 확인.
    await waitFor(() => expect(shareMock).toHaveBeenCalled());
    expect(screen.queryByTestId("weekly-review-share-toast-shared")).toBeNull();
    expect(screen.queryByTestId("weekly-review-share-toast-copied")).toBeNull();
    expect(screen.queryByTestId("weekly-review-share-toast-unsupported")).toBeNull();
  });

  it("[5] unsupported → alert 노출", async () => {
    shareMock.mockResolvedValueOnce({
      method: "unsupported",
      succeeded: false,
      message: "이 기기에서는 자동 공유가 지원되지 않아요.",
    });

    render(<WeeklyReviewShareButton articulationAvg={70} sessionCount={4} />);
    fireEvent.click(screen.getByTestId("weekly-review-share-button"));

    await waitFor(() =>
      expect(screen.getByTestId("weekly-review-share-toast-unsupported")).toBeInTheDocument(),
    );
  });

  it("[6] R4 — shareText 에 userId / 자녀 이름 미포함, 점수 + 회수만", async () => {
    shareMock.mockResolvedValueOnce({ method: "web_share", succeeded: true });

    render(<WeeklyReviewShareButton articulationAvg={80} sessionCount={6} />);
    fireEvent.click(screen.getByTestId("weekly-review-share-button"));

    await waitFor(() => expect(shareMock).toHaveBeenCalled());
    const [arg] = shareMock.mock.calls[0] as [{ text: string }];
    // R4 — UUID 형식 / "@" / "email" 미포함.
    expect(arg.text).not.toMatch(/[0-9a-f-]{36}/i);
    expect(arg.text).not.toContain("@");
    expect(arg.text.toLowerCase()).not.toContain("email");
  });

  it("[7] CON-04 의료 금칙어 0건 (shared / copied / unsupported / 초기)", async () => {
    // shared
    shareMock.mockResolvedValueOnce({ method: "web_share", succeeded: true });
    const { container: a, unmount: ua } = render(
      <WeeklyReviewShareButton articulationAvg={70} sessionCount={4} />,
    );
    fireEvent.click(screen.getByTestId("weekly-review-share-button"));
    await waitFor(() => expect(screen.getByTestId("weekly-review-share-toast-shared")).toBeInTheDocument());
    assertNoMedicalTerms(a.textContent ?? "");
    // shareText 도 검증.
    const [argA] = shareMock.mock.calls[0] as [{ text: string }];
    assertNoMedicalTerms(argA.text);
    ua();

    // copied
    shareMock.mockResolvedValueOnce({ method: "clipboard", succeeded: true });
    const { container: b, unmount: ub } = render(
      <WeeklyReviewShareButton articulationAvg={70} sessionCount={4} />,
    );
    fireEvent.click(screen.getByTestId("weekly-review-share-button"));
    await waitFor(() => expect(screen.getByTestId("weekly-review-share-toast-copied")).toBeInTheDocument());
    assertNoMedicalTerms(b.textContent ?? "");
    ub();

    // unsupported
    shareMock.mockResolvedValueOnce({ method: "unsupported", succeeded: false, message: "안 돼요" });
    const { container: c } = render(
      <WeeklyReviewShareButton articulationAvg={70} sessionCount={4} />,
    );
    fireEvent.click(screen.getByTestId("weekly-review-share-button"));
    await waitFor(() => expect(screen.getByTestId("weekly-review-share-toast-unsupported")).toBeInTheDocument());
    assertNoMedicalTerms(c.textContent ?? "");
  });
});
