// FR-Q-009 / FR-C-005 — 부모 초대 JWT helper 단위 테스트.
//
// 시나리오:
//   1. create + verify round-trip → payload 정확히 복원
//   2. parentEmail 정규화 — toLowerCase + trim
//   3. secret 미설정 → createParentInviteToken throw
//   4. secret 미설정 → verifyParentInviteToken null (graceful)
//   5. 빈 token / 빈 문자열 → null
//   6. 위조 token (서명 변조) → null
//   7. 만료 token (exp 과거) → null
//   8. 다른 secret 으로 발급된 token → null (signature mismatch)
//   9. issuer 불일치 → null
//  10. 빈 parentEmail 입력 → create throw

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { SignJWT } from "jose";

import {
  createParentInviteToken,
  verifyParentInviteToken,
  __resetParentInviteCacheForTests,
  PARENT_INVITE_ISSUER,
} from "@/lib/auth/parent-invite";

const SECRET = "test-secret-at-least-32-chars-long-xxxxxx";
const OTHER_SECRET = "another-secret-32chars-also-just-xxxxxxxx";

const ORIG_SECRET = process.env.PARENT_INVITE_JWT_SECRET;

beforeEach(() => {
  __resetParentInviteCacheForTests();
  process.env.PARENT_INVITE_JWT_SECRET = SECRET;
});

afterEach(() => {
  __resetParentInviteCacheForTests();
  if (ORIG_SECRET === undefined) delete process.env.PARENT_INVITE_JWT_SECRET;
  else process.env.PARENT_INVITE_JWT_SECRET = ORIG_SECRET;
});

describe("createParentInviteToken + verifyParentInviteToken — round-trip", () => {
  it("정상 입력 → 발급 + 검증 → payload 동일", async () => {
    const token = await createParentInviteToken({
      parentEmail: "parent@example.com",
      childId: "11111111-1111-4111-8111-111111111111",
      institutionId: "22222222-2222-4222-8222-222222222222",
    });
    expect(typeof token).toBe("string");
    expect(token.split(".").length).toBe(3); // header.payload.signature

    const payload = await verifyParentInviteToken(token);
    expect(payload).not.toBeNull();
    expect(payload!.parentEmail).toBe("parent@example.com");
    expect(payload!.childId).toBe("11111111-1111-4111-8111-111111111111");
    expect(payload!.institutionId).toBe("22222222-2222-4222-8222-222222222222");
    expect(payload!.iss).toBe(PARENT_INVITE_ISSUER);
    expect(typeof payload!.iat).toBe("number");
    expect(typeof payload!.exp).toBe("number");
    // 7일 만료 — 약 604800초 (sentinel: 600000 이상).
    expect(payload!.exp - payload!.iat).toBeGreaterThan(600_000);
  });

  it("parentEmail 정규화 — 대문자/공백 → 소문자 trim 저장", async () => {
    const token = await createParentInviteToken({
      parentEmail: "  Parent@EXAMPLE.com  ",
      childId: "child-1",
      institutionId: "inst-1",
    });
    const payload = await verifyParentInviteToken(token);
    expect(payload!.parentEmail).toBe("parent@example.com");
  });
});

describe("createParentInviteToken — 입력 검증", () => {
  it("빈 parentEmail → throw", async () => {
    await expect(
      createParentInviteToken({
        parentEmail: "   ",
        childId: "c",
        institutionId: "i",
      }),
    ).rejects.toThrow();
  });

  it("빈 childId → throw", async () => {
    await expect(
      createParentInviteToken({
        parentEmail: "a@b.com",
        childId: "",
        institutionId: "i",
      }),
    ).rejects.toThrow();
  });

  it("빈 institutionId → throw", async () => {
    await expect(
      createParentInviteToken({
        parentEmail: "a@b.com",
        childId: "c",
        institutionId: "",
      }),
    ).rejects.toThrow();
  });
});

describe("createParentInviteToken — secret 미설정", () => {
  it("secret 부재 → throw (env 명시적 안내)", async () => {
    delete process.env.PARENT_INVITE_JWT_SECRET;
    __resetParentInviteCacheForTests();
    await expect(
      createParentInviteToken({
        parentEmail: "a@b.com",
        childId: "c",
        institutionId: "i",
      }),
    ).rejects.toThrow(/PARENT_INVITE_JWT_SECRET/);
  });
});

describe("verifyParentInviteToken — 위조 / 만료 graceful", () => {
  it("빈 문자열 / 잘못된 형식 → null", async () => {
    expect(await verifyParentInviteToken("")).toBeNull();
    expect(await verifyParentInviteToken("not.a.token")).toBeNull();
    expect(await verifyParentInviteToken("abc")).toBeNull();
  });

  it("secret 미설정 → null (graceful)", async () => {
    // 1) 정상 발급
    const token = await createParentInviteToken({
      parentEmail: "a@b.com",
      childId: "c",
      institutionId: "i",
    });
    // 2) verify 시 secret 제거
    delete process.env.PARENT_INVITE_JWT_SECRET;
    __resetParentInviteCacheForTests();
    expect(await verifyParentInviteToken(token)).toBeNull();
  });

  it("위조 — signature 부분 변조 → null", async () => {
    const token = await createParentInviteToken({
      parentEmail: "a@b.com",
      childId: "c",
      institutionId: "i",
    });
    // signature 절반을 통째로 바꿔 강제 mismatch — 단일 base64 char 변경은
    // 디코딩 시 같은 바이트로 정규화될 가능성 (padding) 이 있어 신뢰 부족.
    const parts = token.split(".");
    const sig = parts[2]!;
    const half = Math.floor(sig.length / 2);
    parts[2] =
      sig
        .slice(0, half)
        .split("")
        .reverse()
        .join("") + sig.slice(half);
    const tampered = parts.join(".");
    expect(await verifyParentInviteToken(tampered)).toBeNull();
  });

  it("위조 — payload 변조 (이메일 교체) → null", async () => {
    const token = await createParentInviteToken({
      parentEmail: "victim@example.com",
      childId: "c",
      institutionId: "i",
    });
    const parts = token.split(".");
    // payload 를 다른 합법 base64 로 교체 → signature 와 mismatch.
    const fakePayload = Buffer.from(
      JSON.stringify({
        parentEmail: "attacker@example.com",
        childId: "c",
        institutionId: "i",
        iss: "speech-therapy",
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 86_400,
      }),
    )
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
    parts[1] = fakePayload;
    expect(await verifyParentInviteToken(parts.join("."))).toBeNull();
  });

  it("다른 secret 으로 발급된 token → null", async () => {
    process.env.PARENT_INVITE_JWT_SECRET = OTHER_SECRET;
    __resetParentInviteCacheForTests();
    const evilToken = await createParentInviteToken({
      parentEmail: "a@b.com",
      childId: "c",
      institutionId: "i",
    });
    // 원래 secret 으로 검증.
    process.env.PARENT_INVITE_JWT_SECRET = SECRET;
    __resetParentInviteCacheForTests();
    expect(await verifyParentInviteToken(evilToken)).toBeNull();
  });

  it("만료 token — exp 과거 → null", async () => {
    // 직접 jose 로 만료된 token 생성.
    const key = new TextEncoder().encode(SECRET);
    const expiredToken = await new SignJWT({
      parentEmail: "a@b.com",
      childId: "c",
      institutionId: "i",
    })
      .setProtectedHeader({ alg: "HS256", typ: "JWT" })
      .setIssuer(PARENT_INVITE_ISSUER)
      .setIssuedAt(Math.floor(Date.now() / 1000) - 86_400 * 10) // 10일 전 발급
      .setExpirationTime(Math.floor(Date.now() / 1000) - 86_400) // 1일 전 만료
      .sign(key);
    expect(await verifyParentInviteToken(expiredToken)).toBeNull();
  });

  it("issuer 불일치 → null", async () => {
    const key = new TextEncoder().encode(SECRET);
    const wrongIssToken = await new SignJWT({
      parentEmail: "a@b.com",
      childId: "c",
      institutionId: "i",
    })
      .setProtectedHeader({ alg: "HS256", typ: "JWT" })
      .setIssuer("other-issuer")
      .setIssuedAt()
      .setExpirationTime("7d")
      .sign(key);
    expect(await verifyParentInviteToken(wrongIssToken)).toBeNull();
  });

  it("payload schema 위반 (parentEmail 누락) → null", async () => {
    const key = new TextEncoder().encode(SECRET);
    const malformed = await new SignJWT({
      // parentEmail 없음
      childId: "c",
      institutionId: "i",
    })
      .setProtectedHeader({ alg: "HS256", typ: "JWT" })
      .setIssuer(PARENT_INVITE_ISSUER)
      .setIssuedAt()
      .setExpirationTime("7d")
      .sign(key);
    expect(await verifyParentInviteToken(malformed)).toBeNull();
  });
});

describe("verifyParentInviteToken — null/undefined 안전", () => {
  it("null-like 입력 → null", async () => {
    // @ts-expect-error — 의도적으로 잘못된 타입 통과 시 null.
    expect(await verifyParentInviteToken(null)).toBeNull();
    // @ts-expect-error — 의도적으로 잘못된 타입.
    expect(await verifyParentInviteToken(undefined)).toBeNull();
  });
});

// 환경변수 reset 보장 (vitest mockReset 사이 격리).
afterEach(() => {
  vi.unstubAllEnvs?.();
});
