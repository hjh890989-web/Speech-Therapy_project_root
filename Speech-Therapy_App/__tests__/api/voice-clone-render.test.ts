// TEST-019 (c) — F11 /api/voice-clone/render 통합 테스트 (V07 ADR-09).
//
// 시나리오:
//   1) 비로그인 → 401
//   2) Zod 실패 (text 빈) → 400
//   3) ADR-09 윤리 위반 (contentType = "exercise") → 403 + VOICE_ETHICS_VIOLATION
//   4) VoiceModel 미존재 → 404
//   5) 다른 user 의 VoiceModel → 403 FORBIDDEN
//   6) 만료 VoiceModel → 410 EXPIRED
//   7) soft deleted VoiceModel → 410 DELETED
//   8) appliedContentTypes 미포함 contentType → 403 CONTENT_TYPE_NOT_ALLOWED
//   9) 정상 — ElevenLabs synthesize 성공 → audio/mpeg + Cache-Control
//  10) ElevenLabs skipped → 503

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mocks
const getUserMock = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  getSupabaseServerClient: async () => ({
    auth: { getUser: () => getUserMock() },
  }),
}));

const findUniqueMock = vi.fn();
vi.mock("@/lib/db", () => ({
  prisma: {
    voiceModel: {
      findUnique: (args: unknown) => findUniqueMock(args),
    },
  },
}));

const synthesizeMock = vi.fn();
vi.mock("@/lib/voice-clone/elevenlabs-client", () => ({
  synthesize: (args: unknown) => synthesizeMock(args),
}));

import { POST } from "@/app/api/voice-clone/render/route";

const PARENT_ID = "pppppppp-pppp-4ppp-8ppp-pppppppppppp";
const VOICE_MODEL_ID = "vm-1";

beforeEach(() => {
  getUserMock.mockReset();
  findUniqueMock.mockReset();
  synthesizeMock.mockReset();
  // default: 인증 OK
  getUserMock.mockResolvedValue({ data: { user: { id: PARENT_ID } }, error: null });
});

afterEach(() => {
  vi.restoreAllMocks();
});

function makeRequest(body: unknown): Request {
  return new Request("http://localhost/api/voice-clone/render", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("FR-C-027 — /api/voice-clone/render", () => {
  it("[1] 비로그인 → 401", async () => {
    getUserMock.mockResolvedValue({ data: { user: null }, error: null });
    const response = await POST(
      makeRequest({ voiceModelId: VOICE_MODEL_ID, contentType: "storybook", text: "ok" }),
    );
    expect(response.status).toBe(401);
  });

  it("[2] Zod 실패 (text 빈) → 400", async () => {
    const response = await POST(
      makeRequest({ voiceModelId: VOICE_MODEL_ID, contentType: "storybook", text: "" }),
    );
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("INVALID_INPUT");
  });

  it("[3] ADR-09 윤리 위반 (contentType='exercise') → 403 VOICE_ETHICS_VIOLATION", async () => {
    const response = await POST(
      makeRequest({ voiceModelId: VOICE_MODEL_ID, contentType: "exercise", text: "발음 연습" }),
    );
    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.error).toBe("VOICE_ETHICS_VIOLATION");
    expect(body.contentType).toBe("exercise");
    // DB 조회 자체를 차단 — 윤리 가드가 1차 layer.
    expect(findUniqueMock).not.toHaveBeenCalled();
    expect(synthesizeMock).not.toHaveBeenCalled();
  });

  it("[3b] correction / diagnose / therapy 도 차단", async () => {
    for (const ct of ["correction", "diagnose", "therapy"]) {
      const response = await POST(
        makeRequest({ voiceModelId: VOICE_MODEL_ID, contentType: ct, text: "ok" }),
      );
      expect(response.status).toBe(403);
    }
  });

  it("[4] VoiceModel 미존재 → 404", async () => {
    findUniqueMock.mockResolvedValue(null);
    const response = await POST(
      makeRequest({ voiceModelId: "missing", contentType: "storybook", text: "ok" }),
    );
    expect(response.status).toBe(404);
  });

  it("[5] 다른 user 의 VoiceModel → 403 FORBIDDEN", async () => {
    findUniqueMock.mockResolvedValue({
      userId: "other-user",
      modelHash: "voice-1",
      expiresAt: new Date(Date.now() + 1_000_000),
      deletedAt: null,
      appliedContentTypes: ["storybook"],
    });
    const response = await POST(
      makeRequest({ voiceModelId: VOICE_MODEL_ID, contentType: "storybook", text: "ok" }),
    );
    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.error).toBe("FORBIDDEN");
  });

  it("[6] 만료 VoiceModel → 410 EXPIRED", async () => {
    findUniqueMock.mockResolvedValue({
      userId: PARENT_ID,
      modelHash: "voice-1",
      expiresAt: new Date(Date.now() - 1_000), // 이미 만료
      deletedAt: null,
      appliedContentTypes: ["storybook"],
    });
    const response = await POST(
      makeRequest({ voiceModelId: VOICE_MODEL_ID, contentType: "storybook", text: "ok" }),
    );
    expect(response.status).toBe(410);
    const body = await response.json();
    expect(body.error).toBe("EXPIRED");
  });

  it("[7] soft deleted VoiceModel → 410 DELETED", async () => {
    findUniqueMock.mockResolvedValue({
      userId: PARENT_ID,
      modelHash: "voice-1",
      expiresAt: new Date(Date.now() + 1_000_000),
      deletedAt: new Date(),
      appliedContentTypes: ["storybook"],
    });
    const response = await POST(
      makeRequest({ voiceModelId: VOICE_MODEL_ID, contentType: "storybook", text: "ok" }),
    );
    expect(response.status).toBe(410);
    const body = await response.json();
    expect(body.error).toBe("DELETED");
  });

  it("[8] appliedContentTypes 미포함 contentType → 403 CONTENT_TYPE_NOT_ALLOWED", async () => {
    findUniqueMock.mockResolvedValue({
      userId: PARENT_ID,
      modelHash: "voice-1",
      expiresAt: new Date(Date.now() + 1_000_000),
      deletedAt: null,
      appliedContentTypes: ["lullaby"], // storybook 미포함
    });
    const response = await POST(
      makeRequest({ voiceModelId: VOICE_MODEL_ID, contentType: "storybook", text: "ok" }),
    );
    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.error).toBe("CONTENT_TYPE_NOT_ALLOWED");
  });

  it("[9] 정상 — ElevenLabs synthesize 성공 → audio/mpeg + Cache-Control", async () => {
    findUniqueMock.mockResolvedValue({
      userId: PARENT_ID,
      modelHash: "voice-1",
      expiresAt: new Date(Date.now() + 1_000_000),
      deletedAt: null,
      appliedContentTypes: ["storybook", "lullaby"],
    });
    const fakeAudio = new ArrayBuffer(1024);
    synthesizeMock.mockResolvedValue({ ok: true, data: fakeAudio });

    const response = await POST(
      makeRequest({ voiceModelId: VOICE_MODEL_ID, contentType: "storybook", text: "안녕" }),
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("audio/mpeg");
    expect(response.headers.get("Cache-Control")).toContain("max-age=3600");
  });

  it("[10] ElevenLabs skipped → 503", async () => {
    findUniqueMock.mockResolvedValue({
      userId: PARENT_ID,
      modelHash: "voice-1",
      expiresAt: new Date(Date.now() + 1_000_000),
      deletedAt: null,
      appliedContentTypes: ["storybook"],
    });
    synthesizeMock.mockResolvedValue({
      ok: false,
      skipped: true,
      error: "ELEVENLABS_API_KEY not set",
    });
    const response = await POST(
      makeRequest({ voiceModelId: VOICE_MODEL_ID, contentType: "storybook", text: "ok" }),
    );
    expect(response.status).toBe(503);
    const body = await response.json();
    expect(body.error).toBe("ELEVENLABS_SKIPPED");
  });
});
