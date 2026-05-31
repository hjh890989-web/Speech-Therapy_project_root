// API-020 — /api/push/dispatch + /api/push/dismiss Route Handler 단위 테스트.
//
// 격리: cron-auth / config / send / prisma(pushSubscription). copy 는 real (순수).

import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  verifyCronMock,
  isEnabledMock,
  findManyMock,
  updateManyMock,
  deleteManyMock,
  sendPushMock,
} = vi.hoisted(() => ({
  verifyCronMock: vi.fn(),
  isEnabledMock: vi.fn(),
  findManyMock: vi.fn(),
  updateManyMock: vi.fn(),
  deleteManyMock: vi.fn(),
  sendPushMock: vi.fn(),
}));

vi.mock("@/lib/cron-auth", () => ({
  verifyCronSecret: (...a: unknown[]) => verifyCronMock(...a),
}));
vi.mock("@/lib/push/config", () => ({
  isF16PushEnabled: () => isEnabledMock(),
}));
vi.mock("@/lib/push/send", () => ({
  sendPush: (...a: unknown[]) => sendPushMock(...a),
}));
vi.mock("@/lib/db", () => ({
  prisma: {
    pushSubscription: {
      findMany: (...a: unknown[]) => findManyMock(...a),
      updateMany: (...a: unknown[]) => updateManyMock(...a),
      deleteMany: (...a: unknown[]) => deleteManyMock(...a),
    },
  },
}));

import { GET } from "@/app/api/push/dispatch/route";
import { POST } from "@/app/api/push/dismiss/route";

function dispatchReq(): Request {
  return new Request("http://localhost/api/push/dispatch");
}
function dismissReq(body: unknown): Request {
  return new Request("http://localhost/api/push/dismiss", {
    method: "POST",
    body: typeof body === "string" ? body : JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

beforeEach(() => {
  verifyCronMock.mockReset();
  isEnabledMock.mockReset();
  findManyMock.mockReset();
  updateManyMock.mockReset();
  deleteManyMock.mockReset();
  sendPushMock.mockReset();
  verifyCronMock.mockReturnValue({ ok: true });
  isEnabledMock.mockReturnValue(true);
  findManyMock.mockResolvedValue([]);
  updateManyMock.mockResolvedValue({ count: 0 });
  deleteManyMock.mockResolvedValue({ count: 0 });
  sendPushMock.mockResolvedValue({ ok: true, statusCode: 201 });
});

describe("/api/push/dispatch — API-020", () => {
  it("CRON_SECRET 실패 → 401 (DB 미조회)", async () => {
    verifyCronMock.mockReturnValue({ ok: false, reason: "invalid_authorization" });
    const res = await GET(dispatchReq());
    expect(res.status).toBe(401);
    expect(findManyMock).not.toHaveBeenCalled();
  });

  it("F16 게이트 off → 200 skipped (DB 미조회)", async () => {
    isEnabledMock.mockReturnValue(false);
    const res = await GET(dispatchReq());
    const json = await res.json();
    expect(json).toMatchObject({ skipped: true, reason: "disabled", sentCount: 0 });
    expect(findManyMock).not.toHaveBeenCalled();
  });

  it("구독 0건 → sentCount/scannedCount 0", async () => {
    const res = await GET(dispatchReq());
    const json = await res.json();
    expect(json.sentCount).toBe(0);
    expect(json.scannedCount).toBe(0);
  });

  it("dismissCount 임계 필터 (where dismissCount < 5)", async () => {
    await GET(dispatchReq());
    expect(findManyMock.mock.calls[0][0].where).toEqual({
      dismissCount: { lt: 5 },
    });
  });

  it("발송 — ok→updateMany(lastSentAt), gone→deleteMany, 500→errors", async () => {
    findManyMock.mockResolvedValue([
      { id: "s1", endpoint: "e1", p256dh: "p", auth: "a" },
      { id: "s2", endpoint: "e2", p256dh: "p", auth: "a" },
      { id: "s3", endpoint: "e3", p256dh: "p", auth: "a" },
    ]);
    sendPushMock
      .mockResolvedValueOnce({ ok: true, statusCode: 201 })
      .mockResolvedValueOnce({ ok: false, gone: true, statusCode: 410 })
      .mockResolvedValueOnce({ ok: false, error: "boom", statusCode: 500 });

    const res = await GET(dispatchReq());
    const json = await res.json();
    expect(json.sentCount).toBe(1);
    expect(json.goneCount).toBe(1);
    expect(json.errors).toHaveLength(1);
    expect(updateManyMock).toHaveBeenCalledWith({
      where: { id: { in: ["s1"] } },
      data: { lastSentAt: expect.any(Date) },
    });
    expect(deleteManyMock).toHaveBeenCalledWith({
      where: { id: { in: ["s2"] } },
    });
  });

  it("skipped 결과는 errors 에 미포함", async () => {
    findManyMock.mockResolvedValue([
      { id: "s1", endpoint: "e1", p256dh: "p", auth: "a" },
    ]);
    sendPushMock.mockResolvedValue({ ok: false, skipped: true });
    const res = await GET(dispatchReq());
    const json = await res.json();
    expect(json.errors).toHaveLength(0);
    expect(json.sentCount).toBe(0);
  });
});

describe("/api/push/dismiss — API-020", () => {
  it("비 JSON body → 400", async () => {
    const res = await POST(dismissReq("not json"));
    expect(res.status).toBe(400);
  });

  it("endpoint 누락 → 400", async () => {
    const res = await POST(dismissReq({ foo: "bar" }));
    expect(res.status).toBe(400);
  });

  it("정상 → dismissCount increment + updated count", async () => {
    updateManyMock.mockResolvedValue({ count: 1 });
    const res = await POST(dismissReq({ endpoint: "https://push.example/abc" }));
    const json = await res.json();
    expect(json.updated).toBe(1);
    const arg = updateManyMock.mock.calls[0][0];
    expect(arg.where).toEqual({ endpoint: "https://push.example/abc" });
    expect(arg.data).toEqual({ dismissCount: { increment: 1 } });
  });
});
