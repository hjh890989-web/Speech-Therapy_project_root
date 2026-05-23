// FR-C-018 (#41) — /consent/[token] Server Component 렌더 단위 테스트.
//
// 시나리오:
//   1. token 미존재 → not-found 안내 페이지
//   2. status='expired' → expired 안내 페이지
//   3. status='pending' + sentAt + 7d < now → expired 안내 (자연 만료)
//   4. status='pending' + 미만료 → 서명 폼 + ConsentSignForm props 전달
//   5. status='signed' → "이미 서명" 안내
//   6. CON-04 — 모든 분기 페이지 카피에 금칙어 0건

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import { hasBannedTerm } from "@/lib/forbidden-words";

const findConsentByTokenMock = vi.fn();
vi.mock("@/lib/consent/repo", () => ({
  findConsentByToken: (...args: unknown[]) => findConsentByTokenMock(...args),
  CONSENT_EXPIRE_DAYS: 7,
}));

// ConsentSignForm 은 Client Component — useTransition / Server Action 의존성 회피.
const signFormPropsCapture = vi.fn();
vi.mock("@/components/consent/ConsentSignForm", () => ({
  ConsentSignForm: (props: {
    token: string;
    childName: string;
    consentTypeLabel: string;
    parentName: string;
  }) => {
    signFormPropsCapture(props);
    return (
      <div
        data-testid="consent-sign-form-mock"
        data-token={props.token}
        data-child={props.childName}
        data-type={props.consentTypeLabel}
        data-parent={props.parentName}
      >
        consent-form-mock
      </div>
    );
  },
}));

import ConsentSignPage from "@/app/consent/[token]/page";

beforeEach(() => {
  findConsentByTokenMock.mockReset();
  signFormPropsCapture.mockReset();
});

async function renderPage(token: string) {
  const ui = await ConsentSignPage({ params: Promise.resolve({ token }) });
  return render(ui as React.ReactElement);
}

describe("/consent/[token] 페이지 렌더", () => {
  it("token 미존재 → not-found 안내", async () => {
    findConsentByTokenMock.mockResolvedValue(null);
    const { getByTestId, container } = await renderPage("missing-token");
    expect(getByTestId("consent-page-not-found")).toBeInTheDocument();
    expect(container.textContent).toContain("동의서를 찾을 수 없습니다");
    expect(signFormPropsCapture).not.toHaveBeenCalled();
  });

  it("status='expired' → expired 안내 페이지", async () => {
    findConsentByTokenMock.mockResolvedValue({
      id: "r1",
      token: "tok",
      status: "expired",
      parentName: "p",
      parentEmail: "p@x.com",
      childNickname: "지우",
      consentType: "data_usage",
      sentAt: new Date("2026-05-10T00:00:00Z"),
    });
    const { getByTestId, container } = await renderPage("tok");
    expect(getByTestId("consent-page-expired")).toBeInTheDocument();
    expect(container.textContent).toContain("만료");
  });

  it("status='pending' but sentAt + 7d < now → expired (자연 만료)", async () => {
    findConsentByTokenMock.mockResolvedValue({
      id: "r1",
      token: "tok",
      status: "pending",
      parentName: "p",
      parentEmail: "p@x.com",
      childNickname: "지우",
      consentType: "data_usage",
      sentAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
    });
    const { getByTestId } = await renderPage("tok");
    expect(getByTestId("consent-page-expired")).toBeInTheDocument();
    expect(signFormPropsCapture).not.toHaveBeenCalled();
  });

  it("status='pending' + 미만료 → ConsentSignForm 임베드 + props 정확", async () => {
    findConsentByTokenMock.mockResolvedValue({
      id: "r1",
      token: "tok",
      status: "pending",
      parentName: "민지",
      parentEmail: "p@x.com",
      childNickname: "지우",
      consentType: "data_usage",
      sentAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 어제 발송
    });
    const { getByTestId } = await renderPage("tok");
    expect(getByTestId("consent-page-form")).toBeInTheDocument();
    expect(getByTestId("consent-sign-form-mock")).toBeInTheDocument();
    expect(signFormPropsCapture).toHaveBeenCalledWith({
      token: "tok",
      // 이메일/UI 본문은 부모용 컨텍스트 — R4 정책상 자녀 별명을 childName prop 으로 전달.
      childName: "지우",
      consentTypeLabel: "데이터 활용",
      parentName: "민지",
    });
  });

  it("status='signed' → '이미 서명' 안내", async () => {
    findConsentByTokenMock.mockResolvedValue({
      id: "r1",
      token: "tok",
      status: "signed",
      parentName: "p",
      parentEmail: "p@x.com",
      childNickname: "지우",
      consentType: "data_usage",
      sentAt: new Date(),
      signedAt: new Date(),
    });
    const { getByTestId, container } = await renderPage("tok");
    expect(getByTestId("consent-page-signed")).toBeInTheDocument();
    expect(container.textContent).toContain("이미 서명");
  });

  it("CON-04 — 모든 분기 페이지 텍스트에 금칙어 0건", async () => {
    const variants = [
      { name: "not_found", row: null },
      {
        name: "expired",
        row: {
          id: "r1",
          token: "tok",
          status: "expired",
          parentName: "p",
          parentEmail: "p@x.com",
          childNickname: "지우",
          consentType: "data_usage",
          sentAt: new Date("2026-05-10T00:00:00Z"),
        },
      },
      {
        name: "signed",
        row: {
          id: "r1",
          token: "tok",
          status: "signed",
          parentName: "p",
          parentEmail: "p@x.com",
          childNickname: "지우",
          consentType: "data_usage",
          sentAt: new Date(),
          signedAt: new Date(),
        },
      },
    ];
    for (const v of variants) {
      findConsentByTokenMock.mockReset();
      findConsentByTokenMock.mockResolvedValue(v.row);
      const { container } = await renderPage("tok");
      expect(hasBannedTerm(container.textContent ?? "")).toBe(false);
    }
  });
});
