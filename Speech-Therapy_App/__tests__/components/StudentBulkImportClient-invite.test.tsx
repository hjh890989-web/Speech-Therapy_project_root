// FR-C-016 / FR-Q-009 / FR-C-005 — StudentBulkImportClient 부모 초대 체크박스 UI 통합 테스트.
//
// 시나리오 (≥6):
//   I1. 체크박스 mount 시 unchecked 상태로 노출
//   I2. 체크박스 클릭 → checked 토글
//   I3. 체크박스 unchecked 인 채로 등록 → options.sendParentInvites=false 전달, parentInvites row 미표시
//   I4. 체크박스 checked 인 채로 등록 → options.sendParentInvites=true + institutionName 전달
//   I5. 응답에 parentInvites 있고 attempted>0 → 발송 결과 row (sent / skipped) 표시
//   I6. 응답에 parentInvites attempted=0 → 결과 row 미표시 (no-op 발송 보호)
//   I7. institutionName prop 미전달 → effectiveInstitutionName="우리 기관" 기본값 사용
//   I8. institutionName prop 공백 → "우리 기관" fallback
//   I9. 체크박스 ON + 응답 parentInvites 없음 (legacy 응답) → 결과 row 미표시 (graceful)
//
// 격리:
//   - submitBulkImport Server Action: vi.mock — 실 Prisma / Supabase 호출 0건.
//   - trackEvent (analytics): vi.mock — Vercel Analytics SDK 의존 차단.
//
// 본 테스트는 기존 StudentBulkImportClient.test.tsx (C1~C6) 와 독립 — 회귀 0건 확인 후 추가.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const submitBulkImportMock = vi.fn();
vi.mock("@/app/actions/student-bulk-import", () => ({
  submitBulkImport: (...args: unknown[]) => submitBulkImportMock(...args),
}));

const trackEventMock = vi.fn();
vi.mock("@/lib/analytics", () => ({
  trackEvent: (...args: unknown[]) => trackEventMock(...args),
}));

import { StudentBulkImportClient } from "@/components/admin/StudentBulkImportClient";

const INST = "22222222-2222-4222-8222-222222222222";
const INST_NAME = "햇님 어린이집";

const VALID_CSV = [
  "학번,이름,생년월일,반,부모이메일",
  "STU000001,김서윤,2022-03-15,햇님반,parent1@example.com",
  "STU000002,이도윤,2021-08-22,달님반,parent2@example.com",
].join("\n");

function makeCsvFile(text: string, name = "students.csv"): File {
  return new File([text], name, { type: "text/csv" });
}

async function uploadAndWaitForSubmit() {
  fireEvent.change(screen.getByTestId("student-bulk-import-file"), {
    target: { files: [makeCsvFile(VALID_CSV)] },
  });
  await waitFor(() => {
    expect(screen.getByTestId("student-bulk-import-submit")).toBeInTheDocument();
  });
}

beforeEach(() => {
  submitBulkImportMock.mockReset();
  trackEventMock.mockReset();
});

describe("StudentBulkImportClient — 부모 초대 체크박스 mount", () => {
  it("[I1] 행 업로드 후 체크박스가 unchecked 상태로 노출", async () => {
    render(
      <StudentBulkImportClient institutionId={INST} institutionName={INST_NAME} />,
    );
    // 행이 없으면 체크박스 미노출 (DOM clean) — 업로드 후 노출.
    expect(screen.queryByTestId("student-bulk-import-send-invites")).toBeNull();

    await uploadAndWaitForSubmit();

    const checkbox = screen.getByTestId(
      "student-bulk-import-send-invites",
    ) as HTMLInputElement;
    expect(checkbox).toBeInTheDocument();
    expect(checkbox.checked).toBe(false);
    expect(checkbox.type).toBe("checkbox");
  });

  it("[I2] 체크박스 클릭 → checked 토글, 재클릭 → 다시 unchecked", async () => {
    render(<StudentBulkImportClient institutionId={INST} />);
    await uploadAndWaitForSubmit();

    const checkbox = screen.getByTestId(
      "student-bulk-import-send-invites",
    ) as HTMLInputElement;
    expect(checkbox.checked).toBe(false);

    fireEvent.click(checkbox);
    expect(checkbox.checked).toBe(true);

    fireEvent.click(checkbox);
    expect(checkbox.checked).toBe(false);
  });
});

describe("StudentBulkImportClient — Server Action options 전달", () => {
  it("[I3] 체크박스 unchecked → options.sendParentInvites=false 전달 + 결과 row 미표시", async () => {
    submitBulkImportMock.mockResolvedValueOnce({
      status: "ok",
      result: {
        successCount: 2,
        errorCount: 0,
        errors: [],
        insertedStudentIds: ["STU000001", "STU000002"],
      },
      parentInvites: { attempted: 0, sent: 0, skipped: 0 },
    });

    render(
      <StudentBulkImportClient institutionId={INST} institutionName={INST_NAME} />,
    );
    await uploadAndWaitForSubmit();

    // 체크박스 클릭 없이 바로 submit.
    fireEvent.click(screen.getByTestId("student-bulk-import-submit"));

    await waitFor(() => {
      expect(submitBulkImportMock).toHaveBeenCalledTimes(1);
    });

    const callArgs = submitBulkImportMock.mock.calls[0] as [
      unknown[],
      string,
      { sendParentInvites: boolean; institutionName: string },
    ];
    expect(callArgs[1]).toBe(INST);
    expect(callArgs[2]).toEqual({
      sendParentInvites: false,
      institutionName: INST_NAME,
    });

    // 성공 상태 + 결과 row 미표시.
    await waitFor(() => {
      expect(screen.getByTestId("student-bulk-import-success")).toBeInTheDocument();
    });
    expect(
      screen.queryByTestId("student-bulk-import-invite-result"),
    ).toBeNull();
  });

  it("[I4] 체크박스 checked → options.sendParentInvites=true + institutionName 전달", async () => {
    submitBulkImportMock.mockResolvedValueOnce({
      status: "ok",
      result: {
        successCount: 2,
        errorCount: 0,
        errors: [],
        insertedStudentIds: ["STU000001", "STU000002"],
      },
      parentInvites: { attempted: 2, sent: 2, skipped: 0 },
    });

    render(
      <StudentBulkImportClient institutionId={INST} institutionName={INST_NAME} />,
    );
    await uploadAndWaitForSubmit();

    fireEvent.click(screen.getByTestId("student-bulk-import-send-invites"));
    fireEvent.click(screen.getByTestId("student-bulk-import-submit"));

    await waitFor(() => {
      expect(submitBulkImportMock).toHaveBeenCalledTimes(1);
    });

    const callArgs = submitBulkImportMock.mock.calls[0] as [
      unknown[],
      string,
      { sendParentInvites: boolean; institutionName: string },
    ];
    expect(callArgs[2]).toEqual({
      sendParentInvites: true,
      institutionName: INST_NAME,
    });
  });
});

describe("StudentBulkImportClient — 부모 초대 결과 row 표시", () => {
  it("[I5] parentInvites attempted>0 → 발송 성공/보류 row 노출", async () => {
    submitBulkImportMock.mockResolvedValueOnce({
      status: "ok",
      result: {
        successCount: 2,
        errorCount: 0,
        errors: [],
        insertedStudentIds: ["STU000001", "STU000002"],
      },
      parentInvites: { attempted: 2, sent: 1, skipped: 1 },
    });

    render(
      <StudentBulkImportClient institutionId={INST} institutionName={INST_NAME} />,
    );
    await uploadAndWaitForSubmit();

    fireEvent.click(screen.getByTestId("student-bulk-import-send-invites"));
    fireEvent.click(screen.getByTestId("student-bulk-import-submit"));

    await waitFor(() => {
      expect(
        screen.getByTestId("student-bulk-import-invite-result"),
      ).toBeInTheDocument();
    });

    const sentRow = screen.getByTestId("student-bulk-import-invite-sent");
    const skippedRow = screen.getByTestId("student-bulk-import-invite-skipped");
    expect(sentRow.textContent).toContain("1건");
    expect(skippedRow.textContent).toContain("1건");
  });

  it("[I6] parentInvites attempted=0 → 결과 row 미표시 (no-op 보호)", async () => {
    submitBulkImportMock.mockResolvedValueOnce({
      status: "ok",
      result: {
        successCount: 2,
        errorCount: 0,
        errors: [],
        insertedStudentIds: ["STU000001", "STU000002"],
      },
      parentInvites: { attempted: 0, sent: 0, skipped: 0 },
    });

    render(
      <StudentBulkImportClient institutionId={INST} institutionName={INST_NAME} />,
    );
    await uploadAndWaitForSubmit();

    fireEvent.click(screen.getByTestId("student-bulk-import-send-invites"));
    fireEvent.click(screen.getByTestId("student-bulk-import-submit"));

    await waitFor(() => {
      expect(screen.getByTestId("student-bulk-import-success")).toBeInTheDocument();
    });
    expect(
      screen.queryByTestId("student-bulk-import-invite-result"),
    ).toBeNull();
  });

  it("[I9] 응답에 parentInvites 자체가 없음 (legacy) → 결과 row 미표시 (graceful)", async () => {
    submitBulkImportMock.mockResolvedValueOnce({
      status: "ok",
      result: {
        successCount: 2,
        errorCount: 0,
        errors: [],
        insertedStudentIds: ["STU000001", "STU000002"],
      },
      // parentInvites 키 자체 미포함 (legacy / 서버 응답 누락 시나리오).
    });

    render(
      <StudentBulkImportClient institutionId={INST} institutionName={INST_NAME} />,
    );
    await uploadAndWaitForSubmit();

    fireEvent.click(screen.getByTestId("student-bulk-import-send-invites"));
    fireEvent.click(screen.getByTestId("student-bulk-import-submit"));

    await waitFor(() => {
      expect(screen.getByTestId("student-bulk-import-success")).toBeInTheDocument();
    });
    expect(
      screen.queryByTestId("student-bulk-import-invite-result"),
    ).toBeNull();
  });
});

describe("StudentBulkImportClient — institutionName prop default", () => {
  it("[I7] institutionName prop 미전달 → '우리 기관' 기본값으로 호출", async () => {
    submitBulkImportMock.mockResolvedValueOnce({
      status: "ok",
      result: {
        successCount: 2,
        errorCount: 0,
        errors: [],
        insertedStudentIds: ["STU000001", "STU000002"],
      },
      parentInvites: { attempted: 0, sent: 0, skipped: 0 },
    });

    render(<StudentBulkImportClient institutionId={INST} />);
    await uploadAndWaitForSubmit();

    fireEvent.click(screen.getByTestId("student-bulk-import-submit"));

    await waitFor(() => {
      expect(submitBulkImportMock).toHaveBeenCalledTimes(1);
    });

    const callArgs = submitBulkImportMock.mock.calls[0] as [
      unknown[],
      string,
      { sendParentInvites: boolean; institutionName: string },
    ];
    expect(callArgs[2].institutionName).toBe("우리 기관");
  });

  it("[I8] institutionName prop 공백 문자열 → '우리 기관' fallback", async () => {
    submitBulkImportMock.mockResolvedValueOnce({
      status: "ok",
      result: {
        successCount: 2,
        errorCount: 0,
        errors: [],
        insertedStudentIds: ["STU000001", "STU000002"],
      },
      parentInvites: { attempted: 0, sent: 0, skipped: 0 },
    });

    render(
      <StudentBulkImportClient institutionId={INST} institutionName="   " />,
    );
    await uploadAndWaitForSubmit();

    fireEvent.click(screen.getByTestId("student-bulk-import-submit"));

    await waitFor(() => {
      expect(submitBulkImportMock).toHaveBeenCalledTimes(1);
    });

    const callArgs = submitBulkImportMock.mock.calls[0] as [
      unknown[],
      string,
      { sendParentInvites: boolean; institutionName: string },
    ];
    expect(callArgs[2].institutionName).toBe("우리 기관");
  });
});
