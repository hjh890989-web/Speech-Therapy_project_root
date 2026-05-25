// FR-C-NOTIFICATION-PREFERENCE — /settings/notifications Server Component 통합 테스트.
//
// 격리:
//   - @/lib/db Prisma mock (user.findUnique — getNotificationPreference 내부 호출)
//   - @/lib/supabase/server mock (auth.getUser)
//   - next/navigation redirect mock — throw 흉내
//   - @/components/settings/NotificationPreferenceForm mock — stub
//
// 시나리오 (총 5건):
//   1. 정상 인증 user → form 렌더 + prefill (initialPreference) 전달
//   2. 비인증 → redirect("/login?next=/settings/notifications")
//   3. Supabase 오류 (getUser throw) → redirect (graceful)
//   4. DB row 부재 → form 렌더 + DEFAULTS (모두 true) 전달
//   5. CON-04 의료 금칙어 0건 (정상 분기 텍스트)

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";

const findUniqueMock = vi.fn();
vi.mock("@/lib/db", () => ({
  prisma: {
    user: {
      findUnique: (...args: unknown[]) => findUniqueMock(...args),
    },
  },
}));

const getUserMock = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  getSupabaseServerClient: async () => ({
    auth: {
      getUser: (...args: unknown[]) => getUserMock(...args),
    },
  }),
}));

const redirectMock = vi.fn((target: string) => {
  throw new Error(`NEXT_REDIRECT:${target}`);
});
vi.mock("next/navigation", () => ({
  redirect: (target: string) => redirectMock(target),
}));

vi.mock("@/components/settings/NotificationPreferenceForm", () => ({
  NotificationPreferenceForm: ({
    initialPreference,
  }: {
    initialPreference: Record<string, boolean>;
  }) => (
    <div
      data-testid="notification-preference-form-stub"
      data-initial-preference={JSON.stringify(initialPreference)}
    >
      form stub
    </div>
  ),
}));

import SettingsNotificationsPage from "@/app/(public)/settings/notifications/page";

const USER_ID = "user-uuid-pref-page-9999";
const FORBIDDEN_MEDICAL = ["치료", "진단", "장애"];

function setAuthUser(id: string) {
  getUserMock.mockResolvedValue({ data: { user: { id } }, error: null });
}
function setAnonymous() {
  getUserMock.mockResolvedValue({ data: { user: null }, error: null });
}

beforeEach(() => {
  findUniqueMock.mockReset();
  getUserMock.mockReset();
  redirectMock.mockClear();
});

describe("/settings/notifications — FR-C-NOTIFICATION-PREFERENCE 페이지", () => {
  it("[1] 정상 인증 user → form 렌더 + prefill (initialPreference) 전달", async () => {
    setAuthUser(USER_ID);
    findUniqueMock.mockResolvedValueOnce({
      notificationPreference: { cushionNoteEmail: false },
    });

    const ui = await SettingsNotificationsPage();
    const { container } = render(ui);

    const page = container.querySelector(
      "[data-testid='settings-notifications-page']",
    );
    expect(page).not.toBeNull();

    const formStub = container.querySelector(
      "[data-testid='notification-preference-form-stub']",
    );
    expect(formStub).not.toBeNull();
    const data = JSON.parse(
      formStub?.getAttribute("data-initial-preference") ?? "{}",
    ) as Record<string, boolean>;
    // helper 가 DEFAULTS merge — cushionNoteEmail=false, 나머지 default true.
    expect(data.cushionNoteEmail).toBe(false);
    expect(data.weeklyReportEmail).toBe(true);
    expect(data.consentReminderEmail).toBe(true);
    expect(data.parentInviteEmail).toBe(true);

    // findUnique 가 본인 user.id 만 사용.
    expect(findUniqueMock).toHaveBeenCalledTimes(1);
    const findArg = findUniqueMock.mock.calls[0]![0] as {
      where: { id: string };
    };
    expect(findArg.where.id).toBe(USER_ID);
  });

  it("[2] 비인증 → redirect('/login?next=/settings/notifications')", async () => {
    setAnonymous();
    await expect(SettingsNotificationsPage()).rejects.toThrow(/NEXT_REDIRECT/);
    expect(redirectMock).toHaveBeenCalledWith(
      "/login?next=/settings/notifications",
    );
    expect(findUniqueMock).not.toHaveBeenCalled();
  });

  it("[3] Supabase getUser throw → redirect (graceful)", async () => {
    getUserMock.mockImplementation(() => {
      throw new Error("env missing");
    });
    await expect(SettingsNotificationsPage()).rejects.toThrow(/NEXT_REDIRECT/);
    expect(redirectMock).toHaveBeenCalledWith(
      "/login?next=/settings/notifications",
    );
  });

  it("[4] DB row 부재 → form 렌더 + DEFAULTS (모두 true) 전달", async () => {
    setAuthUser(USER_ID);
    findUniqueMock.mockResolvedValueOnce(null);
    const ui = await SettingsNotificationsPage();
    const { container } = render(ui);

    const formStub = container.querySelector(
      "[data-testid='notification-preference-form-stub']",
    );
    expect(formStub).not.toBeNull();
    const data = JSON.parse(
      formStub?.getAttribute("data-initial-preference") ?? "{}",
    ) as Record<string, boolean>;
    expect(data.weeklyReportEmail).toBe(true);
    expect(data.cushionNoteEmail).toBe(true);
    expect(data.consentReminderEmail).toBe(true);
    expect(data.parentInviteEmail).toBe(true);
  });

  it("[5] CON-04 의료 금칙어 0건 (정상 분기 텍스트)", async () => {
    setAuthUser(USER_ID);
    findUniqueMock.mockResolvedValueOnce({
      notificationPreference: {},
    });
    const { container } = render(await SettingsNotificationsPage());
    for (const w of FORBIDDEN_MEDICAL) {
      expect(container.textContent ?? "").not.toContain(w);
    }
  });
});
