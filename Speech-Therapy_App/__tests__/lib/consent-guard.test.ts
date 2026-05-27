// SEC-COMP-PIPA (Grill #3A) — lib/policy/consent-guard.ts 단위 테스트.
//
// 검증:
//   1) 익명 user (getCachedUser null) → 가드 통과 (throw 없음).
//   2) 인증 user + User row 미존재 → 통과 (provisioning, 안전 default).
//   3) 인증 user + 두 동의 모두 완료 → 통과.
//   4) 인증 user + pipa 만 null → ConsentRequiredError throw.
//   5) 인증 user + overseas 만 null → throw.
//   6) 인증 user + 둘 다 null → throw.
//   7) DB 일시 장애 (findUnique throw) → 통과 (graceful, 사용자 흐름 보존).
//   8) ConsentRequiredError 의 code + message + name 일관성.

import { describe, it, expect, vi, beforeEach } from "vitest";

const getCachedUserMock = vi.fn();
const findUniqueMock = vi.fn();

vi.mock("@/lib/auth/cached-get-user", () => ({
  getCachedUser: (...args: unknown[]) => getCachedUserMock(...args),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    user: {
      findUnique: (...args: unknown[]) => findUniqueMock(...args),
    },
  },
}));

import {
  assertConsentedIfAuthenticated,
  ConsentRequiredError,
} from "@/lib/policy/consent-guard";

beforeEach(() => {
  getCachedUserMock.mockReset();
  findUniqueMock.mockReset();
});

const USER = { id: "11111111-1111-4111-8111-111111111111" };
const NOW = new Date("2026-05-27T10:00:00Z");

describe("assertConsentedIfAuthenticated", () => {
  it("익명 (getCachedUser null) → 통과", async () => {
    getCachedUserMock.mockResolvedValueOnce(null);
    await expect(assertConsentedIfAuthenticated()).resolves.toBeUndefined();
    expect(findUniqueMock).not.toHaveBeenCalled();
  });

  it("인증 user + User row 미존재 → 통과 (provisioning)", async () => {
    getCachedUserMock.mockResolvedValueOnce(USER);
    findUniqueMock.mockResolvedValueOnce(null);
    await expect(assertConsentedIfAuthenticated()).resolves.toBeUndefined();
  });

  it("인증 user + 두 동의 모두 완료 → 통과", async () => {
    getCachedUserMock.mockResolvedValueOnce(USER);
    findUniqueMock.mockResolvedValueOnce({
      pipaUnderageConsentAt: NOW,
      overseasTransferConsentAt: NOW,
    });
    await expect(assertConsentedIfAuthenticated()).resolves.toBeUndefined();
  });

  it("인증 user + pipa 미동의 → ConsentRequiredError", async () => {
    getCachedUserMock.mockResolvedValueOnce(USER);
    findUniqueMock.mockResolvedValueOnce({
      pipaUnderageConsentAt: null,
      overseasTransferConsentAt: NOW,
    });
    await expect(assertConsentedIfAuthenticated()).rejects.toBeInstanceOf(
      ConsentRequiredError,
    );
  });

  it("인증 user + overseas 미동의 → ConsentRequiredError", async () => {
    getCachedUserMock.mockResolvedValueOnce(USER);
    findUniqueMock.mockResolvedValueOnce({
      pipaUnderageConsentAt: NOW,
      overseasTransferConsentAt: null,
    });
    await expect(assertConsentedIfAuthenticated()).rejects.toBeInstanceOf(
      ConsentRequiredError,
    );
  });

  it("인증 user + 둘 다 미동의 → ConsentRequiredError", async () => {
    getCachedUserMock.mockResolvedValueOnce(USER);
    findUniqueMock.mockResolvedValueOnce({
      pipaUnderageConsentAt: null,
      overseasTransferConsentAt: null,
    });
    await expect(assertConsentedIfAuthenticated()).rejects.toBeInstanceOf(
      ConsentRequiredError,
    );
  });

  it("DB 일시 장애 (findUnique throw) → 통과 (graceful)", async () => {
    getCachedUserMock.mockResolvedValueOnce(USER);
    findUniqueMock.mockRejectedValueOnce(new Error("connection_refused"));
    await expect(assertConsentedIfAuthenticated()).resolves.toBeUndefined();
  });
});

describe("ConsentRequiredError", () => {
  it("code / message / name 일관성", () => {
    const err = new ConsentRequiredError();
    expect(err.code).toBe("PIPA_CONSENT_REQUIRED");
    expect(err.message).toBe("PIPA_CONSENT_REQUIRED");
    expect(err.name).toBe("ConsentRequiredError");
    expect(err).toBeInstanceOf(Error);
  });

  it("throw + catch 시 message 매칭 ('PIPA_CONSENT_REQUIRED' includes)", () => {
    try {
      throw new ConsentRequiredError();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      expect(message.includes("PIPA_CONSENT_REQUIRED")).toBe(true);
    }
  });
});
