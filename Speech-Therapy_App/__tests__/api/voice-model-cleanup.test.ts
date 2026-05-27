// TEST-019 (b) — F11 7일 폐기 Cron 통합 테스트 (V07 ADR-03).
//
// 시나리오:
//   1) Cron Secret 누락 → 401
//   2) 만료 row 0건 → 200 + processed=0
//   3) 정상 cleanup — ElevenLabs DELETE 성공 + deletedAt UPDATE
//   4) ElevenLabs DELETE 실패 row → deletedAt 미업데이트 + 다음 Cron 재시도 대상
//   5) ELEVENLABS_API_KEY 미설정 (skipped) → deletedAt 만 UPDATE (사용자 측 cleanup)
//   6) Prisma error → 500
//   7) 텔레메트리 console.log shape

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mocks
vi.mock("@/lib/cron-auth", () => ({
  verifyCronSecret: (request: Request) => {
    const auth = request.headers.get("authorization");
    if (auth === "Bearer test-cron-secret") return { ok: true };
    return { ok: false, reason: "invalid_authorization" };
  },
}));

const findManyMock = vi.fn();
const updateMock = vi.fn();
vi.mock("@/lib/db", () => ({
  prisma: {
    voiceModel: {
      findMany: (args: unknown) => findManyMock(args),
      update: (args: unknown) => updateMock(args),
    },
  },
}));

const deleteVoiceMock = vi.fn();
vi.mock("@/lib/voice-clone/elevenlabs-client", () => ({
  deleteVoice: (voiceId: string) => deleteVoiceMock(voiceId),
}));

import { GET } from "@/app/api/cron/voice-model-cleanup/route";

beforeEach(() => {
  findManyMock.mockReset();
  updateMock.mockReset();
  deleteVoiceMock.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

function makeRequest(authorization: string | null = "Bearer test-cron-secret"): Request {
  const headers = new Headers();
  if (authorization) headers.set("authorization", authorization);
  return new Request("http://localhost/api/cron/voice-model-cleanup", { headers });
}

describe("FR-C-027 — voice-model-cleanup Cron", () => {
  it("[1] Cron Secret 누락 → 401", async () => {
    const response = await GET(makeRequest(null));
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe("UNAUTHORIZED");
  });

  it("[2] 만료 row 0건 → 200 + processed=0", async () => {
    findManyMock.mockResolvedValue([]);
    const response = await GET(makeRequest());
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.ok).toBe(true);
    expect(body.processed).toBe(0);
    expect(body.deleted).toBe(0);
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("[3] 정상 cleanup — 3 row 모두 ElevenLabs DELETE 성공 + deletedAt UPDATE", async () => {
    findManyMock.mockResolvedValue([
      { id: "vm-1", modelHash: "voice-1" },
      { id: "vm-2", modelHash: "voice-2" },
      { id: "vm-3", modelHash: "voice-3" },
    ]);
    deleteVoiceMock.mockResolvedValue({ ok: true });

    const response = await GET(makeRequest());
    const body = await response.json();
    expect(body.ok).toBe(true);
    expect(body.processed).toBe(3);
    expect(body.deleted).toBe(3);
    expect(body.failed).toBe(0);
    expect(deleteVoiceMock).toHaveBeenCalledTimes(3);
    expect(updateMock).toHaveBeenCalledTimes(3);
    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "vm-1" },
        data: { deletedAt: expect.any(Date) },
      }),
    );
  });

  it("[4] ElevenLabs DELETE 실패 row → deletedAt 미업데이트 + failed 카운트", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    findManyMock.mockResolvedValue([
      { id: "vm-1", modelHash: "voice-1" }, // 성공
      { id: "vm-2", modelHash: "voice-2" }, // 실패 (HTTP 500)
      { id: "vm-3", modelHash: "voice-3" }, // 성공
    ]);
    deleteVoiceMock
      .mockResolvedValueOnce({ ok: true })
      .mockResolvedValueOnce({ ok: false, error: "HTTP 500" })
      .mockResolvedValueOnce({ ok: true });

    const response = await GET(makeRequest());
    const body = await response.json();
    expect(body.processed).toBe(3);
    expect(body.deleted).toBe(2);
    expect(body.failed).toBe(1);
    // 실패 row 의 update 호출 안 함 — 2건만 UPDATE.
    expect(updateMock).toHaveBeenCalledTimes(2);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("[FR-C-027]"),
      "voice-2",
      "HTTP 500",
    );
    warnSpy.mockRestore();
  });

  it("[5] ELEVENLABS_API_KEY 미설정 (skipped) → deletedAt 만 UPDATE", async () => {
    findManyMock.mockResolvedValue([
      { id: "vm-1", modelHash: "voice-1" },
      { id: "vm-2", modelHash: "voice-2" },
    ]);
    deleteVoiceMock.mockResolvedValue({
      ok: false,
      skipped: true,
      error: "ELEVENLABS_API_KEY not set",
    });

    const response = await GET(makeRequest());
    const body = await response.json();
    expect(body.processed).toBe(2);
    expect(body.elevenlabsSkipped).toBe(2);
    expect(body.deleted).toBe(0);
    expect(body.failed).toBe(0);
    // skipped 도 deletedAt UPDATE (사용자 측 책임 표식).
    expect(updateMock).toHaveBeenCalledTimes(2);
  });

  it("[6] Prisma error → 500", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    findManyMock.mockRejectedValue(new Error("DB connection lost"));

    const response = await GET(makeRequest());
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toBe("INTERNAL_ERROR");
    errorSpy.mockRestore();
  });

  it("[7] 텔레메트리 console.log shape — R4 정합", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    findManyMock.mockResolvedValue([
      { id: "vm-1", modelHash: "voice-secret-id" },
    ]);
    deleteVoiceMock.mockResolvedValue({ ok: true });

    await GET(makeRequest());

    const logCalls = logSpy.mock.calls.map((c) => String(c[0]));
    const eventLog = logCalls.find((s) => s.includes("voice_model_cleanup"));
    expect(eventLog).toBeDefined();
    if (eventLog) {
      const parsed = JSON.parse(eventLog);
      expect(parsed.event).toBe("voice_model_cleanup");
      expect(parsed.properties.processed).toBe(1);
      expect(parsed.properties.deleted).toBe(1);
      // R4: modelHash / userId 미노출
      expect(JSON.stringify(parsed)).not.toContain("voice-secret-id");
      expect(JSON.stringify(parsed)).not.toMatch(/userId|email/i);
    }
    logSpy.mockRestore();
  });
});
