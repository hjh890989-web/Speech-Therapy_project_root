// E2E 인증 fixture (Playwright setup project).
//
// 전략: 이 앱은 비밀번호 로그인이 없음 (Magic Link signInWithOtp + Google OAuth).
//   → service-role admin 으로 magic link 를 생성하고, 그 action_link 를 브라우저로
//     방문하면 앱의 실제 /auth/callback (exchangeCodeForSession) 흐름이 그대로 돌아
//     @supabase/ssr 세션 쿠키가 set 됨. 그 상태를 storageState 로 저장 → 인증 project 재사용.
//
// ⚠️ 실행 요건 (env): NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (+ 선택 E2E_TEST_EMAIL).
//   미설정 시 graceful skip — 인증 spec 은 storageState 부재로 함께 skip.
//   서비스 롤 키는 secret → CI/로컬 E2E env 에서만 주입 (절대 commit 금지).
//
// 산출물: e2e/.auth/parent.json (세션 쿠키 — .gitignore 처리 필수).

import { test as setup } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import path from "node:path";

const AUTH_FILE = path.join(__dirname, ".auth", "parent.json");
const TEST_EMAIL = process.env.E2E_TEST_EMAIL ?? "e2e-parent@speech-therapy.local";

setup("authenticate parent (service-role magic link)", async ({ page, baseURL }) => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  // env 미설정 → skip (인증 spec 도 storageState 부재로 자동 skip).
  setup.skip(
    !url || !serviceKey,
    "E2E auth fixture 는 NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY 필요 (secret).",
  );

  const admin = createClient(url as string, serviceKey as string, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // 1) 테스트 Auth 유저 보장 — email_confirm=true, TOTP 미등록(→ /auth/callback 의 MFA 우회).
  //    이미 존재하면 createUser 가 에러 → 무시하고 진행 (멱등).
  const { error: createErr } = await admin.auth.admin.createUser({
    email: TEST_EMAIL,
    email_confirm: true,
    user_metadata: { e2e: true },
  });
  if (createErr && !/already|exist|registered/i.test(createErr.message)) {
    throw new Error(`E2E 테스트 유저 생성 실패: ${createErr.message}`);
  }

  // 2) magic link 생성 — redirectTo 를 앱의 /auth/callback 으로.
  const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: TEST_EMAIL,
    options: { redirectTo: `${baseURL ?? "http://localhost:4000"}/auth/callback` },
  });
  if (linkErr || !linkData?.properties?.action_link) {
    throw new Error(`magic link 생성 실패: ${linkErr?.message ?? "no action_link"}`);
  }

  // 3) action_link 방문 → Supabase verify → /auth/callback?code= 교환 → 세션 쿠키 set.
  //    성공 시 returnTo(/rewards) 로 redirect (login 아님).
  await page.goto(linkData.properties.action_link);
  await page.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 20_000 });

  // 4) 세션 쿠키 포함 storageState 저장.
  await page.context().storageState({ path: AUTH_FILE });
});
