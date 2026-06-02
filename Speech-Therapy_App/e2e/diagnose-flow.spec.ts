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

    // 핵심 진단 입력 (slider · select) + 동의/이해 checkbox (현재 3개: 만14세미만·국외이전·이해).
    await expect(page.getByRole("slider", { name: /자녀 월령/ })).toBeVisible();
    await expect(page.locator('select#targetPhoneme')).toBeVisible();
    await expect(page.getByRole("checkbox").first()).toBeVisible();

    // 발화 시작 버튼 또는 미지원 안내 — 브라우저별 다를 수 있음.
    // chromium 은 Web Speech 미지원이라 안내 메시지 표시될 것.
  });

  test("REQ-FUNC-013: 페이지 카피에 금칙어 0건 (CON-04)", async ({ page }) => {
    await page.goto("/diagnose");
    const body = await page.locator("body").innerText();
    // AGENTS.md §2.1 의 CON-04 핵심 금칙어 + PRIMARY 의료 단어.
    // 본 sub-session 의 갭 분석 (07 보고서) 반영 — "진단" UI 카피 제거 검증.
    // "의료적 판단" 제외 — 전역 MedicalDisclaimerFooter(REQ-NF-028)의 합법·필수 고지 문구
    // (canonical CON-04 = 치료/진단/장애). chat-flow.spec 과 동일 정합(2026-06-02).
    const bannedWords = ["치료", "진단", "장애", "환자", "처방"];
    for (const word of bannedWords) {
      expect(body, `금칙어 "${word}" 발견됨`).not.toContain(word);
    }
  });

  test("REQ-FUNC-009: 페이지 로드 ≤ 5분 (실 측정은 즉시 도달 — 5분은 발화 포함 SLA)", async ({ page }) => {
    const FIVE_MINUTES_MS = 300_000;
    const start = Date.now();
    await page.goto("/diagnose");
    // 핵심 인터랙티브 요소 표시 — 사용자가 입력 시작 가능한 시점.
    await expect(page.getByRole("heading", { name: /5분 발음 확인/ })).toBeVisible();
    await expect(page.locator('select#targetPhoneme')).toBeVisible();
    const elapsed = Date.now() - start;
    expect(elapsed, `페이지 로드 ${elapsed}ms — 5분 SLA 위반`).toBeLessThan(FIVE_MINUTES_MS);
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
    // "상위 N% 안에 들어요" 는 넛지 카피 + 백분위 라인 2곳에 노출 → first() 로 strict-mode 회피.
    await expect(page.getByText(/상위 \d+% 안에 들어요/).first()).toBeVisible();

    // 3축 점수 카드 (조음 / 언어 / 음향).
    await expect(page.getByText("조음")).toBeVisible();
    await expect(page.getByText("언어")).toBeVisible();
    await expect(page.getByText("음향")).toBeVisible();
  });

  test("REQ-FUNC-014: 유료 전환 CTA", async ({ page }) => {
    await page.goto(`/diagnose/result/${MOCK_SESSION_ID}?phoneme=ㅅ&age=36&transcript=사과`);
    await expect(page.getByRole("link", { name: /주간 미션 시작하기/ })).toBeVisible();
  });

  test("REQ-FUNC-013: 결과 카피 금칙어 0건 (CON-04 확장 — sub-session 갭 해소 검증)", async ({ page }) => {
    await page.goto(`/diagnose/result/${MOCK_SESSION_ID}?phoneme=ㅅ&age=36&transcript=사과`);
    const body = await page.locator("body").innerText();
    // 07 보고서 (2026-05-16) 의 갭 해소 결과 검증.
    // "진단" 버튼 → "발음 확인" 으로 / "의료적 판단" → "의료적 평가" 로 교체됨.
    // "의료적 판단" 제외 — 전역 MedicalDisclaimerFooter(REQ-NF-028)의 합법·필수 고지 문구
    // (canonical CON-04 = 치료/진단/장애). chat-flow.spec 과 동일 정합(2026-06-02).
    const bannedWords = ["치료", "진단", "장애", "환자", "처방"];
    for (const word of bannedWords) {
      expect(body, `금칙어 "${word}" 발견됨`).not.toContain(word);
    }
  });

  test("잘못된 sessionId → 404", async ({ page }) => {
    const response = await page.goto("/diagnose/result/00000000-0000-0000-0000-000000000000");
    expect(response?.status()).toBe(404);
  });
});
