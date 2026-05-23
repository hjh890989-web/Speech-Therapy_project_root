// FR-C-016 (#39) — StudentBulkImportClient 컴포넌트 단위 테스트.
//
// 시나리오 (≥4):
//   C1. 초기 상태 — idle, 파일 input 만 노출, 테이블/액션 미렌더
//   C2. CSV 업로드 → 정상 행 테이블 + 등록 시작 버튼 활성화
//   C3. 오류 행 (잘못된 birthDate) → 빨간 강조 + 등록 시작 disabled
//   C4. 인라인 수정 + 재검증 → 오류 해소 + 등록 시작 활성화
//   C5. 등록 시작 → Server Action mock 호출 + success 메시지 + trackEvent 호출
//   C6. 금칙어 — 렌더링된 DOM 텍스트에 "치료/진단/장애" 미포함
//
// 격리:
//   - submitBulkImport (Server Action) 은 vi.mock 으로 차단 — 실 Prisma/Supabase 호출 0건.
//   - trackEvent 도 mock — Vercel Analytics SDK 미사용 (테스트 결정성).

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

// Server Action mock — fetch/Prisma 의존 차단.
const submitBulkImportMock = vi.fn();
vi.mock("@/app/actions/student-bulk-import", () => ({
  submitBulkImport: (...args: unknown[]) => submitBulkImportMock(...args),
}));

// trackEvent mock — analytics SDK 의존 차단.
const trackEventMock = vi.fn();
vi.mock("@/lib/analytics", () => ({
  trackEvent: (...args: unknown[]) => trackEventMock(...args),
}));

import { StudentBulkImportClient } from "@/components/admin/StudentBulkImportClient";

const INST = "11111111-1111-4111-8111-111111111111";

const VALID_CSV = [
  "학번,이름,생년월일,반,부모이메일",
  "STU000001,김서윤,2022-03-15,햇님반,parent1@example.com",
  "STU000002,이도윤,2021-08-22,달님반,parent2@example.com",
].join("\n");

const CSV_WITH_BAD_DATE = [
  "학번,이름,생년월일,반,부모이메일",
  "STU000001,김서윤,잘못된날짜,햇님반,parent1@example.com",
  "STU000002,이도윤,2021-08-22,달님반,parent2@example.com",
].join("\n");

function makeCsvFile(text: string, name = "students.csv"): File {
  return new File([text], name, { type: "text/csv" });
}

beforeEach(() => {
  submitBulkImportMock.mockReset();
  trackEventMock.mockReset();
});

describe("StudentBulkImportClient — 초기 상태", () => {
  it("[C1] 파일 입력만 노출, 테이블/액션 미렌더", () => {
    render(<StudentBulkImportClient institutionId={INST} />);
    expect(screen.getByTestId("student-bulk-import-file")).toBeInTheDocument();
    expect(screen.queryByTestId("student-bulk-import-table")).toBeNull();
    expect(screen.queryByTestId("student-bulk-import-submit")).toBeNull();
    const root = screen.getByTestId("student-bulk-import-client");
    expect(root.getAttribute("data-phase")).toBe("idle");
  });
});

describe("StudentBulkImportClient — 정상 CSV 업로드", () => {
  it("[C2] 정상 행 테이블 + 등록 시작 버튼 활성", async () => {
    render(<StudentBulkImportClient institutionId={INST} />);
    const fileInput = screen.getByTestId("student-bulk-import-file") as HTMLInputElement;
    fireEvent.change(fileInput, { target: { files: [makeCsvFile(VALID_CSV)] } });

    await waitFor(() => {
      expect(screen.getByTestId("student-bulk-import-table")).toBeInTheDocument();
    });

    expect(screen.getByTestId("student-bulk-row-0")).toBeInTheDocument();
    expect(screen.getByTestId("student-bulk-row-1")).toBeInTheDocument();
    expect(
      (screen.getByTestId("student-bulk-row-0-studentId") as HTMLInputElement).value,
    ).toBe("STU000001");

    const submitBtn = screen.getByTestId("student-bulk-import-submit") as HTMLButtonElement;
    expect(submitBtn.disabled).toBe(false);
  });
});

describe("StudentBulkImportClient — 오류 행 강조", () => {
  it("[C3] 잘못된 birthDate → 행 빨간 강조 + 등록 시작 disabled", async () => {
    render(<StudentBulkImportClient institutionId={INST} />);
    fireEvent.change(screen.getByTestId("student-bulk-import-file"), {
      target: { files: [makeCsvFile(CSV_WITH_BAD_DATE)] },
    });

    await waitFor(() => {
      expect(screen.getByTestId("student-bulk-import-table")).toBeInTheDocument();
    });

    const row0 = screen.getByTestId("student-bulk-row-0");
    expect(row0.getAttribute("data-row-error")).toBe("true");
    expect(screen.getByTestId("student-bulk-row-0-error").textContent).toContain("생년월일");

    const submitBtn = screen.getByTestId("student-bulk-import-submit") as HTMLButtonElement;
    expect(submitBtn.disabled).toBe(true);
  });
});

describe("StudentBulkImportClient — 인라인 수정 + 재검증", () => {
  it("[C4] 잘못된 birthDate 수정 + 재검증 → 오류 해소 + 등록 시작 활성", async () => {
    render(<StudentBulkImportClient institutionId={INST} />);
    fireEvent.change(screen.getByTestId("student-bulk-import-file"), {
      target: { files: [makeCsvFile(CSV_WITH_BAD_DATE)] },
    });

    await waitFor(() => {
      expect(screen.getByTestId("student-bulk-row-0")).toBeInTheDocument();
    });

    // 인라인 수정.
    const birthInput = screen.getByTestId("student-bulk-row-0-birthDate");
    fireEvent.change(birthInput, { target: { value: "2022-03-15" } });

    // 재검증 클릭.
    fireEvent.click(screen.getByTestId("student-bulk-import-revalidate"));

    await waitFor(() => {
      const row0 = screen.getByTestId("student-bulk-row-0");
      expect(row0.getAttribute("data-row-error")).toBe("false");
    });
    expect(screen.getByTestId("student-bulk-row-0-error").textContent).toBe("");
    const submitBtn = screen.getByTestId("student-bulk-import-submit") as HTMLButtonElement;
    expect(submitBtn.disabled).toBe(false);
  });
});

describe("StudentBulkImportClient — 등록 시작 (Server Action)", () => {
  it("[C5] 등록 시작 → Server Action 호출 + success + trackEvent 발송", async () => {
    submitBulkImportMock.mockResolvedValueOnce({
      status: "ok",
      result: {
        successCount: 2,
        errorCount: 0,
        errors: [],
        insertedStudentIds: ["STU000001", "STU000002"],
      },
    });

    render(<StudentBulkImportClient institutionId={INST} />);
    fireEvent.change(screen.getByTestId("student-bulk-import-file"), {
      target: { files: [makeCsvFile(VALID_CSV)] },
    });

    await waitFor(() => {
      expect(screen.getByTestId("student-bulk-import-submit")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("student-bulk-import-submit"));

    await waitFor(() => {
      expect(submitBulkImportMock).toHaveBeenCalledTimes(1);
    });
    const [rowsArg, idArg] = submitBulkImportMock.mock.calls[0] as [unknown[], string];
    expect(idArg).toBe(INST);
    expect(rowsArg).toHaveLength(2);

    await waitFor(() => {
      expect(screen.getByTestId("student-bulk-import-success")).toBeInTheDocument();
    });

    expect(trackEventMock).toHaveBeenCalledWith("student_bulk_import_submitted", {
      totalRows: 2,
      successCount: 2,
      errorCount: 0,
    });
  });

  it("[C5b] Server Action forbidden 응답 → error 메시지 노출", async () => {
    submitBulkImportMock.mockResolvedValueOnce({
      status: "forbidden",
      message: "원장 또는 관리자만 사용할 수 있어요.",
    });

    render(<StudentBulkImportClient institutionId={INST} />);
    fireEvent.change(screen.getByTestId("student-bulk-import-file"), {
      target: { files: [makeCsvFile(VALID_CSV)] },
    });
    await waitFor(() => {
      expect(screen.getByTestId("student-bulk-import-submit")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByTestId("student-bulk-import-submit"));

    await waitFor(() => {
      expect(screen.getByTestId("student-bulk-import-error")).toBeInTheDocument();
    });
    expect(screen.getByTestId("student-bulk-import-error").textContent).toContain("원장");
    expect(trackEventMock).not.toHaveBeenCalled();
  });
});

describe("StudentBulkImportClient — 금칙어 (CON-04)", () => {
  it("[C6] 렌더링된 DOM 텍스트에 '치료' / '진단' / '장애' 미포함", async () => {
    submitBulkImportMock.mockResolvedValueOnce({
      status: "ok",
      result: {
        successCount: 2,
        errorCount: 0,
        errors: [],
        insertedStudentIds: ["STU000001", "STU000002"],
      },
    });
    const { container } = render(<StudentBulkImportClient institutionId={INST} />);
    fireEvent.change(screen.getByTestId("student-bulk-import-file"), {
      target: { files: [makeCsvFile(CSV_WITH_BAD_DATE)] },
    });
    await waitFor(() => {
      expect(screen.getByTestId("student-bulk-import-table")).toBeInTheDocument();
    });

    const text = container.textContent ?? "";
    for (const forbidden of ["치료", "진단", "장애"]) {
      expect(text).not.toContain(forbidden);
    }
  });
});
