// API-015 / FR-C-018 (#41) — submitConsentSignature Server Action 단위 테스트.
//
// 격리:
//   - @/lib/consent/repo mock (markConsentSigned + daysSince)
//   - next/cache (revalidatePath) 는 __tests__/setup.ts 에서 전역 mock
//   - next/headers (headers) mock — IP/UA 추출 분기 제어
//
// 시나리오 (총 10건):
//   1. zod 검증 실패 (비-UUID token) → invalid_input (markConsentSigned 미호출)
//   2. 정상 서명 → signed + tokenSuffix + revalidatePath 호출
//   3. 멱등 — alreadySigned → already_signed (ok:true) + revalidatePath 미호출
//   4. 만료 → expired (ok:false) + tokenSuffix
//   5. 미존재 → not_found (ok:false) + tokenSuffix
//   6. markConsentSigned throw → internal_error (graceful, tokenSuffix 없음)
//   7. IP/UA 헤더 존재 → signedIp/signedUa 추출되어 markConsentSigned 에 전달
//   8. headers() throw → graceful, signedIp/signedUa null 로 진행
//   9. revalidatePath throw → 여전히 signed (graceful skip)
//  10. R4/프라이버시 — 응답은 token 마지막 4자리만 노출, full token 미노출

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const markConsentSignedMock = vi.fn();
const daysSinceMock = vi.fn((..._args: unknown[]) => 1);
vi.mock("@/lib/consent/repo", () => ({
  markConsentSigned: (...args: unknown[]) => markConsentSignedMock(...args),
  daysSince: (...args: unknown[]) => daysSinceMock(...args),
}));

const headersGetMock = vi.fn();
vi.mock("next/headers", () => ({
  headers: vi.fn(async () => ({ get: (name: string) => headersGetMock(name) })),
}));

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { submitConsentSignature } from "@/app/actions/consent-sign";

// 유효 UUID v4 — zod .uuid() 통과. suffix = 마지막 4자리.
const TOKEN = "550e8400-e29b-41d4-a716-4466554409a1";
const TOKEN_SUFFIX = TOKEN.slice(-4); // "09a1"

function signedRow() {
  return {
    signed: true,
    alreadySigned: false,
    notFound: false,
    expired: false,
    row: {
      id: "consent-1",
      signedAt: new Date("2026-05-21T00:00:00Z"),
      sentAt: new Date("2026-05-20T00:00:00Z"),
    },
  };
}

beforeEach(() => {
  markConsentSignedMock.mockReset();
  daysSinceMock.mockClear();
  headersGetMock.mockReset();
  // default: 헤더 부재 (null) → meta {ip:null, ua:null}.
  headersGetMock.mockReturnValue(null);
  // default: 정상 서명 성공.
  markConsentSignedMock.mockResolvedValue(signedRow());
  vi.mocked(revalidatePath).mockClear();
  vi.mocked(headers).mockClear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("submitConsentSignature — API-015 부모 서명 Server Action", () => {
  it("[1] zod 검증 실패 (비-UUID token) → invalid_input, markConsentSigned 미호출", async () => {
    const result = await submitConsentSignature({ token: "not-a-uuid" });
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("invalid_input");
    expect(result.tokenSuffix).toBeUndefined();
    expect(markConsentSignedMock).not.toHaveBeenCalled();
  });

  it("[2] 정상 서명 → signed + tokenSuffix + revalidatePath 호출", async () => {
    const result = await submitConsentSignature({ token: TOKEN });
    expect(result.ok).toBe(true);
    expect(result.reason).toBe("signed");
    expect(result.tokenSuffix).toBe(TOKEN_SUFFIX);

    expect(markConsentSignedMock).toHaveBeenCalledTimes(1);
    expect(markConsentSignedMock).toHaveBeenCalledWith({
      token: TOKEN,
      signedIp: null,
      signedUa: null,
    });
    expect(vi.mocked(revalidatePath)).toHaveBeenCalledWith(`/consent/${TOKEN}`);
  });

  it("[3] 멱등 — alreadySigned → already_signed (ok:true), revalidatePath 미호출", async () => {
    markConsentSignedMock.mockResolvedValueOnce({
      signed: false,
      alreadySigned: true,
      notFound: false,
      expired: false,
      row: { id: "consent-1", signedAt: new Date(), sentAt: new Date() },
    });
    const result = await submitConsentSignature({ token: TOKEN });
    expect(result.ok).toBe(true);
    expect(result.reason).toBe("already_signed");
    expect(result.tokenSuffix).toBe(TOKEN_SUFFIX);
    // alreadySigned 분기는 revalidate 이전 early-return.
    expect(vi.mocked(revalidatePath)).not.toHaveBeenCalled();
  });

  it("[4] 만료 → expired (ok:false) + tokenSuffix", async () => {
    markConsentSignedMock.mockResolvedValueOnce({
      signed: false,
      alreadySigned: false,
      notFound: false,
      expired: true,
    });
    const result = await submitConsentSignature({ token: TOKEN });
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("expired");
    expect(result.tokenSuffix).toBe(TOKEN_SUFFIX);
  });

  it("[5] 미존재 → not_found (ok:false) + tokenSuffix", async () => {
    markConsentSignedMock.mockResolvedValueOnce({
      signed: false,
      alreadySigned: false,
      notFound: true,
      expired: false,
    });
    const result = await submitConsentSignature({ token: TOKEN });
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("not_found");
    expect(result.tokenSuffix).toBe(TOKEN_SUFFIX);
  });

  it("[6] markConsentSigned throw → internal_error (graceful, tokenSuffix 없음)", async () => {
    markConsentSignedMock.mockRejectedValueOnce(new Error("db down"));
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const result = await submitConsentSignature({ token: TOKEN });
    errSpy.mockRestore();
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("internal_error");
    expect(result.tokenSuffix).toBeUndefined();
  });

  it("[7] IP/UA 헤더 존재 → signedIp/signedUa 추출되어 markConsentSigned 전달", async () => {
    headersGetMock.mockImplementation((name: string) => {
      if (name === "x-forwarded-for") return "203.0.113.9, 10.0.0.1";
      if (name === "user-agent") return "Mozilla/5.0 (Test)";
      return null;
    });
    const result = await submitConsentSignature({ token: TOKEN });
    expect(result.reason).toBe("signed");
    // x-forwarded-for 첫 IP 만 추출 (proxy chain 의 client IP).
    expect(markConsentSignedMock).toHaveBeenCalledWith({
      token: TOKEN,
      signedIp: "203.0.113.9",
      signedUa: "Mozilla/5.0 (Test)",
    });
  });

  it("[8] headers() throw → graceful, signedIp/signedUa null 로 진행", async () => {
    vi.mocked(headers).mockImplementationOnce(async () => {
      throw new Error("no request scope");
    });
    const result = await submitConsentSignature({ token: TOKEN });
    expect(result.reason).toBe("signed");
    expect(markConsentSignedMock).toHaveBeenCalledWith({
      token: TOKEN,
      signedIp: null,
      signedUa: null,
    });
  });

  it("[9] revalidatePath throw → 여전히 signed (graceful skip)", async () => {
    vi.mocked(revalidatePath).mockImplementationOnce(() => {
      throw new Error("revalidate outside request");
    });
    const result = await submitConsentSignature({ token: TOKEN });
    expect(result.ok).toBe(true);
    expect(result.reason).toBe("signed");
  });

  it("[10] R4/프라이버시 — 응답은 token 마지막 4자리만, full token 미노출", async () => {
    const signed = await submitConsentSignature({ token: TOKEN });
    expect(signed.tokenSuffix).toHaveLength(4);
    expect(JSON.stringify(signed)).not.toContain(TOKEN);

    markConsentSignedMock.mockResolvedValueOnce({
      signed: false,
      alreadySigned: false,
      notFound: true,
      expired: false,
    });
    const notFound = await submitConsentSignature({ token: TOKEN });
    expect(JSON.stringify(notFound)).not.toContain(TOKEN);
  });
});
