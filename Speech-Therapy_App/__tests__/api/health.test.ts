// MON-004 — /api/health endpoint 단위 테스트.
// 검증: 정상 응답 shape + DB ping 성공/실패/timeout + env 누락 → degraded + HTTP status 매핑.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const queryRawMock = vi.fn();
vi.mock("@/lib/db", () => ({
  prisma: {
    $queryRaw: (...args: unknown[]) => queryRawMock(...args),
  },
}));

// 정적 import — vi.mock hoist 후 라우트 로드.
import { GET } from "@/app/api/health/route";

describe("/api/health — MON-004 / REQ-NF-007", () => {
  beforeEach(() => {
    queryRawMock.mockReset();
    vi.unstubAllEnvs();
    vi.stubEnv("GOOGLE_GENERATIVE_AI_API_KEY", "fake-ai-key");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://fake.supabase.co");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("모두 정상 → status=healthy, HTTP 200, 응답 shape 일치", async () => {
    queryRawMock.mockResolvedValueOnce([{ "?column?": 1 }]);

    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body).toMatchObject({
      status: "healthy",
      services: {
        db: { status: "up" },
        ai: { status: "up" },
        storage: { status: "up" },
      },
    });
    expect(typeof body.timestamp).toBe("string");
    expect(typeof body.uptimeSec).toBe("number");
    expect(typeof body.latencyMs).toBe("number");
    expect(body.services.db.latencyMs).toBeGreaterThanOrEqual(0);
    expect(res.headers.get("Cache-Control")).toBe("no-store");
  });

  it("DB 실패 → status=unhealthy, HTTP 503, error 메시지 포함", async () => {
    queryRawMock.mockRejectedValueOnce(new Error("connection refused"));

    const res = await GET();
    expect(res.status).toBe(503);
    const body = await res.json();

    expect(body.status).toBe("unhealthy");
    expect(body.services.db.status).toBe("down");
    expect(body.services.db.error).toContain("connection refused");
    // 보조 서비스는 정상.
    expect(body.services.ai.status).toBe("up");
    expect(body.services.storage.status).toBe("up");
  });

  it("AI key 누락 → status=degraded, HTTP 200 (보조 서비스만 down)", async () => {
    queryRawMock.mockResolvedValueOnce([{ "?column?": 1 }]);
    vi.stubEnv("GOOGLE_GENERATIVE_AI_API_KEY", "");

    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.status).toBe("degraded");
    expect(body.services.ai.status).toBe("down");
    expect(body.services.ai.error).toContain("GOOGLE_GENERATIVE_AI_API_KEY");
    expect(body.services.db.status).toBe("up");
  });

  it("Storage URL 누락 → status=degraded, HTTP 200", async () => {
    queryRawMock.mockResolvedValueOnce([{ "?column?": 1 }]);
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");

    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.status).toBe("degraded");
    expect(body.services.storage.status).toBe("down");
  });

  it("DB timeout → unhealthy + 2000ms 초과 메시지 (race condition 검증)", async () => {
    // 결코 resolve 되지 않는 promise → race timer 가 먼저 fire.
    queryRawMock.mockReturnValueOnce(new Promise(() => {}));

    const res = await GET();
    expect(res.status).toBe(503);
    const body = await res.json();

    expect(body.services.db.status).toBe("down");
    expect(body.services.db.error).toMatch(/timeout/i);
    expect(body.services.db.error).toContain("2000ms"); // cold start 대응 timeout
  }, 5000);

  it("error 메시지 100자 트런케이트 — 노출 최소화 (AGENTS.md §2.3)", async () => {
    const longErr = "A".repeat(500);
    queryRawMock.mockRejectedValueOnce(new Error(longErr));

    const res = await GET();
    const body = await res.json();
    expect(body.services.db.error.length).toBeLessThanOrEqual(100);
  });
});
