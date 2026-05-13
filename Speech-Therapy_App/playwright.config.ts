// TEST-004 — Playwright E2E (5분 진단 + Disclaimer 100%) 설정.
// REQ-FUNC-008~011, TC-S1-008~011.
//
// 첫 cut 범위 (FR-Q-001/002 동작 검증):
// - chromium 데스크톱 + 모바일 viewport
// - Vitest 와 별개 — `npm run test:e2e` 로 실행
// - webServer 옵션으로 `npm run dev` 자동 부팅 + cleanup

import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? "list" : "html",
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:4000",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium-desktop",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "chromium-mobile",
      use: { ...devices["iPhone 13"] },
    },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:4000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
