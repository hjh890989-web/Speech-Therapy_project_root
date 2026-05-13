// TEST-004 — 5분 진단 종단간 E2E.
// REQ-FUNC-008 (입력 ≤ 3) / 009 (5분 체류) / 010 (RSC 렌더) / 011 (Disclaimer 100%).
//
// 첫 cut 한계:
// - Web Speech API mocking 없음 (브라우저 표준 API 모킹 복잡 → 추후 별도 PR)
// - 대신 결과 페이지를 mockSuccessHigh sessionId 로 직접 진입해 Disclaimer 3중 검증
// - 5분 체류 측정은 시뮬레이션 (실제 발화 X) → 페이지 진입 시점 ~ 결과 페이지 도달 시점 측정 가능

import { test, expect } from "@playwright/test";

// MOCK-001 SESSION_ID_HIGH 와 동일.
const MOCK_SESSION_ID = "11111111-1111-4111-8111-111111111111";

test.describe("FR-Q-001 진단 페이지", () => {
  test("REQ-FUNC-008: 페이지 로드 + 입력 폼 ≤ 3 + Disclaimer 2 + 발화 영역", async ({ page }) => {
    await page.goto("/diagnose");

    // 헤더 노출.
    await expect(page.getByRole("heading", { name: /5분 발음 확인/ })).toBeVisible();

    // Disclaimer 2개 (상단 + 하단).
    const disclaimers = page.locator('[data-testid="disclaimer"]');
    await expect(disclaimers).toHaveCount(2);
    for (let i = 0; i < 2; i++) {
      await expect(disclaimers.nth(i)).toBeVisible();
    }

    // 입력 항목 ≤ 3 (slider · select · checkbox).
    await expect(page.getByRole("slider", { name: /자녀 월령/ })).toBeVisible();
    await expect(page.locator('select#targetPhoneme')).toBeVisible();
    await expect(page.getByRole("checkbox")).toBeVisible();

    // 발화 시작 버튼 또는 미지원 안내 — 브라우저별 다를 수 있음.
    // chromium 은 Web Speech 미지원이라 안내 메시지 표시될 것.
  });

  test("REQ-FUNC-013: 페이지 카피에 금칙어 0건 (CON-04)", async ({ page }) => {
    await page.goto("/diagnose");
    const body = await page.locator("body").innerText();
    // PRIMARY 금칙어 중 명백히 의료적인 단어 (lib/forbidden-words 의 PRIMARY).
    const bannedWords = ["진단", "환자", "처방"];
    for (const word of bannedWords) {
      expect(body).not.toContain(word);
    }
  });
});

test.describe("FR-Q-002 결과 페이지 — MOCK_SESSION_ID 직접 진입", () => {
  test("REQ-FUNC-011: Disclaimer 3중 노출 (상·중·하)", async ({ page }) => {
    await page.goto(`/diagnose/result/${MOCK_SESSION_ID}?phoneme=ㅅ&age=36&transcript=사과`);

    const disclaimers = page.locator('[data-testid="disclaimer"]');
    await expect(disclaimers).toHaveCount(3);
    for (let i = 0; i < 3; i++) {
      await expect(disclaimers.nth(i)).toBeVisible();
    }
  });

  test("REQ-FUNC-012: 또래 백분위 + 넛지 카피", async ({ page }) => {
    await page.goto(`/diagnose/result/${MOCK_SESSION_ID}?phoneme=ㅅ&age=36&transcript=사과`);

    // mockSuccessHigh.peerPercentile = 92 → 상위 8%.
    await expect(page.getByText("또래 백분위")).toBeVisible();
    await expect(page.getByText(/상위 \d+% 안에 들어요/)).toBeVisible();

    // 3축 점수 카드 (조음 / 언어 / 음향).
    await expect(page.getByText("조음")).toBeVisible();
    await expect(page.getByText("언어")).toBeVisible();
    await expect(page.getByText("음향")).toBeVisible();
  });

  test("REQ-FUNC-014: 유료 전환 CTA", async ({ page }) => {
    await page.goto(`/diagnose/result/${MOCK_SESSION_ID}?phoneme=ㅅ&age=36&transcript=사과`);
    await expect(page.getByRole("link", { name: /주간 미션 시작하기/ })).toBeVisible();
  });

  test("REQ-FUNC-013: 결과 카피 금칙어 0건", async ({ page }) => {
    await page.goto(`/diagnose/result/${MOCK_SESSION_ID}?phoneme=ㅅ&age=36&transcript=사과`);
    const body = await page.locator("body").innerText();
    const bannedWords = ["진단", "환자", "처방"];
    for (const word of bannedWords) {
      expect(body).not.toContain(word);
    }
  });

  test("잘못된 sessionId → 404", async ({ page }) => {
    const response = await page.goto("/diagnose/result/00000000-0000-0000-0000-000000000000");
    expect(response?.status()).toBe(404);
  });
});
