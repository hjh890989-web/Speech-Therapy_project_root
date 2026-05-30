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

// 인증 fixture 산출물 (e2e/auth.setup.ts 가 저장). 세션 쿠키 — .gitignore 처리.
const AUTH_STATE = "e2e/.auth/parent.json";
// 인증 사용자용 미디어 권한 자동 허용 + 가짜 마이크 스트림 (F11 녹음 E2E).
const FAKE_MEDIA_ARGS = [
  "--use-fake-ui-for-media-stream",
  "--use-fake-device-for-media-stream",
];
// 인증 E2E 는 service-role + Supabase env 필요. 미설정 시 setup/authenticated project
// 자체를 제외 → 공개 spec 만 실행 (storageState 부재로 인한 에러 회피).
const e2eAuthEnabled = Boolean(
  process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.NEXT_PUBLIC_SUPABASE_URL,
);

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
    // 인증 fixture 준비 — service-role magic link → storageState (auth.setup.ts).
    // env 있을 때만 포함.
    ...(e2eAuthEnabled
      ? [{ name: "setup", testMatch: /auth\.setup\.ts/ }]
      : []),
    {
      name: "chromium-desktop",
      // 공개(무인증) spec 만 — setup / 인증 spec 제외.
      testIgnore: [/auth\.setup\.ts/, /\.auth\.spec\.ts$/],
      use: { ...devices["Desktop Chrome"] },
    },
    {
      // 2026-05-27 sub-session: iPhone 13 (webkit 엔진) → Pixel 5 (chromium 엔진).
      // webkit 미설치 환경 (`npx playwright install chromium` 만) 에서도 모바일 viewport
      // 테스트 가능. 모바일 사용자 경험 검증의 본질은 viewport / touch / breakpoint 이므로
      // 엔진 차이는 무시 가능 (별도 사용자 측 webkit 검증 필요 시 install).
      name: "chromium-mobile",
      testIgnore: [/auth\.setup\.ts/, /\.auth\.spec\.ts$/],
      use: { ...devices["Pixel 5"] },
    },
    // 인증 사용자 spec (*.auth.spec.ts) — storageState 재사용 + fake media stream.
    // setup 의존 → 인증 fixture 가 storageState 를 먼저 생성. env 있을 때만 포함.
    ...(e2eAuthEnabled
      ? [
          {
            name: "authenticated",
            testMatch: /\.auth\.spec\.ts$/,
            dependencies: ["setup"],
            use: {
              ...devices["Desktop Chrome"],
              storageState: AUTH_STATE,
              launchOptions: { args: FAKE_MEDIA_ARGS },
            },
          },
        ]
      : []),
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
