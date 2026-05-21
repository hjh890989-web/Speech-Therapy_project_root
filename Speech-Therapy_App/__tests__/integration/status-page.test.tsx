// MON-004 / REQ-NF-007 — /status Status Page SSR 통합 테스트.
//
// 검증 영역:
//  1. 모든 서비스 정상 → "정상 운영" 배지 + 초록 톤
//  2. DB down → "서비스 중단" 배지 + 빨강 톤 + error 노출 + 503 HTTP fallback
//  3. AI env 누락 → "일부 저하" 배지 + 노랑 톤
//  4. CON-04 의료 금칙어 ("치료", "진단", "장애") 0건
//  5. 접근성 — role="status" + aria-label
//
// 격리: app/api/health/route.ts 는 prisma 를 호출 → @/lib/db 만 mock 하여
// 실제 route handler 의 status 결정 로직을 그대로 검증.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render } from "@testing-library/react";

const queryRawMock = vi.fn();
vi.mock("@/lib/db", () => ({
  prisma: {
    $queryRaw: (...args: unknown[]) => queryRawMock(...args),
  },
}));

// next/link mock — 테스트 환경에서 단순 <a> 로 렌더.
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

import StatusPage from "@/app/(public)/status/page";

// CON-04 의료 금칙어 검사용 — 컨테이너 안에 등장 금지.
const FORBIDDEN_MEDICAL_WORDS = ["치료", "진단", "장애"];

function assertNoMedicalTerms(text: string) {
  for (const word of FORBIDDEN_MEDICAL_WORDS) {
    expect(text).not.toContain(word);
  }
}

describe("/status — MON-004 Status Page UI", () => {
  beforeEach(() => {
    queryRawMock.mockReset();
    vi.unstubAllEnvs();
    vi.stubEnv("GOOGLE_GENERATIVE_AI_API_KEY", "fake-ai-key");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://fake.supabase.co");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("[시나리오 1] 모두 정상 → 정상 운영 배지 + 초록 톤 + healthy 데이터 속성", async () => {
    queryRawMock.mockResolvedValueOnce([{ "?column?": 1 }]);

    const ui = await StatusPage();
    const { container } = render(ui);

    const overall = container.querySelector('[data-testid="overall-status"]');
    expect(overall).not.toBeNull();
    expect(overall?.getAttribute("data-status")).toBe("healthy");
    expect(overall?.getAttribute("data-http-status")).toBe("200");
    expect(overall?.className).toContain("emerald");
    expect(overall?.textContent).toContain("정상 운영");

    // 모든 서비스 카드 up.
    const cards = container.querySelectorAll('[data-testid^="service-card-"]');
    expect(cards).toHaveLength(3);
    cards.forEach((card) => {
      expect(card.getAttribute("data-status")).toBe("up");
    });

    // error 메시지 노출 없음.
    expect(container.querySelector('[data-testid^="service-error-"]')).toBeNull();

    // CON-04 — 의료 금칙어 0건.
    assertNoMedicalTerms(container.textContent ?? "");
  });

  it("[시나리오 2] DB down → 서비스 중단 배지 + 빨강 톤 + DB error 노출 + 503", async () => {
    queryRawMock.mockRejectedValueOnce(new Error("connection refused"));

    const ui = await StatusPage();
    const { container } = render(ui);

    const overall = container.querySelector('[data-testid="overall-status"]');
    expect(overall?.getAttribute("data-status")).toBe("unhealthy");
    expect(overall?.getAttribute("data-http-status")).toBe("503");
    expect(overall?.className).toContain("rose");
    expect(overall?.textContent).toContain("서비스 중단");

    // DB 카드 down + error 메시지 노출.
    const dbCard = container.querySelector('[data-testid="service-card-db"]');
    expect(dbCard?.getAttribute("data-status")).toBe("down");

    const dbError = container.querySelector('[data-testid="service-error-db"]');
    expect(dbError).not.toBeNull();
    expect(dbError?.textContent).toContain("connection refused");

    // 보조 서비스는 정상.
    expect(
      container.querySelector('[data-testid="service-card-ai"]')?.getAttribute("data-status"),
    ).toBe("up");
    expect(
      container.querySelector('[data-testid="service-card-storage"]')?.getAttribute("data-status"),
    ).toBe("up");

    // CON-04 — 의료 금칙어 0건 ("장애" 사용 금지, "중단/이상" 으로 대체).
    assertNoMedicalTerms(container.textContent ?? "");
  });

  it("[시나리오 3] AI env 누락 → 일부 저하 배지 + 노랑 톤 + 200", async () => {
    queryRawMock.mockResolvedValueOnce([{ "?column?": 1 }]);
    vi.stubEnv("GOOGLE_GENERATIVE_AI_API_KEY", "");

    const ui = await StatusPage();
    const { container } = render(ui);

    const overall = container.querySelector('[data-testid="overall-status"]');
    expect(overall?.getAttribute("data-status")).toBe("degraded");
    expect(overall?.getAttribute("data-http-status")).toBe("200");
    expect(overall?.className).toContain("amber");
    expect(overall?.textContent).toContain("일부 저하");

    const aiCard = container.querySelector('[data-testid="service-card-ai"]');
    expect(aiCard?.getAttribute("data-status")).toBe("down");

    const aiError = container.querySelector('[data-testid="service-error-ai"]');
    expect(aiError?.textContent).toContain("GOOGLE_GENERATIVE_AI_API_KEY");

    // DB 정상 — DB 카드 latency 표시.
    expect(container.querySelector('[data-testid="service-latency"]')).not.toBeNull();

    assertNoMedicalTerms(container.textContent ?? "");
  });

  it("[시나리오 4] Storage env 누락 → degraded + storage error 노출", async () => {
    queryRawMock.mockResolvedValueOnce([{ "?column?": 1 }]);
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");

    const ui = await StatusPage();
    const { container } = render(ui);

    const overall = container.querySelector('[data-testid="overall-status"]');
    expect(overall?.getAttribute("data-status")).toBe("degraded");

    const storageCard = container.querySelector('[data-testid="service-card-storage"]');
    expect(storageCard?.getAttribute("data-status")).toBe("down");
    expect(
      container.querySelector('[data-testid="service-error-storage"]')?.textContent,
    ).toContain("NEXT_PUBLIC_SUPABASE_URL");
  });

  it("[시나리오 5] 접근성 — role=status + aria-label + 헤딩 존재", async () => {
    queryRawMock.mockResolvedValueOnce([{ "?column?": 1 }]);

    const ui = await StatusPage();
    const { container } = render(ui);

    // 메인 헤딩.
    const h1 = container.querySelector("h1#status-heading");
    expect(h1?.textContent).toContain("서비스 상태");

    // role=status 인 영역 1개 이상 (overall + 서비스 카드 배지).
    const statusRoles = container.querySelectorAll('[role="status"]');
    expect(statusRoles.length).toBeGreaterThanOrEqual(4); // overall + 3 services

    // aria-label 존재 검증.
    const sections = container.querySelectorAll("section[aria-label], main[aria-labelledby]");
    expect(sections.length).toBeGreaterThanOrEqual(3);
  });

  it("[시나리오 6] 갱신 시각 UTC + 사용자 timezone + uptime 표시", async () => {
    queryRawMock.mockResolvedValueOnce([{ "?column?": 1 }]);

    const ui = await StatusPage();
    const { container } = render(ui);

    const utc = container.querySelector('[data-testid="updated-utc"]');
    expect(utc?.textContent).toMatch(/UTC$/);

    const uptime = container.querySelector('[data-testid="uptime"]');
    expect(uptime?.textContent).toBeTruthy();
  });

  it("[시나리오 7] 푸터 — 이메일 신고 + GitHub Issues 링크 노출", async () => {
    queryRawMock.mockResolvedValueOnce([{ "?column?": 1 }]);

    const ui = await StatusPage();
    const { container } = render(ui);

    const mailto = container.querySelector('a[href^="mailto:"]');
    expect(mailto).not.toBeNull();

    const issuesLink = container.querySelector('a[href*="github.com"][href*="issues"]');
    expect(issuesLink).not.toBeNull();
    expect(issuesLink?.getAttribute("rel")).toContain("noopener");
  });
});
