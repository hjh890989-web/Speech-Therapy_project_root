// CR-2026-009 — saveLiteracyResult Server Action 단위 테스트.
//
// 격리:
//   - @/lib/supabase/server mock (auth.getUser) — 인증/익명 분기
//   - @/lib/db Prisma mock (user.findUnique 월령 조회 + literacyResult.create)
//   - @/lib/db/with-actor mock (pass-through tx + actorId 캡처)
//   - @/lib/policy/consent-guard mock (assertConsentedIfAuthenticated + ConsentRequiredError)
//   - 게임 플래그는 env (registry 실 동작) 로 제어
//
// 시나리오:
//   1. 입력 검증 실패              → success:false invalid_input
//   2. 플래그 off (dormant)        → persisted:false dormant (저장 안 함)
//   2b. 미등록 gameSlug            → dormant
//   3. 익명(getUser null)          → persisted:false anonymous
//   3b. 월령 미상(User.childAgeMonths null) → persisted:false age_out_of_domain
//   4. PIPA 미동의                 → persisted:false consent_required
//   5. 정상                        → persisted:true + raw 그대로 + stage 서버파생 + 서버조회 월령 + withActor 본인 id
//   6. R4 — 외부 user id 무시       → create.data.userId == auth uid
//   7. DB throw                    → success:false db_failed

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const getUserMock = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  getSupabaseServerClient: async () => ({
    auth: { getUser: (...args: unknown[]) => getUserMock(...args) },
  }),
}));

const createMock = vi.fn();
const findUniqueMock = vi.fn();
vi.mock("@/lib/db", () => ({
  prisma: {
    user: { findUnique: (...args: unknown[]) => findUniqueMock(...args) },
    literacyResult: { create: (...args: unknown[]) => createMock(...args) },
  },
}));

const withActorMock = vi.fn();
vi.mock("@/lib/db/with-actor", () => ({
  withActor: async <T,>(
    actorId: string | null | undefined,
    fn: (tx: unknown) => Promise<T>,
  ) => {
    withActorMock(actorId);
    const tx = {
      literacyResult: { create: (...args: unknown[]) => createMock(...args) },
    };
    return fn(tx);
  },
}));

// vi.mock 은 파일 최상단으로 hoist 됨 — 팩토리가 참조하는 클래스/목은 vi.hoisted 로 함께 올린다.
const { FakeConsentRequiredError, assertConsentMock } = vi.hoisted(() => {
  class FakeConsentRequiredError extends Error {
    readonly code = "PIPA_CONSENT_REQUIRED";
    constructor() {
      super("PIPA_CONSENT_REQUIRED");
      this.name = "ConsentRequiredError";
    }
  }
  return { FakeConsentRequiredError, assertConsentMock: vi.fn() };
});
vi.mock("@/lib/policy/consent-guard", () => ({
  assertConsentedIfAuthenticated: (...args: unknown[]) => assertConsentMock(...args),
  ConsentRequiredError: FakeConsentRequiredError,
}));

import { saveLiteracyResult } from "@/app/actions/literacy-result";

const USER_ID = "user-uuid-lit-1";
const VALID = { gameSlug: "vocabulary", rawScore: 5, rawTotal: 6 };

beforeEach(() => {
  getUserMock.mockReset();
  createMock.mockReset();
  findUniqueMock.mockReset();
  withActorMock.mockReset();
  assertConsentMock.mockReset();
  assertConsentMock.mockResolvedValue(undefined); // 기본: 동의 완료
  findUniqueMock.mockResolvedValue({ childAgeMonths: 60 }); // 기본: 만 5세
  process.env.LITERACY_VOCAB_ENABLED = "true"; // 기본: 게임 활성
});

afterEach(() => {
  delete process.env.LITERACY_VOCAB_ENABLED;
  vi.restoreAllMocks();
});

describe("saveLiteracyResult", () => {
  it("[1] 입력 검증 실패 → invalid_input", async () => {
    const r = await saveLiteracyResult({ gameSlug: "", rawScore: -1 });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.reason).toBe("invalid_input");
    expect(createMock).not.toHaveBeenCalled();
  });

  it("[2] 플래그 off → persisted:false dormant (저장 안 함)", async () => {
    delete process.env.LITERACY_VOCAB_ENABLED;
    getUserMock.mockResolvedValue({ data: { user: { id: USER_ID } }, error: null });
    const r = await saveLiteracyResult(VALID);
    expect(r).toEqual({ success: true, persisted: false, reason: "dormant" });
    expect(createMock).not.toHaveBeenCalled();
  });

  it("[2b] 미등록 gameSlug → dormant", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: USER_ID } }, error: null });
    const r = await saveLiteracyResult({ ...VALID, gameSlug: "unknown-game" });
    expect(r).toEqual({ success: true, persisted: false, reason: "dormant" });
    expect(createMock).not.toHaveBeenCalled();
  });

  it("[3] 익명(getUser null) → persisted:false anonymous (저장 안 함)", async () => {
    getUserMock.mockResolvedValue({ data: { user: null }, error: null });
    const r = await saveLiteracyResult(VALID);
    expect(r).toEqual({ success: true, persisted: false, reason: "anonymous" });
    expect(createMock).not.toHaveBeenCalled();
  });

  it("[3b] 월령 미상(User.childAgeMonths null) → persisted:false age_out_of_domain", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: USER_ID } }, error: null });
    findUniqueMock.mockResolvedValue({ childAgeMonths: null });
    const r = await saveLiteracyResult(VALID);
    expect(r).toEqual({ success: true, persisted: false, reason: "age_out_of_domain" });
    expect(createMock).not.toHaveBeenCalled();
  });

  it("[4] PIPA 미동의 → persisted:false consent_required", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: USER_ID } }, error: null });
    assertConsentMock.mockRejectedValue(new FakeConsentRequiredError());
    const r = await saveLiteracyResult(VALID);
    expect(r).toEqual({ success: true, persisted: false, reason: "consent_required" });
    expect(createMock).not.toHaveBeenCalled();
  });

  it("[5] 정상 → persisted:true + raw 그대로 + stage S0 + 서버조회 월령 + withActor 본인 id", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: USER_ID } }, error: null });
    findUniqueMock.mockResolvedValue({ childAgeMonths: 60 });
    createMock.mockResolvedValue({ id: "lit-row-1" });
    const r = await saveLiteracyResult(VALID);
    expect(r).toEqual({ success: true, persisted: true, id: "lit-row-1", stage: "S0" });
    expect(withActorMock).toHaveBeenCalledWith(USER_ID);
    expect(createMock).toHaveBeenCalledTimes(1);
    const arg = createMock.mock.calls[0][0] as { data: Record<string, unknown> };
    // raw 그대로(보정 0), referenceBand=null(연습-only), stage·월령 서버 파생.
    expect(arg.data).toMatchObject({
      userId: USER_ID,
      stage: "S0",
      gameSlug: "vocabulary",
      rawScore: 5,
      rawTotal: 6,
      childAgeMonths: 60,
      referenceBand: null,
    });
  });

  it("[6] R4 — 입력에 다른 userId 가 있어도 auth uid 로만 저장", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: USER_ID } }, error: null });
    createMock.mockResolvedValue({ id: "lit-row-2" });
    // 스키마에 없는 userId 주입 시도(무시되어야 함). 액션 인자는 unknown.
    await saveLiteracyResult({ ...VALID, userId: "attacker-id" });
    const arg = createMock.mock.calls[0][0] as { data: { userId: string } };
    expect(arg.data.userId).toBe(USER_ID);
    expect(arg.data.userId).not.toBe("attacker-id");
  });

  it("[7] DB throw → db_failed", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: USER_ID } }, error: null });
    createMock.mockRejectedValue(new Error("db down"));
    const r = await saveLiteracyResult(VALID);
    expect(r.success).toBe(false);
    if (!r.success) expect(r.reason).toBe("db_failed");
  });
});
