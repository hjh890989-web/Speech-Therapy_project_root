// TEST-NEW-F15 — chat-cleanup cron (7일 폐기 hard-delete).

import { describe, it, expect, vi, beforeEach } from "vitest";

const verifyMock = vi.fn();
const deleteManyMock = vi.fn();

vi.mock("@/lib/cron-auth", () => ({
  verifyCronSecret: (...a: unknown[]) => verifyMock(...a),
}));
vi.mock("@/lib/db", () => ({
  prisma: { chatMessage: { deleteMany: (...a: unknown[]) => deleteManyMock(...a) } },
}));

import { GET } from "@/app/api/cron/chat-cleanup/route";

function req(): Request {
  return new Request("http://localhost/api/cron/chat-cleanup");
}

beforeEach(() => {
  verifyMock.mockReset();
  deleteManyMock.mockReset();
  verifyMock.mockReturnValue({ ok: true });
  deleteManyMock.mockResolvedValue({ count: 3 });
});

describe("GET /api/cron/chat-cleanup — 7일 폐기", () => {
  it("Cron Secret 미인증 → 401", async () => {
    verifyMock.mockReturnValue({ ok: false, reason: "invalid_authorization" });
    const res = await GET(req());
    expect(res.status).toBe(401);
    expect(deleteManyMock).not.toHaveBeenCalled();
  });

  it("정상 → expiresAt<now hard-delete + 건수 반환", async () => {
    const res = await GET(req());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.deleted).toBe(3);
    const arg = deleteManyMock.mock.calls[0]?.[0] as { where: { expiresAt: { lt: Date } } };
    expect(arg.where.expiresAt.lt).toBeInstanceOf(Date);
  });

  it("DB 실패 → 500 graceful", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    deleteManyMock.mockRejectedValue(new Error("db down"));
    const res = await GET(req());
    expect(res.status).toBe(500);
    expect((await res.json()).error).toBe("INTERNAL_ERROR");
    consoleSpy.mockRestore();
  });
});
