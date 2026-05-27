// TEST-004 — Playwright E2E (5분 진단 + Disclaimer 100%) 설정.
// REQ-FUNC-008~011, TC-S1-008~011.
//
// 첫 cut 범위 (FR-Q-001/002 동작 검증):
// - chromium 데스크톱 + 모바일 viewport
// - Vitest 와 별개 — `npm run test:e2e` 로 실행
//
// baseURL 분기 (2026-05-27 sub-session):
// - PLAYWRIGHT_BASE_URL 설정 시: 해당 URL 직접 테스트 (예: Vercel prod). webServer 부팅 skip.
//   → 본 PC 의 E: drive symlink 이슈로 `next dev` 부팅 실패 회피.
// - 미설정 시: localhost:4000 + `npm run dev` webServer 자동 부팅.

import { defineConfig, devices } from "@playwright/test";

const usingExternalBaseUrl = Boolean(process.env.PLAYWRIGHT_BASE_URL);

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
  // PLAYWRIGHT_BASE_URL 미설정 시만 webServer 자동 부팅. prod 외부 URL 테스트 시 skip.
  webServer: usingExternalBaseUrl
    ? undefined
    : {
        command: "npm run dev",
        url: "http://localhost:4000",
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});
