// Performance 감사 2차 — submitBulkImport 의 revalidateTag wiring 검증.
//
// 검증:
//   1) successCount > 0 → revalidateTag("institution:<id>:dashboard") 1회 호출.
//   2) successCount === 0 → revalidateTag 호출 0회 (불필요 invalidation 회피).
//   3) unauthorized/forbidden 분기 → revalidateTag 호출 0회.
//   4) revalidateTag throw 시 console.error + 정상 응답 (graceful).
//
// 격리:
//   - Supabase auth + User 조회 mock (.from('User').select.eq.maybeSingle).
//   - prisma.user.createMany mock (실 DB 0건).
//   - next/cache mock 은 setup.ts 가 이미 vi.fn() 으로 제공 — 본 테스트가 import 해서 spy.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { revalidateTag } from "next/cache";

const supabaseGetUserMock = vi.fn();
const supabaseFromMaybeSingleMock = vi.fn();
const prismaUserCreateManyMock = vi.fn();
const sendParentInviteMock = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  getSupabaseServerClient: async () => ({
    auth: {
      getUser: (...args: unknown[]) => supabaseGetUserMock(...args),
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: () => supabaseFromMaybeSingleMock(),
        }),
      }),
    }),
  }),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    user: {
      createMany: (...args: unknown[]) => prismaUserCreateManyMock(...args),
    },
  },
}));

vi.mock("@/app/actions/parent-invite", () => ({
  sendParentInvite: (...args: unknown[]) => sendParentInviteMock(...args),
}));

import { submitBulkImport } from "@/app/actions/student-bulk-import";

const INSTITUTION = "11111111-1111-4111-8111-111111111111";
const PRINCIPAL_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

beforeEach(() => {
  supabaseGetUserMock.mockReset();
  supabaseFromMaybeSingleMock.mockReset();
  prismaUserCreateManyMock.mockReset();
  sendParentInviteMock.mockReset();
  vi.mocked(revalidateTag).mockClear();
});

function setPrincipalAuth() {
  supabaseGetUserMock.mockResolvedValue({
    data: { user: { id: PRINCIPAL_ID } },
    error: null,
  });
  supabaseFromMaybeSingleMock.mockResolvedValue({
    data: { role: "principal", institutionId: INSTITUTION },
    error: null,
  });
}

function setAnonymousAuth() {
  supabaseGetUserMock.mockResolvedValue({
    data: { user: null },
    error: null,
  });
}

const validRow = {
  studentId: "S001",
  name: "child-anon",
  birthDate: "2022-01-01",
  institutionId: INSTITUTION,
  parentEmail: "p@x.com",
};

describe("submitBulkImport — Performance 감사 2차 revalidateTag wiring", () => {
  it("[ok+success>0] → revalidateTag('institution:<id>:dashboard') 1회 호출", async () => {
    setPrincipalAuth();
    prismaUserCreateManyMock.mockResolvedValue({ count: 1 });

    const res = await submitBulkImport([validRow], INSTITUTION);
    expect(res.status).toBe("ok");
    if (res.status === "ok") {
      expect(res.result.successCount).toBeGreaterThan(0);
    }
    expect(vi.mocked(revalidateTag)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(revalidateTag)).toHaveBeenCalledWith(
      `institution:${INSTITUTION}:dashboard`,
      "default",
    );
  });

  it("[ok+success=0] (빈 rows) → revalidateTag 호출 0회", async () => {
    setPrincipalAuth();

    const res = await submitBulkImport([], INSTITUTION);
    expect(res.status).toBe("ok");
    if (res.status === "ok") {
      expect(res.result.successCount).toBe(0);
    }
    expect(vi.mocked(revalidateTag)).not.toHaveBeenCalled();
  });

  it("[unauthorized] → revalidateTag 호출 0회", async () => {
    setAnonymousAuth();

    const res = await submitBulkImport([validRow], INSTITUTION);
    expect(res.status).toBe("unauthorized");
    expect(vi.mocked(revalidateTag)).not.toHaveBeenCalled();
  });

  it("[forbidden — institutionId 불일치] → revalidateTag 호출 0회", async () => {
    supabaseGetUserMock.mockResolvedValue({
      data: { user: { id: PRINCIPAL_ID } },
      error: null,
    });
    supabaseFromMaybeSingleMock.mockResolvedValue({
      data: { role: "principal", institutionId: "different-inst" },
      error: null,
    });

    const res = await submitBulkImport([validRow], INSTITUTION);
    expect(res.status).toBe("forbidden");
    expect(vi.mocked(revalidateTag)).not.toHaveBeenCalled();
  });

  it("[graceful — revalidateTag throw] → 응답은 status:ok + console.error", async () => {
    setPrincipalAuth();
    prismaUserCreateManyMock.mockResolvedValue({ count: 1 });
    vi.mocked(revalidateTag).mockImplementationOnce(() => {
      throw new Error("revalidate failure simulated");
    });
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const res = await submitBulkImport([validRow], INSTITUTION);

    expect(res.status).toBe("ok");
    expect(errSpy).toHaveBeenCalledWith(
      "student-bulk-import: revalidateTag failed",
      expect.any(Error),
    );
    errSpy.mockRestore();
  });
});
