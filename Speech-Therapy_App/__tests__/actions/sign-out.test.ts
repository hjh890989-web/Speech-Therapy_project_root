// API-015 / API-010 §1 — signOut Server Action 단위 테스트.
//
// 격리:
//   - @/lib/supabase/server mock (auth.signOut)
//   - next/cache (revalidatePath) 는 __tests__/setup.ts 전역 mock
//   - next/navigation (redirect) mock — Next.js 의 redirect 는 control-flow 로 throw 하므로
//     sentinel 에러를 던지도록 mock (실제 런타임 NEXT_REDIRECT 모방).
//
// 시나리오 (총 4건):
//   1. 정상 → auth.signOut + revalidatePath("/", "layout") + redirect("/") 순서대로 호출
//   2. redirect 목적지 정확히 "/" (revalidate 는 layout 스코프)
//   3. auth.signOut throw → 전파 (graceful catch 없음), revalidate/redirect 미도달
//   4. revalidatePath throw → 전파, redirect 미도달

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const signOutMock = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  getSupabaseServerClient: async () => ({
    auth: { signOut: (...args: unknown[]) => signOutMock(...args) },
  }),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    // Next.js 런타임은 redirect 를 control-flow 예외로 throw — 본 mock 도 동일 모방.
    throw new Error(`NEXT_REDIRECT:${url}`);
  }),
}));

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { signOut } from "@/app/actions/auth";

beforeEach(() => {
  signOutMock.mockReset();
  signOutMock.mockResolvedValue(undefined);
  vi.mocked(revalidatePath).mockReset();
  vi.mocked(redirect).mockClear();
  // redirect 기본 impl (throw) 복원 — mockReset 은 impl 제거하므로 mockClear 사용.
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("signOut — API-015 로그아웃 Server Action", () => {
  it("[1] 정상 → auth.signOut + revalidatePath + redirect 모두 호출", async () => {
    await expect(signOut()).rejects.toThrow("NEXT_REDIRECT:/");
    expect(signOutMock).toHaveBeenCalledTimes(1);
    expect(vi.mocked(revalidatePath)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(redirect)).toHaveBeenCalledTimes(1);
  });

  it("[2] redirect 목적지 '/' + revalidatePath 는 layout 스코프", async () => {
    await expect(signOut()).rejects.toThrow();
    expect(vi.mocked(revalidatePath)).toHaveBeenCalledWith("/", "layout");
    expect(vi.mocked(redirect)).toHaveBeenCalledWith("/");
  });

  it("[3] auth.signOut throw → 전파, revalidate/redirect 미도달", async () => {
    signOutMock.mockRejectedValueOnce(new Error("supabase down"));
    await expect(signOut()).rejects.toThrow("supabase down");
    expect(vi.mocked(revalidatePath)).not.toHaveBeenCalled();
    expect(vi.mocked(redirect)).not.toHaveBeenCalled();
  });

  it("[4] revalidatePath throw → 전파, redirect 미도달", async () => {
    vi.mocked(revalidatePath).mockImplementationOnce(() => {
      throw new Error("revalidate outside request");
    });
    await expect(signOut()).rejects.toThrow("revalidate outside request");
    expect(signOutMock).toHaveBeenCalledTimes(1);
    expect(vi.mocked(redirect)).not.toHaveBeenCalled();
  });
});
