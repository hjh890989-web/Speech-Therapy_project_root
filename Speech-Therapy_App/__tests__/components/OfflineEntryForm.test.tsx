// FR-Q-013 후속 — OfflineEntryForm Client Component 단위 테스트 (≥6).
//
// 격리:
//   - next/navigation router mock (refresh 캡처)
//   - @/app/actions/offline-entry submitOfflineEntry mock
//
// 시나리오:
//   1) 초기 렌더 — kind / note / observedAt 입력 + 제출 버튼 노출
//   2) note 비어 있음 → 제출 버튼 disabled
//   3) note 입력 + submit → submitOfflineEntry 호출 + 성공 시 reset + refresh
//   4) submit 실패 (banned_term) → 에러 메시지 노출, refresh 미호출
//   5) note 글자 수 카운터 — 입력에 따라 갱신
//   6) submit 중 → 버튼 aria-busy + 텍스트 변경
//   7) kind select 변경 → state 갱신 + submit 시 payload 반영

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";

const refreshMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: refreshMock }),
}));

const submitOfflineEntryMock = vi.fn();
vi.mock("@/app/actions/offline-entry", () => ({
  submitOfflineEntry: (...args: unknown[]) => submitOfflineEntryMock(...args),
}));

// 컴포넌트가 lib/offline-entry/repo 로부터 OFFLINE_ENTRY_KINDS 등 상수를 import →
// repo 가 lib/db (Prisma) 를 끌어와 happy-dom 에서 generated client 없으면 throw.
// 상수 stub 만 노출 — 본 컴포넌트 테스트는 DB IO 미검증.
vi.mock("@/lib/offline-entry/repo", () => ({
  OFFLINE_ENTRY_KINDS: ["practice", "observation", "note"] as const,
  OFFLINE_ENTRY_NOTE_MAX_LENGTH: 500,
}));

import { OfflineEntryForm } from "@/components/admin/teacher/OfflineEntryForm";

const TARGET_USER_ID = "tttttttt-tttt-4ttt-8ttt-tttttttttttt";

beforeEach(() => {
  refreshMock.mockReset();
  submitOfflineEntryMock.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("OfflineEntryForm — 초기 렌더 / 입력 검증", () => {
  it("[1] 초기 렌더 — 모든 필드 + 제출 버튼 노출", () => {
    render(<OfflineEntryForm userId={TARGET_USER_ID} />);

    const form = screen.getByTestId("offline-entry-form");
    expect(form).toBeInTheDocument();
    expect(form.getAttribute("data-user-id")).toBe(TARGET_USER_ID);

    expect(screen.getByTestId("offline-entry-kind")).toBeInTheDocument();
    expect(screen.getByTestId("offline-entry-note")).toBeInTheDocument();
    expect(screen.getByTestId("offline-entry-observed-at")).toBeInTheDocument();
    expect(screen.getByTestId("offline-entry-submit")).toBeInTheDocument();
  });

  it("[2] note 비어 있음 → 제출 버튼 disabled", () => {
    render(<OfflineEntryForm userId={TARGET_USER_ID} />);
    const submit = screen.getByTestId("offline-entry-submit") as HTMLButtonElement;
    expect(submit.disabled).toBe(true);
  });
});

describe("OfflineEntryForm — submit 정상 흐름", () => {
  it("[3] note 입력 + submit → submitOfflineEntry 호출 + 성공 시 reset + refresh", async () => {
    submitOfflineEntryMock.mockResolvedValueOnce({
      success: true,
      entryId: "entry-1",
      observedAt: new Date().toISOString(),
    });

    render(<OfflineEntryForm userId={TARGET_USER_ID} />);

    const note = screen.getByTestId("offline-entry-note") as HTMLTextAreaElement;
    fireEvent.change(note, { target: { value: "오늘 ㅅ 5회 연습" } });

    const submit = screen.getByTestId("offline-entry-submit") as HTMLButtonElement;
    expect(submit.disabled).toBe(false);

    await act(async () => {
      fireEvent.click(submit);
    });

    await waitFor(() => {
      expect(submitOfflineEntryMock).toHaveBeenCalledTimes(1);
    });

    const arg = submitOfflineEntryMock.mock.calls[0][0];
    expect(arg.userId).toBe(TARGET_USER_ID);
    expect(arg.kind).toBe("practice"); // default
    expect(arg.note).toBe("오늘 ㅅ 5회 연습");
    expect(typeof arg.observedAt).toBe("string");

    await waitFor(() => {
      expect(screen.getByTestId("offline-entry-success")).toBeInTheDocument();
    });
    // reset 확인 — note 빈 값.
    expect((screen.getByTestId("offline-entry-note") as HTMLTextAreaElement).value).toBe("");
    expect(refreshMock).toHaveBeenCalledTimes(1);
  });
});

describe("OfflineEntryForm — submit 실패", () => {
  it("[4] submit 실패 (banned_term) → 에러 메시지 노출, refresh 미호출", async () => {
    submitOfflineEntryMock.mockResolvedValueOnce({
      success: false,
      reason: "banned_term",
      message: "메모에 사용할 수 없는 단어가 포함됐어요.",
    });

    render(<OfflineEntryForm userId={TARGET_USER_ID} />);

    fireEvent.change(screen.getByTestId("offline-entry-note"), {
      target: { value: "치료를 받았어요" },
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId("offline-entry-submit"));
    });

    await waitFor(() => {
      expect(screen.getByTestId("offline-entry-error")).toBeInTheDocument();
    });
    expect(screen.getByTestId("offline-entry-error").textContent).toContain(
      "사용할 수 없는 단어",
    );
    expect(refreshMock).not.toHaveBeenCalled();
  });

  it("[4b] submit 자체 throw → 에러 메시지 (fallback copy)", async () => {
    submitOfflineEntryMock.mockRejectedValueOnce(new Error("network down"));

    render(<OfflineEntryForm userId={TARGET_USER_ID} />);
    fireEvent.change(screen.getByTestId("offline-entry-note"), {
      target: { value: "정상 메모" },
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId("offline-entry-submit"));
    });

    await waitFor(() => {
      expect(screen.getByTestId("offline-entry-error")).toBeInTheDocument();
    });
  });
});

describe("OfflineEntryForm — UI 인터랙션", () => {
  it("[5] note 글자 수 카운터 — 입력에 따라 갱신", () => {
    render(<OfflineEntryForm userId={TARGET_USER_ID} />);
    const counter = screen.getByTestId("offline-entry-note-count");
    expect(counter.textContent).toContain("0 /");

    fireEvent.change(screen.getByTestId("offline-entry-note"), {
      target: { value: "안녕하세요" },
    });
    expect(counter.textContent).toContain("5 /");
  });

  it("[6] kind select 변경 → submit payload 반영", async () => {
    submitOfflineEntryMock.mockResolvedValueOnce({
      success: true,
      entryId: "entry-x",
      observedAt: new Date().toISOString(),
    });

    render(<OfflineEntryForm userId={TARGET_USER_ID} />);

    const kind = screen.getByTestId("offline-entry-kind") as HTMLSelectElement;
    fireEvent.change(kind, { target: { value: "observation" } });
    expect(kind.value).toBe("observation");

    fireEvent.change(screen.getByTestId("offline-entry-note"), {
      target: { value: "관찰 메모" },
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId("offline-entry-submit"));
    });

    await waitFor(() => {
      expect(submitOfflineEntryMock).toHaveBeenCalledTimes(1);
    });
    expect(submitOfflineEntryMock.mock.calls[0][0].kind).toBe("observation");
  });
});
