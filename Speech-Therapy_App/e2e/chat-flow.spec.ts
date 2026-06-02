// TEST-020 — F15 /chat 챗봇 종단간 E2E (FR-Q-022 UI + 안전 표면).
//
// 게이트 구조 (F15_CHAT_ENABLED):
//   - 기본(flag 미설정): /chat = "준비 중" 휴면 → 게이트 OFF describe 실행, ON 은 skip.
//   - F15_CHAT_ENABLED=true 로 실행 시: runner + 자동 부팅 webServer 가 동일 env 를 받으므로
//     server 가 chat 활성 → ON describe 실행, OFF 는 skip.
//     실행 예: `F15_CHAT_ENABLED=true npm run test:e2e -- chat-flow`
//
// 실 LLM 미의존: /api/chat/stream 은 page.route 로 canned text/plain 스트림 fulfill
//   (auth/Gemini 키 없이 UI 스트리밍 + 에러 매핑 검증). submitChatUtterance(fire-and-forget)는 무시.
//
// CON-04: 모든 가시 카피에 "치료/진단/장애" 등 금칙어 0건 검증.

import { test, expect } from "@playwright/test";

const F15_ENABLED = process.env.F15_CHAT_ENABLED === "true";

/// CON-04 핵심 금칙어. "의료적 판단"은 제외 — 전역 MedicalDisclaimerFooter(REQ-NF-028)의
/// "의료적 판단이 필요한 경우 의료기관 진료 권장" 은 비의료기기 고지의 *합법·필수* 문구이며
/// CON-04 위반 아님(canonical 금칙어 = 치료/진단/장애, tasks/07 strict-reading 판정). 의료기기/
/// 의료기관/진료 등 의료-맥락 단어도 고지 목적상 정상. (diagnose-flow.spec 도 동일 제외 필요 — 별도.)
const BANNED = ["치료", "진단", "장애", "환자", "처방"];

async function expectNoBannedWords(bodyText: string) {
  for (const word of BANNED) {
    expect(bodyText, `금칙어 "${word}" 발견됨`).not.toContain(word);
  }
}

test.describe("F15 /chat — 게이트 OFF (기본 휴면)", () => {
  test.skip(F15_ENABLED, "F15_CHAT_ENABLED=true 환경에서는 ON describe 로 대체");

  test("게이트 off → '준비 중' 안내 + 입력 미노출", async ({ page }) => {
    await page.goto("/chat");
    await expect(page.getByTestId("chat-coming-soon")).toBeVisible();
    await expect(page.getByTestId("chat-input")).toHaveCount(0);
  });

  test("준비 중 카피 CON-04 금칙어 0건", async ({ page }) => {
    await page.goto("/chat");
    await expectNoBannedWords(await page.locator("body").innerText());
  });
});

test.describe("F15 /chat — 게이트 ON (F15_CHAT_ENABLED=true)", () => {
  test.skip(!F15_ENABLED, "F15_CHAT_ENABLED=true 일 때만 실행 (runner+server 동일 env)");

  test("disclaimer + 입력/전송 노출", async ({ page }) => {
    await page.goto("/chat");
    await expect(page.getByTestId("disclaimer")).toBeVisible();
    await expect(page.getByTestId("chat-input")).toBeVisible();
    await expect(page.getByTestId("chat-send")).toBeVisible();
  });

  test("메시지 전송 → 사용자 버블 + 스트리밍 assistant 응답", async ({ page }) => {
    const reply = "우와, 신나는 이야기네요! 그다음엔 무슨 일이 있었어요?";
    await page.route("**/api/chat/stream", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "text/plain; charset=utf-8",
        body: reply,
      });
    });

    await page.goto("/chat");
    await page.getByTestId("chat-input").fill("오늘 공원에 갔어요");
    await page.getByTestId("chat-send").click();

    await expect(page.getByTestId("chat-msg-user").last()).toContainText(
      "오늘 공원에 갔어요",
    );
    // 첫 assistant 버블은 인사말(GREETING) — 응답은 .last().
    await expect(page.getByTestId("chat-msg-assistant").last()).toContainText(
      "그다음엔",
    );
  });

  test("대화 후 가시 카피 CON-04 금칙어 0건", async ({ page }) => {
    await page.route("**/api/chat/stream", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "text/plain; charset=utf-8",
        body: "재밌겠다! 더 들려줄래요?",
      });
    });

    await page.goto("/chat");
    await page.getByTestId("chat-input").fill("블록 놀이 했어요");
    await page.getByTestId("chat-send").click();
    await expect(page.getByTestId("chat-msg-assistant").last()).toContainText(
      "더 들려줄래요",
    );
    await expectNoBannedWords(await page.locator("body").innerText());
  });

  test("401 → 로그인 안내 에러 매핑", async ({ page }) => {
    await page.route("**/api/chat/stream", async (route) => {
      await route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({ error: "UNAUTHORIZED" }),
      });
    });

    await page.goto("/chat");
    await page.getByTestId("chat-input").fill("안녕");
    await page.getByTestId("chat-send").click();

    const err = page.getByTestId("chat-error");
    await expect(err).toBeVisible();
    await expect(err).toContainText("로그인");
  });

  test("403 CONSENT_REQUIRED → 동의 안내 에러 매핑", async ({ page }) => {
    await page.route("**/api/chat/stream", async (route) => {
      await route.fulfill({
        status: 403,
        contentType: "application/json",
        body: JSON.stringify({ error: "CONSENT_REQUIRED" }),
      });
    });

    await page.goto("/chat");
    await page.getByTestId("chat-input").fill("안녕");
    await page.getByTestId("chat-send").click();

    const err = page.getByTestId("chat-error");
    await expect(err).toBeVisible();
    await expect(err).toContainText("동의");
  });
});
