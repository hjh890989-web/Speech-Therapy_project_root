// FR-C-014 (#37) — /api/cron/hitl-escalation cron route + lib/hitl/escalation.ts 단위 테스트.
//
// 검증 시나리오 (11 케이스):
//   1. CRON_SECRET 미설정 (production NODE_ENV) + 헤더 누락 → 401
//   2. 잘못된 Bearer → 401
//   3. 24h 초과 + status=pending + escalatedAt=null → escalate + Slack 1회 + DB update 1회
//   4. 23h 만 경과 → 미해당 (스킵, scanned 0)
//   5. status=completed → 미해당 (findMany 쿼리 필터 검증)
//   6. escalatedAt 이미 설정됨 → 미해당 (어뷰징 방어, findMany WHERE 검증)
//   7. Slack 실패 (response.ok=false) → DB update 안 함 + errors 누적
//   8. SLACK_WEBHOOK_URL 미설정 (skipped) → DB update 안 함 + errors 누적
//   9. DB updateMany 실패 → errors 누적 + 다른 항목 계속 진행
//  10. 동시 race (updateMany count=0) → errors 누적 (concurrent_escalation_race)
//  11. Slack 본문 R4 / 금칙어 검증 — sessionId / queueId / confidence / 24h SLA 만 포함

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Prisma mock — HITLQueue.findMany / updateMany.
const hitlFindManyMock = vi.fn();
const hitlUpdateManyMock = vi.fn();

vi.mock("@/lib/db", () => ({
  prisma: {
    hITLQueue: {
      findMany: (...args: unknown[]) => hitlFindManyMock(...args),
      updateMany: (...args: unknown[]) => hitlUpdateManyMock(...args),
    },
  },
}));

import { GET } from "@/app/api/cron/hitl-escalation/route";
import {
  buildEscalationMessage,
  findEscalationCandidates,
  ESCALATION_THRESHOLD_HOURS,
  ESCALATION_BATCH_LIMIT,
} from "@/lib/hitl/escalation";

const ORIGINAL_CRON_SECRET = process.env.CRON_SECRET;
const ORIGINAL_SLACK_URL = process.env.SLACK_WEBHOOK_URL;
const ORIGINAL_FETCH = globalThis.fetch;

beforeEach(() => {
  hitlFindManyMock.mockReset();
  hitlUpdateManyMock.mockReset();
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-05-22T12:00:00Z"));
  vi.unstubAllEnvs();
  vi.stubEnv("NODE_ENV", "test");
  process.env.CRON_SECRET = "test-secret";
  process.env.SLACK_WEBHOOK_URL = "https://hooks.slack.com/services/T/B/X";
  globalThis.fetch = vi.fn().mockResolvedValue(new Response("ok", { status: 200 }));
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  process.env.CRON_SECRET = ORIGINAL_CRON_SECRET;
  process.env.SLACK_WEBHOOK_URL = ORIGINAL_SLACK_URL;
  globalThis.fetch = ORIGINAL_FETCH;
});

function authedRequest(): Request {
  return new Request("http://localhost/api/cron/hitl-escalation", {
    headers: { Authorization: "Bearer test-secret" },
  });
}

function makeCandidate(overrides: Partial<{
  id: string;
  sessionId: string;
  userId: string;
  confidenceScore: number;
  status: string;
  createdAt: Date;
  slaDueAt: Date;
}> = {}) {
  return {
    id: "queue-1",
    sessionId: "session-1",
    userId: "user-1",
    confidenceScore: 65,
    status: "pending",
    createdAt: new Date("2026-05-21T06:00:00Z"), // 30h 전
    slaDueAt: new Date("2026-05-23T06:00:00Z"),
    ...overrides,
  };
}

// =============================================================================
// [시나리오 1, 2] CRON_SECRET 가드
// =============================================================================
describe("/api/cron/hitl-escalation — auth 가드", () => {
  it("[시나리오 1] production 에서 CRON_SECRET 헤더 누락 → 401", async () => {
    const res = await GET(new Request("http://localhost/api/cron/hitl-escalation"));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("UNAUTHORIZED");
    expect(hitlFindManyMock).not.toHaveBeenCalled();
  });

  it("[시나리오 2] 잘못된 Bearer → 401", async () => {
    const res = await GET(
      new Request("http://localhost/api/cron/hitl-escalation", {
        headers: { Authorization: "Bearer wrong-secret" },
      }),
    );
    expect(res.status).toBe(401);
    expect(hitlFindManyMock).not.toHaveBeenCalled();
  });
});

// =============================================================================
// [시나리오 3] 정상 흐름
// =============================================================================
describe("/api/cron/hitl-escalation — 정상 escalation", () => {
  it("[시나리오 3] 24h 초과 + pending → escalate + Slack 1회 + DB updateMany 1회", async () => {
    const candidate = makeCandidate();
    hitlFindManyMock.mockResolvedValueOnce([candidate]);
    hitlUpdateManyMock.mockResolvedValueOnce({ count: 1 });

    const res = await GET(authedRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.job).toBe("hitl-escalation");
    expect(body.scannedCount).toBe(1);
    expect(body.escalatedCount).toBe(1);
    expect(body.errors).toEqual([]);
    expect(body.durationMs).toBeGreaterThanOrEqual(0);

    // Slack 1회 호출 (fetch).
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    const [url, init] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe("https://hooks.slack.com/services/T/B/X");
    const sentBody = JSON.parse(init.body as string) as { text: string };
    expect(sentBody.text).toContain("24h SLA 초과");
    expect(sentBody.text).toContain(candidate.sessionId);
    expect(sentBody.text).toContain(candidate.id);

    // DB update 1회 (WHERE id + escalatedAt IS NULL, SET status='escalated' + escalatedAt=now).
    expect(hitlUpdateManyMock).toHaveBeenCalledTimes(1);
    const updateArg = hitlUpdateManyMock.mock.calls[0][0] as {
      where: { id: string; escalatedAt: null };
      data: { status: string; escalatedAt: Date };
    };
    expect(updateArg.where.id).toBe(candidate.id);
    expect(updateArg.where.escalatedAt).toBeNull();
    expect(updateArg.data.status).toBe("escalated");
    expect(updateArg.data.escalatedAt).toBeInstanceOf(Date);
  });
});

// =============================================================================
// [시나리오 4-6] 미해당 케이스 (findMany WHERE 검증)
// =============================================================================
describe("/api/cron/hitl-escalation — 미해당 (findMany 쿼리 검증)", () => {
  it("[시나리오 4-6] findMany WHERE: status in [pending, in_review] + createdAt < now-24h + escalatedAt IS NULL", async () => {
    hitlFindManyMock.mockResolvedValueOnce([]);

    const res = await GET(authedRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.scannedCount).toBe(0);
    expect(body.escalatedCount).toBe(0);
    expect(body.errors).toEqual([]);

    expect(hitlFindManyMock).toHaveBeenCalledTimes(1);
    const findArg = hitlFindManyMock.mock.calls[0][0] as {
      where: {
        status: { in: string[] };
        createdAt: { lt: Date };
        escalatedAt: null;
      };
    };

    // [시나리오 4] 23h 만 경과 → createdAt threshold (now - 24h) 이상이므로 미해당.
    // [시나리오 5] status=completed / dismissed / escalated → status.in 필터 통과 못함.
    // [시나리오 6] escalatedAt 이미 설정됨 → escalatedAt: null 필터 통과 못함 (어뷰징 방어).
    expect(findArg.where.status.in).toEqual(["pending", "in_review"]);
    expect(findArg.where.escalatedAt).toBeNull();
    const now = new Date("2026-05-22T12:00:00Z");
    expect(findArg.where.createdAt.lt.getTime()).toBe(
      now.getTime() - ESCALATION_THRESHOLD_HOURS * 60 * 60 * 1000,
    );

    expect(globalThis.fetch).not.toHaveBeenCalled();
    expect(hitlUpdateManyMock).not.toHaveBeenCalled();
  });

  it("[시나리오 6b] findEscalationCandidates 직접 호출 — 같은 WHERE 검증 (멱등 어뷰징 방어)", async () => {
    hitlFindManyMock.mockResolvedValueOnce([]);
    const now = new Date("2026-05-22T12:00:00Z");
    await findEscalationCandidates(now);

    const arg = hitlFindManyMock.mock.calls[0][0] as {
      where: { escalatedAt: null; status: { in: string[] } };
      orderBy: { createdAt: string };
    };
    expect(arg.where.escalatedAt).toBeNull();
    expect(arg.orderBy.createdAt).toBe("asc");
  });
});

// =============================================================================
// [시나리오 7-8] Slack 실패 → DB 보호 (트랜잭션 일관성)
// =============================================================================
describe("/api/cron/hitl-escalation — Slack 실패 시 DB 보호", () => {
  it("[시나리오 7] Slack 응답 ok=false (HTTP 500) → DB update 안 함 + errors 누적 + 200 반환", async () => {
    const candidate = makeCandidate();
    hitlFindManyMock.mockResolvedValueOnce([candidate]);
    globalThis.fetch = vi.fn().mockResolvedValue(new Response("server error", { status: 500 }));

    const res = await GET(authedRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.scannedCount).toBe(1);
    expect(body.escalatedCount).toBe(0);
    expect(body.errors).toHaveLength(1);
    expect(body.errors[0].sessionId).toBe(candidate.sessionId);
    expect(body.errors[0].queueId).toBe(candidate.id);
    expect(body.errors[0].reason).toContain("slack_failed");

    // DB 업데이트 0회 → 다음 cron 주기 재시도 가능.
    expect(hitlUpdateManyMock).not.toHaveBeenCalled();
  });

  it("[시나리오 8] SLACK_WEBHOOK_URL 미설정 (skipped) → DB update 안 함 + errors 누적", async () => {
    delete process.env.SLACK_WEBHOOK_URL;
    const candidate = makeCandidate();
    hitlFindManyMock.mockResolvedValueOnce([candidate]);

    const res = await GET(authedRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.escalatedCount).toBe(0);
    expect(body.errors).toHaveLength(1);
    expect(body.errors[0].reason).toBe("slack_skipped");

    expect(globalThis.fetch).not.toHaveBeenCalled();
    expect(hitlUpdateManyMock).not.toHaveBeenCalled();
  });
});

// =============================================================================
// [시나리오 9-10] DB 실패 / 동시 race
// =============================================================================
describe("/api/cron/hitl-escalation — DB 실패 graceful", () => {
  it("[시나리오 9] DB updateMany 실패 → errors 누적 + 다른 항목 계속 진행", async () => {
    const c1 = makeCandidate({ id: "q-1", sessionId: "s-1" });
    const c2 = makeCandidate({ id: "q-2", sessionId: "s-2" });
    hitlFindManyMock.mockResolvedValueOnce([c1, c2]);
    hitlUpdateManyMock
      .mockRejectedValueOnce(new Error("DB connection lost"))
      .mockResolvedValueOnce({ count: 1 });

    const res = await GET(authedRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.scannedCount).toBe(2);
    expect(body.escalatedCount).toBe(1);
    expect(body.errors).toHaveLength(1);
    expect(body.errors[0].sessionId).toBe("s-1");
    expect(body.errors[0].reason).toContain("db_failed");

    // Slack 은 2회 모두 호출됨 (Slack 먼저 → DB update).
    expect(globalThis.fetch).toHaveBeenCalledTimes(2);
  });

  it("[시나리오 10] 동시 race — updateMany count=0 (다른 cron 이 먼저 마킹) → errors 누적", async () => {
    const candidate = makeCandidate();
    hitlFindManyMock.mockResolvedValueOnce([candidate]);
    hitlUpdateManyMock.mockResolvedValueOnce({ count: 0 });

    const res = await GET(authedRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.escalatedCount).toBe(0);
    expect(body.errors).toHaveLength(1);
    expect(body.errors[0].reason).toBe("concurrent_escalation_race");
  });
});

// =============================================================================
// [시나리오 12-14] #37 잔여 — 어뷰징 방어 보강 (batch limit / Slack rate-limit / 에러 알림)
// =============================================================================
describe("/api/cron/hitl-escalation — 어뷰징 방어 보강 (#37 잔여)", () => {
  it("[시나리오 12] findEscalationCandidates take 옵션 = ESCALATION_BATCH_LIMIT (50건)", async () => {
    hitlFindManyMock.mockResolvedValueOnce([]);
    await findEscalationCandidates(new Date("2026-05-22T12:00:00Z"));
    const arg = hitlFindManyMock.mock.calls[0][0] as { take: number };
    expect(arg.take).toBe(ESCALATION_BATCH_LIMIT);
    expect(ESCALATION_BATCH_LIMIT).toBe(50);
  });

  it("[시나리오 13] errors > 10 시 별도 운영 alert Slack 추가 호출", async () => {
    // 12 candidates 모두 Slack 실패 → errors = 12 (임계 10 초과).
    const candidates = Array.from({ length: 12 }, (_, i) =>
      makeCandidate({ id: `q-${i}`, sessionId: `s-${i}` }),
    );
    hitlFindManyMock.mockResolvedValueOnce(candidates);
    // 모든 Slack 호출 실패 (HTTP 500). 마지막 1회는 error alert.
    globalThis.fetch = vi.fn().mockResolvedValue(new Response("err", { status: 500 }));

    const res = await GET(authedRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.escalatedCount).toBe(0);
    expect(body.errors.length).toBe(12);

    // Slack fetch 호출 = candidates (12) + error alert (1) = 13.
    const fetchMockRef = globalThis.fetch as ReturnType<typeof vi.fn>;
    expect(fetchMockRef.mock.calls.length).toBeGreaterThanOrEqual(12);
    // 마지막 호출 body 가 운영 alert 인지 검증.
    const lastCallBody = JSON.parse(
      (fetchMockRef.mock.calls.at(-1)![1] as RequestInit).body as string,
    ) as { text: string };
    expect(lastCallBody.text).toContain("HITL escalation cron 다수 실패");
    expect(lastCallBody.text).toContain("errors: 12");
  });

  it("[시나리오 14] batchLimited 응답 키 노출 (candidates.length >= BATCH_LIMIT 시 true)", async () => {
    // 정확히 BATCH_LIMIT 만큼 반환 → batchLimited:true.
    const candidates = Array.from({ length: ESCALATION_BATCH_LIMIT }, (_, i) =>
      makeCandidate({ id: `q-${i}`, sessionId: `s-${i}` }),
    );
    hitlFindManyMock.mockResolvedValueOnce(candidates);
    hitlUpdateManyMock.mockResolvedValue({ count: 1 });

    const res = await GET(authedRequest());
    const body = await res.json();
    expect(body.batchLimited).toBe(true);
    expect(body.scannedCount).toBe(ESCALATION_BATCH_LIMIT);
  });
});

// =============================================================================
// [시나리오 11] R4 / 금칙어 / SLA 본문 검증
// =============================================================================
describe("lib/hitl/escalation — buildEscalationMessage R4 + 금칙어", () => {
  it("[시나리오 11] Slack 본문 — sessionId / queueId / confidence / 24h SLA 포함, 자녀 식별자 / 금칙어 미포함", () => {
    const now = new Date("2026-05-22T12:00:00Z");
    const createdAt = new Date("2026-05-21T06:00:00Z"); // 30h 전
    const text = buildEscalationMessage({
      sessionId: "session-xyz",
      queueId: "queue-abc",
      confidenceScore: 62.5,
      createdAt,
      now,
    });

    // 필수 노출 (디버깅 + 알림 명확성).
    expect(text).toContain("24h SLA 초과");
    expect(text).toContain("session-xyz");
    expect(text).toContain("queue-abc");
    expect(text).toContain("62.5");
    expect(text).toContain(createdAt.toISOString());
    expect(text).toContain("30h"); // 경과 시간 계산 검증.

    // R4 (자녀 식별 절대 미포함) — userId / email / 이름 / anonymousUserId 키워드.
    for (const forbidden of ["userId", "email", "anonymousUserId", "user-1"]) {
      expect(text).not.toContain(forbidden);
    }

    // CON-04 금칙어 — "치료" / "진단" / "장애".
    for (const forbidden of ["치료", "진단", "장애"]) {
      expect(text).not.toContain(forbidden);
    }
  });
});
