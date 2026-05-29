// FR-Q-021 — F11 부모 음성 녹음 E2E (§22.8 #4).
//
// 범위 (현 E2E 스위트의 무-인증 패턴 정합 — consent-flow.spec 의 /settings/privacy-consent
// 가드 테스트와 동일):
//   - /voice-recording 는 인증 필수 (RBAC + PIPA 가드) → 비로그인 시 /login redirect.
//
// ⚠️ 녹음 플로우 자체(MediaRecorder + --use-fake-ui-for-media-stream)는 인증된 세션이
//    필요하나, 본 E2E 스위트엔 Supabase 인증 fixture 가 없음. → 녹음 UI E2E 는 follow-up
//    (auth storageState fixture 구축 후). VoiceRecordingForm 의 녹음/가드 동작은
//    __tests__/components/voice-clone/VoiceRecordingForm.test.tsx (10건, fake MediaRecorder)
//    로 단위 커버됨.

import { test, expect } from "@playwright/test";

test.describe("FR-Q-021 F11 — /voice-recording 인증 가드", () => {
  test("비로그인 → /login?next=%2Fvoice-recording redirect", async ({ page }) => {
    const response = await page.goto("/voice-recording");

    // Server Component redirect("/login?next=%2Fvoice-recording") → 최종 URL /login.
    await page.waitForURL(/\/login/);
    expect(page.url()).toContain("/login");

    // next 파라미터 — encode/decode 형식 환경차 허용 (consent-flow 패턴 동일).
    const urlAfter = page.url();
    expect(
      urlAfter.includes("next=/voice-recording") ||
        urlAfter.includes("next=%2Fvoice-recording"),
    ).toBe(true);

    // redirect chain 결과는 5xx 아님 (login 페이지 정상 로드).
    expect(response?.status() ?? 200).toBeLessThan(500);
  });

  test("로그인 페이지 정상 렌더 (가드 도착지)", async ({ page }) => {
    await page.goto("/login?next=%2Fvoice-recording");
    // 로그인 진입 수단 노출 (Magic Link / Google OAuth 중 최소 하나).
    const body = await page.locator("body").innerText();
    expect(body).toMatch(/로그인|Google|이메일|Magic/);
  });
});
