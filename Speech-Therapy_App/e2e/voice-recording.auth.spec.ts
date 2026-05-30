// FR-Q-021 — F11 부모 음성 녹음 E2E (인증 사용자, §22.8 #4 완성).
//
// project "authenticated" (playwright.config) 에서 실행:
//   - storageState(e2e/.auth/parent.json) 로 로그인 상태 재사용 (auth.setup.ts).
//   - launchOptions --use-fake-ui-for-media-stream / --use-fake-device-for-media-stream
//     → getUserMedia 자동 허용 + 가짜 마이크 스트림 (실 마이크 없이 MediaRecorder 동작).
//
// ⚠️ 실행 요건: E2E auth fixture(서비스 롤 + Supabase) — env 미설정 시 setup skip → 본 spec skip.

import { test, expect } from "@playwright/test";

test.describe("FR-Q-021 F11 — 인증 사용자 녹음 플로우 (fake media)", () => {
  test("인증 → /voice-recording 폼 노출 (login redirect 안 됨)", async ({ page }) => {
    await page.goto("/voice-recording");

    await expect(page).toHaveURL(/\/voice-recording/);
    await expect(page.getByRole("heading", { name: "부모 음성 녹음" })).toBeVisible();
    await expect(page.getByRole("button", { name: "녹음 시작" })).toBeVisible();
    // ADR-03 7일 폐기 + ADR-09 동화/자장가 안내.
    await expect(page.getByText(/7일/)).toBeVisible();
    await expect(page.getByText(/동화|자장가/)).toBeVisible();
  });

  test("녹음 시작 → ≥1초 → 종료 → recorded 상태 (durationMs 정상, '너무 짧아요' 아님)", async ({
    page,
  }) => {
    await page.goto("/voice-recording");

    await page.getByRole("button", { name: "녹음 시작" }).click();
    await expect(page.getByRole("button", { name: "녹음 종료" })).toBeVisible();

    // MIN_REQUIRED_MS=1000 가드 통과 — 1.5초 녹음 (closure stale durationMs 회귀 가드).
    await page.waitForTimeout(1500);
    await page.getByRole("button", { name: "녹음 종료" }).click();

    // recorded state — 다시 녹음 + 업로드 노출, 0초 가드("너무 짧아요") 미발생.
    await expect(page.getByRole("button", { name: "다시 녹음" })).toBeVisible();
    await expect(page.getByRole("button", { name: "업로드" }).first()).toBeVisible();
    await expect(page.getByText(/너무 짧아요/)).toHaveCount(0);
  });

  test("CON-04 금칙어 0건 (페이지 전체)", async ({ page }) => {
    await page.goto("/voice-recording");
    const body = await page.locator("body").innerText();
    for (const w of ["치료", "진단", "장애", "환자"]) {
      expect(body, `금칙어 "${w}" 발견됨`).not.toContain(w);
    }
  });
});
