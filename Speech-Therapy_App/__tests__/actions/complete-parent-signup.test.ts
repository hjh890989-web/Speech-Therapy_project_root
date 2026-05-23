// FR-Q-009 / FR-C-005 — completeParentSignup Server Action 단위 테스트.
//
// 격리:
//   - @/lib/auth/parent-invite mock (verifyParentInviteToken)
//   - @/lib/supabase/server mock (auth.signUp)
//   - @/lib/db Prisma mock (user.findUnique 만 — upsert 는 withActor 안에서 호출)
//   - @/lib/db/with-actor mock (withActor 가 tx 를 그대로 fn 에 전달하도록)
//
// 시나리오:
//   1. 만료/위조 token → invalid_token
//   2. 짧은 password (< 8) → invalid_password
//   3. 정상 → supabase.signUp 호출 + prisma.upsert + success
//   4. supabase.signUp error → auth_failed
//   5. child 가 다른 institution → child_mismatch
//   6. prisma.upsert throw → db_failed
//   7. 빈 password → invalid_password

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const verifyMock = vi.fn();
vi.mock("@/lib/auth/parent-invite", () => ({
  verifyParentInviteToken: (...args: unknown[]) => verifyMock(...args),
}));

const signUpMock = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  getSupabaseServerClient: async () => ({
    auth: { signUp: (...args: unknown[]) => signUpMock(...args) },
  }),
}));

const upsertMock = vi.fn();
const findUniqueMock = vi.fn();
vi.mock("@/lib/db", () => ({
  prisma: {
    user: {
      findUnique: (...args: unknown[]) => findUniqueMock(...args),
      upsert: (...args: unknown[]) => upsertMock(...args),
    },
  },
}));

vi.mock("@/lib/db/with-actor", () => ({
  withActor: async <T,>(
    _actorId: string | null | undefined,
    fn: (tx: unknown) => Promise<T>,
  ) => {
    // 단순화: tx 는 mock prisma 그대로 — withActor 가 set_config 만 추가하는 책임이므로
    // 테스트는 fn 본체가 호출되는지만 검증.
    const tx = {
      user: {
        upsert: (...args: unknown[]) => upsertMock(...args),
      },
    };
    return fn(tx);
  },
}));

import { completeParentSignup } from "@/app/actions/complete-parent-signup";

const NEW_USER_ID = "11111111-1111-4111-8111-111111111111";
const INSTITUTION = "22222222-2222-4222-8222-222222222222";
const OTHER_INST = "33333333-3333-4333-8333-333333333333";
const CHILD_ID = "44444444-4444-4444-8444-444444444444";

const VALID_PAYLOAD = {
  parentEmail: "parent@example.com",
  childId: CHILD_ID,
  institutionId: INSTITUTION,
  iat: 1_700_000_000,
  exp: 1_700_000_000 + 604_800,
  iss: "speech-therapy" as const,
};

beforeEach(() => {
  verifyMock.mockReset();
  signUpMock.mockReset();
  upsertMock.mockReset();
  findUniqueMock.mockReset();

  // 기본값 — 정상 흐름.
  verifyMock.mockResolvedValue(VALID_PAYLOAD);
  signUpMock.mockResolvedValue({
    data: { user: { id: NEW_USER_ID } },
    error: null,
  });
  findUniqueMock.mockResolvedValue(null);
  upsertMock.mockResolvedValue({ id: NEW_USER_ID });
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("completeParentSignup — token 검증", () => {
  it("verifyParentInviteToken null → invalid_token", async () => {
    verifyMock.mockResolvedValueOnce(null);
    const out = await completeParentSignup({
      token: "expired",
      password: "password123",
    });
    expect(out.success).toBe(false);
    if (!out.success) {
      expect(out.reason).toBe("invalid_token");
    }
    expect(signUpMock).not.toHaveBeenCalled();
    expect(upsertMock).not.toHaveBeenCalled();
  });
});

describe("completeParentSignup — password 검증", () => {
  it("8자 미만 → invalid_password", async () => {
    const out = await completeParentSignup({
      token: "valid",
      password: "short",
    });
    expect(out.success).toBe(false);
    if (!out.success) expect(out.reason).toBe("invalid_password");
    expect(signUpMock).not.toHaveBeenCalled();
  });

  it("빈 문자열 → invalid_password", async () => {
    const out = await completeParentSignup({ token: "valid", password: "" });
    expect(out.success).toBe(false);
    if (!out.success) expect(out.reason).toBe("invalid_password");
  });
});

describe("completeParentSignup — 정상 흐름", () => {
  it("정상 → supabase.signUp + prisma.upsert + success", async () => {
    const out = await completeParentSignup({
      token: "valid",
      password: "longenough123",
    });
    expect(out.success).toBe(true);
    if (out.success) {
      expect(out.userId).toBe(NEW_USER_ID);
      expect(out.message).toContain("가입");
    }
    expect(signUpMock).toHaveBeenCalledOnce();
    expect(signUpMock.mock.calls[0]![0]).toEqual({
      email: "parent@example.com",
      password: "longenough123",
    });
    expect(upsertMock).toHaveBeenCalledOnce();
    const upsertArg = upsertMock.mock.calls[0]![0] as {
      where: { id: string };
      create: { role: string; institutionId: string; email: string };
    };
    expect(upsertArg.where.id).toBe(NEW_USER_ID);
    expect(upsertArg.create.role).toBe("parent");
    expect(upsertArg.create.institutionId).toBe(INSTITUTION);
    expect(upsertArg.create.email).toBe("parent@example.com");
  });
});

describe("completeParentSignup — Supabase 에러", () => {
  it("signUp error → auth_failed", async () => {
    signUpMock.mockResolvedValueOnce({
      data: { user: null },
      error: { message: "User already registered" },
    });
    const out = await completeParentSignup({
      token: "valid",
      password: "longenough123",
    });
    expect(out.success).toBe(false);
    if (!out.success) {
      expect(out.reason).toBe("auth_failed");
      expect(out.message).toContain("User already registered");
    }
    expect(upsertMock).not.toHaveBeenCalled();
  });

  it("signUp 응답 user.id 없음 → auth_failed", async () => {
    signUpMock.mockResolvedValueOnce({
      data: { user: null },
      error: null,
    });
    const out = await completeParentSignup({
      token: "valid",
      password: "longenough123",
    });
    expect(out.success).toBe(false);
    if (!out.success) expect(out.reason).toBe("auth_failed");
  });
});

describe("completeParentSignup — child 매칭 (R4)", () => {
  it("child 가 다른 institution → child_mismatch", async () => {
    findUniqueMock.mockResolvedValueOnce({ institutionId: OTHER_INST });
    const out = await completeParentSignup({
      token: "valid",
      password: "longenough123",
    });
    expect(out.success).toBe(false);
    if (!out.success) expect(out.reason).toBe("child_mismatch");
    expect(upsertMock).not.toHaveBeenCalled();
  });

  it("child row 부재 → 가입 진행 (graceful)", async () => {
    findUniqueMock.mockResolvedValueOnce(null);
    const out = await completeParentSignup({
      token: "valid",
      password: "longenough123",
    });
    expect(out.success).toBe(true);
  });

  it("findUnique throw → 가입 계속 (graceful)", async () => {
    findUniqueMock.mockRejectedValueOnce(new Error("db down"));
    const out = await completeParentSignup({
      token: "valid",
      password: "longenough123",
    });
    expect(out.success).toBe(true);
  });
});

describe("completeParentSignup — DB 실패", () => {
  it("upsert throw → db_failed", async () => {
    upsertMock.mockRejectedValueOnce(new Error("connection lost"));
    const out = await completeParentSignup({
      token: "valid",
      password: "longenough123",
    });
    expect(out.success).toBe(false);
    if (!out.success) expect(out.reason).toBe("db_failed");
  });
});
