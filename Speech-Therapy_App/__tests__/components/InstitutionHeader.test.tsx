// FR-Q-010 (REQ-FUNC-047) — InstitutionHeader Server Component 단위 테스트.
//
// 검증 시나리오 (6종):
//   1) 인증 + institutionId 존재 → Institution name + logo 렌더
//   2) 인증 + institutionId null → "Speech-Therapy" fallback
//   3) 무로그인 → "Speech-Therapy" fallback
//   4) logoUri null → 텍스트만 표시 (logo 미노출)
//   5) 접근성 — img 태그에 alt 속성 강제 (alt 가 기관명을 포함)
//   6) CON-04 — Institution.name 에 금칙어 ("진단", "치료") 포함 시 default 폴백 + 표시 텍스트 금칙어 0건
//
// 비고: InstitutionHeader 는 async RSC. React Testing Library + happy-dom 에서
// async 컴포넌트는 `await` 후 결과 element 를 render() 에 넣어 검증한다.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

// Supabase / Prisma mock — 시나리오별 동작 주입.
const getUserMock = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  getSupabaseServerClient: vi.fn(async () => ({
    auth: { getUser: getUserMock },
  })),
}));

const findUniqueMock = vi.fn();
vi.mock("@/lib/db", () => ({
  prisma: {
    user: { findUnique: (...args: unknown[]) => findUniqueMock(...args) },
  },
}));

import { InstitutionHeader, fetchInstitutionForCurrentUser } from "@/components/InstitutionHeader";
import { containsBannedTerms } from "@/lib/text-safety";

async function renderAsync(node: Promise<React.ReactElement>) {
  const resolved = await node;
  return render(resolved);
}

describe("InstitutionHeader — FR-Q-010 기관 헤더 / 로고 커스텀", () => {
  beforeEach(() => {
    getUserMock.mockReset();
    findUniqueMock.mockReset();
  });

  it("시나리오 1: 인증 + institutionId 존재 → Institution name + logo 렌더", async () => {
    await renderAsync(
      InstitutionHeader({
        institution: {
          name: "서울언어발달센터",
          logoUri: "https://example.supabase.co/storage/v1/object/public/institution-logos/seoul.png",
        },
      }),
    );

    expect(screen.getByTestId("institution-name")).toHaveTextContent("서울언어발달센터");
    const logo = screen.getByTestId("institution-logo");
    expect(logo).toBeInTheDocument();
    expect(logo).toHaveAttribute("src", expect.stringContaining("seoul.png"));
  });

  it("시나리오 2: 인증 + institutionId null → 'Speech-Therapy' fallback", async () => {
    // institution = null → fetched=null → default 표시.
    await renderAsync(InstitutionHeader({ institution: null }));

    expect(screen.getByTestId("institution-name")).toHaveTextContent("Speech-Therapy");
    expect(screen.queryByTestId("institution-logo")).not.toBeInTheDocument();
  });

  it("시나리오 3: 무로그인 → 'Speech-Therapy' fallback (fetchInstitutionForCurrentUser 미주입)", async () => {
    getUserMock.mockResolvedValueOnce({ data: { user: null } });

    await renderAsync(InstitutionHeader());

    expect(screen.getByTestId("institution-name")).toHaveTextContent("Speech-Therapy");
    expect(screen.queryByTestId("institution-logo")).not.toBeInTheDocument();
    expect(findUniqueMock).not.toHaveBeenCalled();
  });

  it("시나리오 4: logoUri 없을 때 텍스트만 표시", async () => {
    await renderAsync(
      InstitutionHeader({ institution: { name: "한국발음연구소", logoUri: null } }),
    );

    expect(screen.getByTestId("institution-name")).toHaveTextContent("한국발음연구소");
    expect(screen.queryByTestId("institution-logo")).not.toBeInTheDocument();
  });

  it("시나리오 5: 접근성 — logo 가 있을 때 alt 속성에 기관명 포함", async () => {
    await renderAsync(
      InstitutionHeader({
        institution: { name: "강남발달센터", logoUri: "https://cdn.example.com/logo.svg" },
      }),
    );

    const logo = screen.getByTestId("institution-logo");
    expect(logo).toHaveAttribute("alt");
    const alt = logo.getAttribute("alt") ?? "";
    expect(alt.length).toBeGreaterThan(0);
    expect(alt).toContain("강남발달센터");
  });

  it("시나리오 6: CON-04 — Institution.name 금칙어 (진단/치료) → default 폴백 + 표시 텍스트 금칙어 0건", async () => {
    await renderAsync(
      InstitutionHeader({
        institution: { name: "○○치료센터 진단실", logoUri: null },
      }),
    );

    const name = screen.getByTestId("institution-name");
    // default 로 회피되었으므로 'Speech-Therapy' 표시.
    expect(name).toHaveTextContent("Speech-Therapy");
    // text-safety 정규식 기준 0건.
    expect(containsBannedTerms(name.textContent ?? "")).toBe(false);
    // 화면 어디에도 1차 금칙어 noise 미잔존.
    const headerText = screen.getByTestId("institution-header").textContent ?? "";
    expect(headerText).not.toContain("진단");
    expect(headerText).not.toContain("치료센터");
  });

  it("fetch helper — 인증 + institutionId 존재 시 prisma 단일 쿼리로 Institution 반환", async () => {
    getUserMock.mockResolvedValueOnce({ data: { user: { id: "user-1" } } });
    findUniqueMock.mockResolvedValueOnce({
      institution: { name: "테스트센터", logoUri: "https://cdn/x.png" },
    });

    const result = await fetchInstitutionForCurrentUser();

    expect(result).toEqual({ name: "테스트센터", logoUri: "https://cdn/x.png" });
    expect(findUniqueMock).toHaveBeenCalledTimes(1);
    const call = findUniqueMock.mock.calls[0][0];
    expect(call.where).toEqual({ id: "user-1" });
  });

  it("fetch helper — institutionId null (개인 사용자) → null 반환", async () => {
    getUserMock.mockResolvedValueOnce({ data: { user: { id: "user-2" } } });
    findUniqueMock.mockResolvedValueOnce({ institution: null });

    const result = await fetchInstitutionForCurrentUser();

    expect(result).toBeNull();
  });

  it("fetch helper — DB 오류 시 null fallback (헤더 차단 금지)", async () => {
    getUserMock.mockResolvedValueOnce({ data: { user: { id: "user-3" } } });
    findUniqueMock.mockRejectedValueOnce(new Error("connection refused"));

    const result = await fetchInstitutionForCurrentUser();
    expect(result).toBeNull();
  });
});
