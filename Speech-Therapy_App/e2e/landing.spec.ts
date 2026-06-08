// FR-LANDING — 랜딩 프로토타입 E2E (공개/무인증).
//
// ⚠️ 미적용 단계: 프로토타입 시안 A(/landing-prototype/a)를 대상으로 한다.
// 라이브 `/` 적용 결정 시 LANDING_PATH 를 "/" 로 변경.
//
// 실행: `npm run test:e2e` (localhost:4000 webServer 자동 부팅 또는 PLAYWRIGHT_BASE_URL).

import { test, expect } from "@playwright/test";

const LANDING_PATH = "/landing-prototype/a";

test.describe("랜딩 미리보기", () => {
  test("Hero + 주 CTA + 면책 노트 렌더", async ({ page }) => {
    await page.goto(LANDING_PATH);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("발음");
    await expect(page.getByTestId("hero-cta-primary")).toBeVisible();
    await expect(page.getByTestId("disclaimer")).toBeVisible();
  });

  test("주 CTA 클릭 → /diagnose 이동", async ({ page }) => {
    await page.goto(LANDING_PATH);
    await page.getByTestId("hero-cta-primary").click();
    await expect(page).toHaveURL(/\/diagnose/);
  });

  test("FAQ 아코디언 — 질문 클릭 시 답변 노출", async ({ page }) => {
    await page.goto(LANDING_PATH);
    await page.getByText("이건 의료적 평가인가요?").click();
    // FAQ 답변에 고유한 문구로 특정 — TrustStrip 기둥 제목도 "돕는 보조 도구예요"를 포함해
    // /돕는 보조 도구예요/ 가 2개 매칭(strict mode 위반)이던 회귀 수정(2026-06).
    await expect(page.getByText(/확인하실 수 있도록 돕는 보조 도구예요/)).toBeVisible();
  });
});
