// SEC-002 (DB-011 후속) — recordAudit 단위 테스트.
//
// 시나리오:
//   1) 정상 호출 → INSERT 1건 (supabase admin client mock)
//   2) actorId null / undefined / 빈 string → "anonymous" 폴백
//   3) payload 에 자녀 식별 의심 키 (realName / ssn / email) → console.warn
//   4) INSERT 실패 (DB error / 예외) graceful — throw X
//   5) action enum 강제 — 잘못된 action → console.error + skip
//
// Refs: lib/audit.ts, GitHub Issue #72 (SEC-002), TASK_DB-011.md (R4 자녀 보호).

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const insertMock = vi.fn();
const fromMock = vi.fn(() => ({ insert: insertMock }));
const getSupabaseAdminMock = vi.fn();

vi.mock("@/lib/supabase/admin", () => ({
  getSupabaseAdmin: () => getSupabaseAdminMock(),
}));

// 정적 import — vi.mock 은 hoist 되므로 mock 적용 후 모듈 로드.
import { recordAudit, __resetAuditWarnFlagForTest } from "@/lib/audit";
import type { AuditAction } from "@/lib/audit";

function makeAdminClient() {
  return {
    from: fromMock,
  };
}

beforeEach(() => {
  insertMock.mockReset();
  fromMock.mockClear();
  // fromMock 의 구현 (insert 반환) 유지 — mockReset 으로 reset 후 재설정.
  fromMock.mockImplementation(() => ({ insert: insertMock }));
  getSupabaseAdminMock.mockReset();
  __resetAuditWarnFlagForTest();
  // 기본: INSERT 성공 (error null).
  insertMock.mockResolvedValue({ error: null });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("recordAudit — 시나리오 1: 정상 호출 → INSERT 1건", () => {
  it("AuditLog.insert 1회 호출 + 필드 매핑 검증", async () => {
    getSupabaseAdminMock.mockReturnValue(makeAdminClient());

    await recordAudit({
      actorId: "user-uuid-123",
      action: "consent_sign",
      target: { tableName: "ConsentSignature", rowId: "consent-uuid-456" },
      payload: { source: "web", agentVersion: "1.0" },
    });

    expect(fromMock).toHaveBeenCalledOnce();
    expect(fromMock).toHaveBeenCalledWith("AuditLog");
    expect(insertMock).toHaveBeenCalledOnce();
    expect(insertMock).toHaveBeenCalledWith({
      actorId: "user-uuid-123",
      action: "consent_sign",
      tableName: "ConsentSignature",
      rowId: "consent-uuid-456",
      diff: { source: "web", agentVersion: "1.0" },
    });
  });

  it("payload 부재 시 diff=null + rowId 부재 시 rowId=null", async () => {
    getSupabaseAdminMock.mockReturnValue(makeAdminClient());

    await recordAudit({
      actorId: "user-uuid-123",
      action: "sign_in",
      target: { tableName: "User" },
    });

    expect(insertMock).toHaveBeenCalledWith({
      actorId: "user-uuid-123",
      action: "sign_in",
      tableName: "User",
      rowId: null,
      diff: null,
    });
  });

  it("admin client 미설정 (null) → INSERT skip + warn 1회만", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    getSupabaseAdminMock.mockReturnValue(null);

    await recordAudit({
      actorId: "user-uuid-123",
      action: "sign_in",
      target: { tableName: "User" },
    });
    await recordAudit({
      actorId: "user-uuid-123",
      action: "sign_in",
      target: { tableName: "User" },
    });

    expect(insertMock).not.toHaveBeenCalled();
    // warn 은 1회만 (warnedNoAdmin flag).
    expect(warnSpy).toHaveBeenCalledOnce();
    expect(warnSpy.mock.calls[0]?.[0]).toContain("SUPABASE_SERVICE_ROLE_KEY");
  });
});

describe("recordAudit — 시나리오 2: actorId 폴백", () => {
  beforeEach(() => {
    getSupabaseAdminMock.mockReturnValue(makeAdminClient());
  });

  it('actorId null → "anonymous" 폴백', async () => {
    await recordAudit({
      actorId: null,
      action: "sign_in",
      target: { tableName: "User" },
    });

    expect(insertMock).toHaveBeenCalledOnce();
    expect(insertMock.mock.calls[0]?.[0]).toMatchObject({ actorId: "anonymous" });
  });

  it('actorId undefined → "anonymous" 폴백', async () => {
    await recordAudit({
      actorId: undefined,
      action: "sign_in",
      target: { tableName: "User" },
    });
    expect(insertMock.mock.calls[0]?.[0]).toMatchObject({ actorId: "anonymous" });
  });

  it('actorId 빈 string → "anonymous" 폴백', async () => {
    await recordAudit({
      actorId: "",
      action: "sign_in",
      target: { tableName: "User" },
    });
    expect(insertMock.mock.calls[0]?.[0]).toMatchObject({ actorId: "anonymous" });
  });

  it("actorId 유효 string → 그대로 사용 (폴백 안 함)", async () => {
    await recordAudit({
      actorId: "real-user-id",
      action: "sign_in",
      target: { tableName: "User" },
    });
    expect(insertMock.mock.calls[0]?.[0]).toMatchObject({ actorId: "real-user-id" });
  });
});

describe("recordAudit — 시나리오 3: payload R4 의심 키 검출", () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    getSupabaseAdminMock.mockReturnValue(makeAdminClient());
    warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  it("payload 에 realName 키 → console.warn + INSERT 는 진행 (자동 strip 안 함)", async () => {
    await recordAudit({
      actorId: "user-1",
      action: "consent_sign",
      target: { tableName: "ConsentSignature", rowId: "c1" },
      payload: { realName: "홍길동", source: "web" },
    });

    expect(warnSpy).toHaveBeenCalledOnce();
    const warnMsg = String(warnSpy.mock.calls[0]?.[0] ?? "");
    expect(warnMsg).toContain("realName");
    expect(warnMsg).toContain("R4");
    // INSERT 는 그대로 진행 (자동 strip 안 함 — 호출 측 책임).
    expect(insertMock).toHaveBeenCalledOnce();
  });

  it("payload 에 ssn 키 → console.warn", async () => {
    await recordAudit({
      actorId: "user-1",
      action: "data_export",
      target: { tableName: "User", rowId: "u1" },
      payload: { ssn: "123-45-6789" },
    });
    expect(warnSpy).toHaveBeenCalledOnce();
    expect(String(warnSpy.mock.calls[0]?.[0] ?? "")).toContain("ssn");
  });

  it("payload 에 email 키 → console.warn", async () => {
    await recordAudit({
      actorId: "user-1",
      action: "data_export",
      target: { tableName: "User", rowId: "u1" },
      payload: { email: "child@example.com" },
    });
    expect(warnSpy).toHaveBeenCalledOnce();
    expect(String(warnSpy.mock.calls[0]?.[0] ?? "")).toContain("email");
  });

  it("payload 에 대소문자 변형 (Email / REALNAME) 도 검출", async () => {
    await recordAudit({
      actorId: "user-1",
      action: "data_export",
      target: { tableName: "User", rowId: "u1" },
      payload: { Email: "x@y.com", REALNAME: "x" },
    });
    expect(warnSpy).toHaveBeenCalledOnce();
    const msg = String(warnSpy.mock.calls[0]?.[0] ?? "");
    expect(msg).toContain("Email");
    expect(msg).toContain("REALNAME");
  });

  it("payload 에 안전한 키만 (source / count / score) → warn 없음", async () => {
    await recordAudit({
      actorId: "user-1",
      action: "consent_sign",
      target: { tableName: "ConsentSignature", rowId: "c1" },
      payload: { source: "web", count: 3, score: 87.5 },
    });
    expect(warnSpy).not.toHaveBeenCalled();
    expect(insertMock).toHaveBeenCalledOnce();
  });

  it("payload 미설정 → warn 없음 + diff=null INSERT", async () => {
    await recordAudit({
      actorId: "user-1",
      action: "sign_in",
      target: { tableName: "User" },
    });
    expect(warnSpy).not.toHaveBeenCalled();
    expect(insertMock.mock.calls[0]?.[0]).toMatchObject({ diff: null });
  });
});

describe("recordAudit — 시나리오 4: INSERT 실패 graceful", () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    getSupabaseAdminMock.mockReturnValue(makeAdminClient());
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("supabase error 반환 → console.error + throw X (Promise resolve)", async () => {
    insertMock.mockResolvedValue({
      error: { message: "permission denied", code: "42501" },
    });

    await expect(
      recordAudit({
        actorId: "user-1",
        action: "consent_sign",
        target: { tableName: "ConsentSignature", rowId: "c1" },
      }),
    ).resolves.toBeUndefined();

    expect(errorSpy).toHaveBeenCalledOnce();
    expect(String(errorSpy.mock.calls[0]?.[0] ?? "")).toContain("INSERT 실패");
  });

  it("supabase insert 예외 throw → console.error + throw X (Promise resolve)", async () => {
    insertMock.mockRejectedValue(new Error("connection lost"));

    await expect(
      recordAudit({
        actorId: "user-1",
        action: "consent_sign",
        target: { tableName: "ConsentSignature", rowId: "c1" },
      }),
    ).resolves.toBeUndefined();

    expect(errorSpy).toHaveBeenCalledOnce();
    expect(String(errorSpy.mock.calls[0]?.[0] ?? "")).toContain("INSERT 예외");
  });

  it("INSERT 실패해도 호출 측 흐름은 차단되지 않음 (await 정상 진행)", async () => {
    insertMock.mockResolvedValue({ error: { message: "deny" } });

    let afterCalled = false;
    await recordAudit({
      actorId: "user-1",
      action: "consent_sign",
      target: { tableName: "ConsentSignature", rowId: "c1" },
    });
    afterCalled = true;

    expect(afterCalled).toBe(true);
  });
});

describe("recordAudit — 시나리오 5: action enum 강제", () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    getSupabaseAdminMock.mockReturnValue(makeAdminClient());
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("허용 action 모두 정상 호출", async () => {
    const actions: AuditAction[] = [
      "sign_in",
      "consent_sign",
      "hitl_assign",
      "reward_grant",
      "config_change",
      "data_export",
      "data_delete",
    ];

    for (const action of actions) {
      insertMock.mockClear();
      await recordAudit({
        actorId: "user-1",
        action,
        target: { tableName: "T", rowId: "r" },
      });
      expect(insertMock).toHaveBeenCalledOnce();
    }
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it("허용 외 action (TS 우회 cast) → console.error + INSERT skip", async () => {
    await recordAudit({
      actorId: "user-1",
      // @ts-expect-error — 의도적 invalid action.
      action: "MALICIOUS_DROP_TABLE",
      target: { tableName: "T", rowId: "r" },
    });

    expect(errorSpy).toHaveBeenCalledOnce();
    expect(String(errorSpy.mock.calls[0]?.[0] ?? "")).toContain("invalid action");
    expect(insertMock).not.toHaveBeenCalled();
  });

  it("빈 string action (TS 우회) → console.error + skip", async () => {
    await recordAudit({
      actorId: "user-1",
      // @ts-expect-error — 의도적 invalid.
      action: "",
      target: { tableName: "T", rowId: "r" },
    });
    expect(errorSpy).toHaveBeenCalledOnce();
    expect(insertMock).not.toHaveBeenCalled();
  });
});
