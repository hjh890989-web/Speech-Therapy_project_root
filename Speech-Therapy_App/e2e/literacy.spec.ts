// CR-2026-007 — 읽기·말 놀이 허브 + 임상 연습 게임 E2E (공개/무인증).
//
// 검증 범위: **플래그 off 기본 상태**(인증·DB 불필요) — 라우트 도달성 + 게이트(준비 중/빈 상태) +
//   CON-04 톤. 플래그 on 흐름은 서버 env 제어가 필요하여 본 spec 범위 밖(단위 테스트가 로직 커버).
//
// 실행: `npm run test:e2e` (localhost:4000 webServer 자동 부팅 또는 PLAYWRIGHT_BASE_URL).

import { test, expect } from "@playwright/test";

// 신규 임상 연습 게임 — 플래그 off 시 '준비 중' coming-soon testid.
const COMING_SOON = [
  // CR-2026-007 게임 5종(flag-3 회귀망 보강).
  { path: "/literacy/phonological-awareness", testId: "pa-coming-soon" },
  { path: "/literacy/decoding", testId: "decoding-coming-soon" },
  { path: "/literacy/ran", testId: "ran-coming-soon" },
  { path: "/literacy/reading-fluency", testId: "fluency-coming-soon" },
  { path: "/literacy/inference", testId: "inference-coming-soon" },
  // CR-2026-007 후속 + CR-2026-009 게임.
  { path: "/literacy/vocabulary", testId: "vocabulary-coming-soon" },
  { path: "/literacy/nonword-repetition", testId: "nwr-coming-soon" },
  { path: "/literacy/narrative", testId: "narrative-coming-soon" },
  { path: "/literacy/phono-rules", testId: "phono-rules-coming-soon" },
  { path: "/literacy/spelling", testId: "spelling-coming-soon" },
  { path: "/literacy/read-rules", testId: "read-rules-coming-soon" },
  { path: "/literacy/reading-comprehension", testId: "reading-comprehension-coming-soon" },
  { path: "/literacy/inference-reading", testId: "inference-reading-coming-soon" },
  { path: "/literacy/morphology", testId: "morphology-coming-soon" },
];

test.describe("읽기·말 놀이 허브 (플래그 off 기본)", () => {
  test("허브 /literacy — 제목 + 면책 + 빈 상태(전 게임 off) 렌더", async ({ page }) => {
    await page.goto("/literacy");
    await expect(page.getByTestId("literacy-hub")).toBeVisible();
    await expect(page.getByRole("heading", { level: 1 })).toContainText("놀이");
    await expect(page.getByTestId("disclaimer")).toBeVisible();
    // 모든 게임 플래그 off(기본) → 빈 상태 안내. (활성 게임이 있으면 list 가 대신 노출)
    await expect(page.getByTestId("literacy-hub-empty")).toBeVisible();
  });
});

test.describe("임상 연습 게임 — 플래그 off 휴면(준비 중)", () => {
  for (const { path, testId } of COMING_SOON) {
    test(`${path} → '준비 중' 휴면 노출`, async ({ page }) => {
      await page.goto(path);
      await expect(page.getByTestId(testId)).toBeVisible();
      // 휴면 화면에는 게임/평가 UI 가 없어야 함(채점 노출 0).
      await expect(page.getByTestId("literacy-hub-list")).toHaveCount(0);
    });
  }
});

test.describe("플래그 off — 문해력 표면 미노출 (flag-3 회귀망)", () => {
  test("/literacy/start — 전 게임 off 시 빈 안내(놀이 카드 0)", async ({ page }) => {
    await page.goto("/literacy/start");
    await expect(page.getByTestId("literacy-start")).toBeVisible();
    await expect(page.getByTestId("literacy-start-empty")).toBeVisible();
  });

  test("랜딩 / — off 시 읽기·말 놀이 링크(내비/기능카드) 미노출", async ({ page }) => {
    await page.goto("/");
    // literacyLive=off → 내비 '읽기·말 놀이' + 랜딩 기능카드(둘 다 href=/literacy) 노출 0.
    await expect(page.locator('a[href="/literacy"]')).toHaveCount(0);
    // 문해력 FAQ 항목도 off 면 미노출.
    await expect(page.getByText("읽기·말 놀이는 무엇인가요?")).toHaveCount(0);
  });
});
