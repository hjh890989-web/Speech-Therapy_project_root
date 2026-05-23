// FR-Q-009 / FR-C-005 — /signup/parent Server Component 페이지 테스트.
//
// 격리:
//   - @/lib/auth/parent-invite mock (verifyParentInviteToken)
//   - @/components/ParentSignupForm mock — 단순 placeholder
//
// 시나리오:
//   1. token 부재 → "초대 링크가 필요해요" + no-token testid
//   2. token 유효 → 가입 폼 + email prefill 전달
//   3. token 만료/위조 (verify null) → "초대 링크가 만료되었어요" + invalid-token testid
//   4. CON-04 금칙어 0건 (모든 변형 텍스트)
//   5. R4 — 의료 disclaimer 명시 ("의료 서비스가 아닌")

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";

const verifyMock = vi.fn();
vi.mock("@/lib/auth/parent-invite", () => ({
  verifyParentInviteToken: (...args: unknown[]) => verifyMock(...args),
}));

vi.mock("@/components/ParentSignupForm", () => ({
  ParentSignupForm: ({ token, prefillEmail }: { token: string; prefillEmail: string }) => (
    <div data-testid="signup-form-stub" data-token={token} data-email={prefillEmail}>
      stub-form
    </div>
  ),
}));

import ParentSignupPage from "@/app/signup/parent/page";

const FORBIDDEN_MEDICAL_WORDS = ["치료", "진단", "장애"];

function assertNoMedicalTerms(text: string) {
  for (const word of FORBIDDEN_MEDICAL_WORDS) {
    expect(text).not.toContain(word);
  }
}

beforeEach(() => {
  verifyMock.mockReset();
});

describe("ParentSignupPage — token 부재", () => {
  it("token 누락 → no-token 안내 + verify 호출 안 함", async () => {
    const ui = await ParentSignupPage({
      searchParams: Promise.resolve({}),
    });
    const { getByTestId, container } = render(ui);
    expect(getByTestId("parent-signup-no-token")).toBeInTheDocument();
    expect(verifyMock).not.toHaveBeenCalled();
    assertNoMedicalTerms(container.textContent ?? "");
  });

  it("token 빈 문자열 → no-token 분기", async () => {
    const ui = await ParentSignupPage({
      searchParams: Promise.resolve({ token: "" }),
    });
    const { getByTestId } = render(ui);
    expect(getByTestId("parent-signup-no-token")).toBeInTheDocument();
  });
});

describe("ParentSignupPage — token 유효", () => {
  it("정상 payload → 가입 폼 + prefill email 전달", async () => {
    verifyMock.mockResolvedValue({
      parentEmail: "parent@example.com",
      childId: "child-1",
      institutionId: "inst-1",
      iat: 1_700_000_000,
      exp: 1_700_000_000 + 604_800,
      iss: "speech-therapy",
    });
    const ui = await ParentSignupPage({
      searchParams: Promise.resolve({ token: "valid.jwt.token" }),
    });
    const { getByTestId, container } = render(ui);

    expect(getByTestId("parent-signup-page")).toBeInTheDocument();
    const stub = getByTestId("signup-form-stub");
    expect(stub.getAttribute("data-token")).toBe("valid.jwt.token");
    expect(stub.getAttribute("data-email")).toBe("parent@example.com");

    // R4 — 의료 disclaimer 표시.
    expect(container.textContent).toContain("의료 서비스가 아닌");
    assertNoMedicalTerms(container.textContent ?? "");
  });
});

describe("ParentSignupPage — token 위조/만료", () => {
  it("verify null → invalid-token 안내", async () => {
    verifyMock.mockResolvedValue(null);
    const ui = await ParentSignupPage({
      searchParams: Promise.resolve({ token: "expired.or.tampered" }),
    });
    const { getByTestId, container } = render(ui);
    expect(getByTestId("parent-signup-invalid-token")).toBeInTheDocument();
    expect(container.textContent).toContain("7일");
    assertNoMedicalTerms(container.textContent ?? "");
  });

  it("invalid token 분기에서도 가입 폼 stub 미렌더", async () => {
    verifyMock.mockResolvedValue(null);
    const ui = await ParentSignupPage({
      searchParams: Promise.resolve({ token: "bad" }),
    });
    const { queryByTestId } = render(ui);
    expect(queryByTestId("signup-form-stub")).toBeNull();
  });
});
