// FR-Q-007 (#48) — /admin/centers/pdf/[userId] Server Component + CenterPdfDownloadClient
// 통합 테스트.
//
// 격리:
//   - @/lib/db (user.findUnique) mock
//   - @/lib/supabase/server mock
//   - @/lib/pdf/aggregator (loadCenterReportData) mock
//   - @/lib/pdf/center-report (generateCenterReportPdf) mock — Blob 반환
//   - @/lib/analytics (trackEvent) mock
//   - next/link mock
//
// 검증 시나리오 (≥ 8):
//   1. admin role → 정상 페이지 렌더 + 다운로드 섹션 존재
//   2. principal + 동일 institution → 정상 페이지 렌더
//   3. parent role → 403 (center-pdf-forbidden)
//   4. expert role → 403 (페이지 L2 가드)
//   5. principal + 다른 institution → cross-tenant 차단 (center-pdf-cross-tenant)
//   6. user 미존재 → notfound 안내
//   7. 비로그인 → center-pdf-anonymous + 로그인 링크 제공
//   8. CON-04 — 모든 분기 본문 textContent 금칙어 0건
//   9. Client Component — 다운로드 버튼 클릭 → generateCenterReportPdf 호출 + trackEvent 발송
//  10. Client Component — generateCenterReportPdf reject 시 error UI 표시 + 재시도 버튼

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, fireEvent, waitFor } from "@testing-library/react";

// ============================================================================
// Mocks
// ============================================================================
const findUniqueMock = vi.fn();
vi.mock("@/lib/db", () => ({
  prisma: {
    user: { findUnique: (...args: unknown[]) => findUniqueMock(...args) },
  },
}));

const getUserMock = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  getSupabaseServerClient: async () => ({
    auth: { getUser: (...args: unknown[]) => getUserMock(...args) },
  }),
}));

const loadCenterMock = vi.fn();
vi.mock("@/lib/pdf/aggregator", () => ({
  loadCenterReportData: (...args: unknown[]) => loadCenterMock(...args),
}));

const generatePdfMock = vi.fn();
vi.mock("@/lib/pdf/center-report", async () => {
  const actual = await vi.importActual<typeof import("@/lib/pdf/center-report")>(
    "@/lib/pdf/center-report",
  );
  return {
    ...actual,
    generateCenterReportPdf: (...args: unknown[]) => generatePdfMock(...args),
  };
});

const trackEventMock = vi.fn();
vi.mock("@/lib/analytics", () => ({
  trackEvent: (...args: unknown[]) => trackEventMock(...args),
}));

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...rest
  }: {
    children: React.ReactNode;
    href: string;
    [k: string]: unknown;
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

import CenterPdfPage from "@/app/admin/centers/pdf/[userId]/page";
import { CenterPdfDownloadClient } from "@/components/admin/CenterPdfDownloadClient";
import type { CenterReportInput } from "@/lib/pdf/center-report";

// ============================================================================
// 상수 / helpers
// ============================================================================
const INSTITUTION_A = "11111111-1111-4111-8111-111111111111";
const INSTITUTION_B = "22222222-2222-4222-8222-222222222222";
const TARGET_USER_ID = "33333333-3333-4333-8333-333333333333";
const VIEWER_ADMIN = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const VIEWER_PRINCIPAL_A = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const VIEWER_PRINCIPAL_B = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const VIEWER_PARENT = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const VIEWER_EXPERT = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";

const FORBIDDEN_MEDICAL_WORDS = ["치료", "진단", "장애"];

function assertNoMedicalTerms(text: string) {
  for (const word of FORBIDDEN_MEDICAL_WORDS) {
    expect(text).not.toContain(word);
  }
}

function setAuthUser(id: string) {
  getUserMock.mockResolvedValue({ data: { user: { id } }, error: null });
}
function setAnonymousAuth() {
  getUserMock.mockResolvedValue({ data: { user: null }, error: null });
}
function setViewerRow(role: string | null, institutionId: string | null) {
  findUniqueMock.mockResolvedValueOnce({ role, institutionId });
}

function targetInput(institutionName = "햇님어린이집"): CenterReportInput {
  return {
    childAgeMonths: 48,
    institutionName,
    stats: {
      totalDiagnoseCount: 12,
      articulationAvg: 75,
      linguisticAvg: 70,
      acousticAvg: 72,
      missionCount: 5,
      recentTargetPhonemes: ["ㅅ", "ㄹ"],
    },
    generatedAt: new Date("2026-05-23T11:30:00Z"),
  };
}

function setLoaded(institutionId: string | null) {
  loadCenterMock.mockResolvedValueOnce({
    institutionId,
    input: targetInput(),
  });
}

beforeEach(() => {
  findUniqueMock.mockReset();
  getUserMock.mockReset();
  loadCenterMock.mockReset();
  generatePdfMock.mockReset();
  trackEventMock.mockReset();
});

// ============================================================================
// /admin/centers/pdf/[userId] Server Component
// ============================================================================

describe("/admin/centers/pdf/[userId] — FR-Q-007 Server Component", () => {
  it("[1] admin role → 정상 페이지 렌더 + 다운로드 섹션 존재", async () => {
    setAuthUser(VIEWER_ADMIN);
    setViewerRow("admin", null); // admin 은 institution 미소속도 OK.
    setLoaded(INSTITUTION_A);

    const ui = await CenterPdfPage({
      params: Promise.resolve({ userId: TARGET_USER_ID }),
    });
    const { container } = render(ui);

    expect(container.querySelector("[data-testid='center-pdf-page']")).not.toBeNull();
    expect(container.querySelector("[data-testid='center-pdf-download']")).not.toBeNull();
  });

  it("[2] principal + 동일 institution → 정상 렌더", async () => {
    setAuthUser(VIEWER_PRINCIPAL_A);
    setViewerRow("principal", INSTITUTION_A);
    setLoaded(INSTITUTION_A);

    const ui = await CenterPdfPage({
      params: Promise.resolve({ userId: TARGET_USER_ID }),
    });
    const { container } = render(ui);

    expect(container.querySelector("[data-testid='center-pdf-page']")).not.toBeNull();
    expect(
      container.querySelector("[data-testid='center-pdf-cross-tenant']"),
    ).toBeNull();
  });

  it("[3] parent role → 403 (center-pdf-forbidden)", async () => {
    setAuthUser(VIEWER_PARENT);
    setViewerRow("parent", INSTITUTION_A);

    const ui = await CenterPdfPage({
      params: Promise.resolve({ userId: TARGET_USER_ID }),
    });
    const { container } = render(ui);

    expect(container.querySelector("[data-testid='center-pdf-forbidden']")).not.toBeNull();
    expect(container.querySelector("[data-testid='center-pdf-page']")).toBeNull();
    expect(loadCenterMock).not.toHaveBeenCalled();
  });

  it("[4] expert role → 403 (페이지 L2 가드)", async () => {
    setAuthUser(VIEWER_EXPERT);
    setViewerRow("expert", null);

    const ui = await CenterPdfPage({
      params: Promise.resolve({ userId: TARGET_USER_ID }),
    });
    const { container } = render(ui);

    expect(container.querySelector("[data-testid='center-pdf-forbidden']")).not.toBeNull();
    expect(loadCenterMock).not.toHaveBeenCalled();
  });

  it("[5] principal + 다른 institution → cross-tenant 차단", async () => {
    setAuthUser(VIEWER_PRINCIPAL_B);
    setViewerRow("principal", INSTITUTION_B);
    setLoaded(INSTITUTION_A); // 대상은 institution A.

    const ui = await CenterPdfPage({
      params: Promise.resolve({ userId: TARGET_USER_ID }),
    });
    const { container } = render(ui);

    expect(
      container.querySelector("[data-testid='center-pdf-cross-tenant']"),
    ).not.toBeNull();
    expect(container.querySelector("[data-testid='center-pdf-page']")).toBeNull();
  });

  it("[6] user 미존재 → notfound 안내", async () => {
    setAuthUser(VIEWER_ADMIN);
    setViewerRow("admin", null);
    loadCenterMock.mockResolvedValueOnce(null);

    const ui = await CenterPdfPage({
      params: Promise.resolve({ userId: TARGET_USER_ID }),
    });
    const { container } = render(ui);

    expect(container.querySelector("[data-testid='center-pdf-notfound']")).not.toBeNull();
    expect(container.querySelector("[data-testid='center-pdf-page']")).toBeNull();
  });

  it("[7] 비로그인 → center-pdf-anonymous 안내 + 로그인 링크 next 파라미터 포함", async () => {
    setAnonymousAuth();

    const ui = await CenterPdfPage({
      params: Promise.resolve({ userId: TARGET_USER_ID }),
    });
    const { container } = render(ui);

    const anon = container.querySelector("[data-testid='center-pdf-anonymous']");
    expect(anon).not.toBeNull();
    const link = container.querySelector("a[href*='/login?next=']");
    expect(link).not.toBeNull();
    expect(link?.getAttribute("href")).toContain(
      encodeURIComponent(TARGET_USER_ID),
    );
    expect(findUniqueMock).not.toHaveBeenCalled();
    expect(loadCenterMock).not.toHaveBeenCalled();
  });

  it("[8] CON-04 — 모든 분기 textContent 에 의료 금칙어 0건", async () => {
    // admin 정상
    setAuthUser(VIEWER_ADMIN);
    setViewerRow("admin", null);
    setLoaded(INSTITUTION_A);
    const okC = render(
      await CenterPdfPage({ params: Promise.resolve({ userId: TARGET_USER_ID }) }),
    ).container;
    assertNoMedicalTerms(okC.textContent ?? "");

    // forbidden
    setAuthUser(VIEWER_PARENT);
    setViewerRow("parent", INSTITUTION_A);
    const forbC = render(
      await CenterPdfPage({ params: Promise.resolve({ userId: TARGET_USER_ID }) }),
    ).container;
    assertNoMedicalTerms(forbC.textContent ?? "");

    // cross-tenant
    setAuthUser(VIEWER_PRINCIPAL_B);
    setViewerRow("principal", INSTITUTION_B);
    setLoaded(INSTITUTION_A);
    const xtC = render(
      await CenterPdfPage({ params: Promise.resolve({ userId: TARGET_USER_ID }) }),
    ).container;
    assertNoMedicalTerms(xtC.textContent ?? "");

    // notfound
    setAuthUser(VIEWER_ADMIN);
    setViewerRow("admin", null);
    loadCenterMock.mockResolvedValueOnce(null);
    const nfC = render(
      await CenterPdfPage({ params: Promise.resolve({ userId: TARGET_USER_ID }) }),
    ).container;
    assertNoMedicalTerms(nfC.textContent ?? "");

    // anonymous
    setAnonymousAuth();
    const anonC = render(
      await CenterPdfPage({ params: Promise.resolve({ userId: TARGET_USER_ID }) }),
    ).container;
    assertNoMedicalTerms(anonC.textContent ?? "");
  });
});

// ============================================================================
// CenterPdfDownloadClient — Client Component 단위
// ============================================================================

describe("CenterPdfDownloadClient — FR-Q-007 다운로드 트리거", () => {
  // happy-dom 에서 URL.createObjectURL / revokeObjectURL mock 보강.
  beforeEach(() => {
    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      writable: true,
      value: vi.fn(() => "blob:mock-url"),
    });
    Object.defineProperty(URL, "revokeObjectURL", {
      configurable: true,
      writable: true,
      value: vi.fn(),
    });
  });

  it("[9] 버튼 클릭 → generateCenterReportPdf 호출 + trackEvent 발송 + success UI", async () => {
    const blob = new Blob(["pdf-bytes"], { type: "application/pdf" });
    generatePdfMock.mockResolvedValueOnce({
      blob,
      mode: "ko",
      bytes: blob.size,
      disclaimer: "본 보고서는 발달 보조 자료...",
    });

    const { container, getByTestId } = render(
      <CenterPdfDownloadClient
        input={targetInput()}
        userId={TARGET_USER_ID}
        institutionId={INSTITUTION_A}
      />,
    );

    const btn = getByTestId("center-pdf-download-button");
    fireEvent.click(btn);

    await waitFor(() => {
      expect(generatePdfMock).toHaveBeenCalledTimes(1);
    });
    await waitFor(() => {
      expect(getByTestId("center-pdf-success")).toBeTruthy();
    });

    // trackEvent 발송.
    expect(trackEventMock).toHaveBeenCalledTimes(1);
    expect(trackEventMock.mock.calls[0][0]).toBe("center_pdf_downloaded");
    expect(trackEventMock.mock.calls[0][1]).toMatchObject({
      userId: TARGET_USER_ID,
      institutionId: INSTITUTION_A,
    });

    // phase data-attr 변경.
    const root = container.querySelector("[data-testid='center-pdf-download']");
    expect(root?.getAttribute("data-phase")).toBe("downloaded");
  });

  it("[10] generateCenterReportPdf throw → error UI + 재시도 버튼", async () => {
    generatePdfMock.mockRejectedValueOnce(new Error("boom"));

    const { getByTestId } = render(
      <CenterPdfDownloadClient
        input={targetInput()}
        userId={TARGET_USER_ID}
        institutionId={INSTITUTION_A}
      />,
    );

    fireEvent.click(getByTestId("center-pdf-download-button"));

    await waitFor(() => {
      expect(getByTestId("center-pdf-error")).toBeTruthy();
    });
    // trackEvent 미발송 (다운로드 실패).
    expect(trackEventMock).not.toHaveBeenCalled();

    // 재시도 버튼 클릭 → idle 로 복귀.
    fireEvent.click(getByTestId("center-pdf-retry"));
    await waitFor(() => {
      expect(() => getByTestId("center-pdf-error")).toThrow();
    });
  });

  it("[11] R4 — CenterPdfDownloadClient UI 본문 textContent 에 금칙어 0건", () => {
    const { container } = render(
      <CenterPdfDownloadClient
        input={targetInput()}
        userId={TARGET_USER_ID}
        institutionId={INSTITUTION_A}
      />,
    );
    assertNoMedicalTerms(container.textContent ?? "");
  });
});
