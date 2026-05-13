// FR-C-004 + INFRA-002 — audio-cleanup Cron 라우트 단위 테스트.
// D6 정책 (음성 미저장) 검증 + Storage purge 분기 검증.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const updateManyMock = vi.fn();
const getSupabaseAdminMock = vi.fn();
const storageListMock = vi.fn();
const storageRemoveMock = vi.fn();

vi.mock("@/lib/db", () => ({
  prisma: {
    sessionLog: {
      updateMany: (...args: unknown[]) => updateManyMock(...args),
    },
  },
}));

vi.mock("@/lib/supabase/admin", () => ({
  getSupabaseAdmin: () => getSupabaseAdminMock(),
}));

// 정적 import — vi.mock 은 hoist 되므로 mock 적용 후 라우트 로드.
import { GET } from "@/app/api/cron/audio-cleanup/route";

function makeStorageClient() {
  return {
    storage: {
      from: () => ({
        list: storageListMock,
        remove: storageRemoveMock,
      }),
    },
  };
}

function makeRequest(headers: Record<string, string> = {}): Request {
  return new Request("http://localhost/api/cron/audio-cleanup", { headers });
}

beforeEach(() => {
  updateManyMock.mockReset();
  getSupabaseAdminMock.mockReset();
  storageListMock.mockReset();
  storageRemoveMock.mockReset();
  vi.stubEnv("CRON_SECRET", "test-secret");
  vi.stubEnv("VERCEL_ENV", "production");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("GET /api/cron/audio-cleanup — auth", () => {
  it("CRON_SECRET 헤더 누락 시 401", async () => {
    const res = await GET(makeRequest());
    expect(res.status).toBe(401);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("UNAUTHORIZED");
  });

  it("잘못된 Bearer 값 시 401", async () => {
    const res = await GET(makeRequest({ authorization: "Bearer wrong" }));
    expect(res.status).toBe(401);
  });
});

describe("GET /api/cron/audio-cleanup — D6 no-op 동작", () => {
  it("Storage admin 미설정 + 0 row → 200 + skipped_no_admin_client", async () => {
    updateManyMock.mockResolvedValue({ count: 0 });
    getSupabaseAdminMock.mockReturnValue(null);

    const res = await GET(makeRequest({ authorization: "Bearer test-secret" }));
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      deletedRows: number;
      deletedObjects: number;
      storageStatus: string;
      discope: string;
    };
    expect(body.deletedRows).toBe(0);
    expect(body.deletedObjects).toBe(0);
    expect(body.storageStatus).toBe("skipped_no_admin_client");
    expect(body.discope).toBe("D6");
  });

  it("Storage 버킷 미존재 시 graceful skip", async () => {
    updateManyMock.mockResolvedValue({ count: 0 });
    getSupabaseAdminMock.mockReturnValue(makeStorageClient());
    storageListMock.mockResolvedValue({
      data: null,
      error: { message: "Bucket not found" },
    });

    const res = await GET(makeRequest({ authorization: "Bearer test-secret" }));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { storageStatus: string; deletedObjects: number };
    expect(body.storageStatus).toBe("skipped_bucket_missing");
    expect(body.deletedObjects).toBe(0);
  });
});

describe("GET /api/cron/audio-cleanup — P2 활성 시 7일 퍼지 (시뮬레이션)", () => {
  it("7일 초과 객체만 삭제 대상에 포함", async () => {
    updateManyMock.mockResolvedValue({ count: 3 });
    getSupabaseAdminMock.mockReturnValue(makeStorageClient());

    const now = Date.now();
    const oldDate = new Date(now - 10 * 24 * 60 * 60 * 1000).toISOString();
    const recentDate = new Date(now - 1 * 24 * 60 * 60 * 1000).toISOString();

    storageListMock.mockResolvedValue({
      data: [
        { name: "old-1.webm", created_at: oldDate },
        { name: "old-2.webm", created_at: oldDate },
        { name: "fresh.webm", created_at: recentDate },
      ],
      error: null,
    });
    storageRemoveMock.mockResolvedValue({ error: null });

    const res = await GET(makeRequest({ authorization: "Bearer test-secret" }));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { deletedRows: number; deletedObjects: number };
    expect(body.deletedRows).toBe(3);
    expect(body.deletedObjects).toBe(2);

    expect(storageRemoveMock).toHaveBeenCalledTimes(1);
    const removed = storageRemoveMock.mock.calls[0][0] as string[];
    expect(removed).toEqual(["old-1.webm", "old-2.webm"]);
  });

  it("7일 이내 객체만 존재하면 remove 호출 0회", async () => {
    updateManyMock.mockResolvedValue({ count: 0 });
    getSupabaseAdminMock.mockReturnValue(makeStorageClient());
    const recent = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString();
    storageListMock.mockResolvedValue({
      data: [{ name: "fresh.webm", created_at: recent }],
      error: null,
    });

    const res = await GET(makeRequest({ authorization: "Bearer test-secret" }));
    expect(res.status).toBe(200);
    expect(storageRemoveMock).not.toHaveBeenCalled();
    const body = (await res.json()) as { deletedObjects: number; storageStatus: string };
    expect(body.deletedObjects).toBe(0);
    expect(body.storageStatus).toBe("ok");
  });
});
