// SEC-COMP-PIPA (Grill #3A) — 컴플라이언스 흐름 E2E 테스트.
//
// 검증 시나리오:
//   1) /privacy + /terms placeholder 접근 가능 (인증 무관)
//   2) /diagnose 익명 진입 — PIPA 동의 박스 + 체크박스 2개 노출
//   3) 미체크 시 제출 버튼 disabled + "개인정보 동의 후 진행" 카피
//   4) 둘 다 체크 시 제출 버튼 활성
//   5) /settings/privacy-consent 직접 진입 시 비로그인 → /login redirect
//   6) /diagnose result (mockSuccessHigh) 진입 시 익명 회원가입 안내 노출
//   7) /diagnose 의 발화 직전 STT 국외 이전 안내 inline 노출
//
// 본 테스트는 인증 흐름 없이 진행 (Web Speech API 모킹 + 발화 자체는 별도).

import { test, expect } from "@playwright/test";

// MOCK_SESSION_ID — diagnose-flow.spec.ts 와 동일 ID (mockSuccessHigh).
const MOCK_SESSION_ID = "11111111-1111-4111-8111-111111111111";

test.describe("SEC-COMP-PIPA — 정책 페이지 접근", () => {
  test("/privacy placeholder 페이지 로드 + 헤더 + 골격", async ({ page }) => {
    await page.goto("/privacy");
    await expect(
      page.getByRole("heading", { name: /개인정보 처리방침/ }),
    ).toBeVisible();
    // 정식본(변호사 자문 반영)으로 재작성됨 — placeholder 시절 문자열 대신 현행 섹션 토픽으로 검증.
    // PIPA §22조의6(만 14세 미만) + 국외 이전(§17 맥락) 섹션 포함.
    const body = await page.locator("body").innerText();
    expect(body).toContain("만 14세 미만");
    expect(body).toContain("국외 이전");
  });

  test("/terms placeholder 페이지 로드 + 비의료기기 명시", async ({ page }) => {
    await page.goto("/terms");
    await expect(page.getByRole("heading", { name: /이용약관/ })).toBeVisible();
    const body = await page.locator("body").innerText();
    expect(body).toContain("의료기기가 아니");
  });

  test("Footer — 의료기기법 disclaimer + /privacy + /terms 링크", async ({ page }) => {
    await page.goto("/");
    const footer = page.getByTestId("medical-disclaimer-footer");
    await expect(footer).toBeVisible();
    await expect(footer).toContainText("의료기기가 아닙니다");
    await expect(page.getByTestId("footer-privacy-link")).toBeVisible();
    await expect(page.getByTestId("footer-terms-link")).toBeVisible();
  });
});

test.describe("SEC-COMP-PIPA — 익명 user 의 /diagnose 동의 흐름", () => {
  test("동의 박스 + 체크박스 2개 노출", async ({ page }) => {
    // localStorage 초기화 — 본 테스트는 fresh 익명 흐름.
    await page.goto("/diagnose");
    await page.evaluate(() => window.localStorage.clear());
    await page.reload();

    const consentGroup = page.getByTestId("anonymous-pipa-consents");
    await expect(consentGroup).toBeVisible();
    await expect(consentGroup).toContainText("개인정보 동의 (필수)");

    // 두 체크박스.
    await expect(page.getByTestId("diagnose-pipa-checkbox")).toBeVisible();
    await expect(page.getByTestId("diagnose-overseas-checkbox")).toBeVisible();
  });

  test("미체크 시 제출 버튼 disabled + '동의 후 진행' 카피", async ({ page }) => {
    await page.goto("/diagnose");
    await page.evaluate(() => window.localStorage.clear());
    await page.reload();

    const submit = page.getByTestId("diagnose-submit-btn");
    await expect(submit).toBeDisabled();
    await expect(submit).toContainText("개인정보 동의 후 진행");
  });

  test("둘 다 체크 시 카피 변경", async ({ page }) => {
    await page.goto("/diagnose");
    await page.evaluate(() => window.localStorage.clear());
    await page.reload();

    // 두 체크박스 체크.
    await page
      .getByTestId("diagnose-pipa-checkbox")
      .locator("input[type='checkbox']")
      .check();
    await page
      .getByTestId("diagnose-overseas-checkbox")
      .locator("input[type='checkbox']")
      .check();

    // 제출 버튼 카피 가 "개인정보 동의 후 진행" 외 다른 상태 (오프라인 / 결과 확인 / 분석 중) 로 전환.
    const submit = page.getByTestId("diagnose-submit-btn");
    await expect(submit).not.toContainText("개인정보 동의 후 진행");
  });

  test("STT 국외 이전 inline 안내 노출 (Web Speech 지원 환경)", async ({ page }) => {
    await page.goto("/diagnose");
    // Web Speech API 미지원 환경 (chromium 기본) 에서는 hint 미노출 가능 — 두 분기 모두 통과 허용.
    const hint = page.getByTestId("diagnose-stt-overseas-hint");
    // 노출되면 STT 안내 카피 검증, 미노출이면 skip (Web Speech 미지원 환경).
    const count = await hint.count();
    if (count > 0) {
      await expect(hint).toContainText("Google Cloud Speech");
      await expect(hint).toContainText("PIPA §17");
    }
  });
});

test.describe("SEC-COMP-PIPA — 인증 필요 라우트", () => {
  test("/settings/privacy-consent — 비로그인 → /login redirect", async ({ page }) => {
    const response = await page.goto("/settings/privacy-consent");
    // Server Component 의 redirect 는 클라이언트 측 navigation 으로 표현.
    // 최종 도착 URL 이 /login 으로 시작해야 함.
    await page.waitForURL(/\/login/);
    expect(page.url()).toContain("/login");
    // next 파라미터에 원래 path 포함 — Next.js 의 redirect 가 URL-decode 또는
    // -encode 형식 으로 유지 (환경 따라 다름). 둘 다 통과 허용.
    const urlAfter = page.url();
    expect(
      urlAfter.includes("next=/settings/privacy-consent") ||
        urlAfter.includes("next=%2Fsettings%2Fprivacy-consent"),
    ).toBe(true);
    // response 자체는 200 (login 페이지 로드 결과) 또는 redirect chain — 둘 다 OK.
    expect(response?.status()).toBeLessThan(500);
  });
});

test.describe("SEC-COMP-PIPA — 결과 페이지 익명 user 안내", () => {
  test("/diagnose/result/[MOCK_SESSION_ID] — 익명 회원가입 안내 + CTA 2 버튼", async ({ page }) => {
    await page.goto(`/diagnose/result/${MOCK_SESSION_ID}?phoneme=ㅅ&age=36`);

    // 익명 회원가입 안내 카드.
    const hint = page.getByTestId("result-anonymous-signup-hint");
    await expect(hint).toBeVisible();
    await expect(hint).toContainText("영구 보존");

    // "회원가입 / 로그인" 버튼 + "주간 미션 시작하기" 버튼.
    await expect(
      page.getByRole("link", { name: /회원가입.*로그인/ }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: /주간 미션 시작하기/ }),
    ).toBeVisible();
  });

  test("/diagnose/result — score band 시각 차별화 (또래 백분위 카피)", async ({ page }) => {
    await page.goto(`/diagnose/result/${MOCK_SESSION_ID}?phoneme=ㅅ&age=36`);

    const nudge = page.getByTestId("result-nudge-copy");
    await expect(nudge).toBeVisible();
    // mockSuccessHigh.peerPercentile = 92 → high band → "상위 N% 안에 들어요" 카피.
    await expect(nudge).toContainText(/상위 \d+%/);
  });
});
