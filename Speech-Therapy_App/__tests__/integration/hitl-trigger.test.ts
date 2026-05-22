// FR-C-002 (#25) — maybeEnqueueHitl 통합 테스트.
//
// 시나리오 매핑:
//   sc1 — confidence 65 → enqueue 발생 + Prisma create 1회 + trackEvent 1회
//   sc2 — confidence 70 (경계) → enqueue 안 함 (strict less than)
//   sc3 — confidence 95 → enqueue 안 함
//   sc4 — DB error → graceful, 발음 발달 확인 flow 정상 진행 ({ enqueued: false, reason: "db_error" })
//   sc5 — Slack 실패 (fetch reject) → enqueue 성공 + slackNotified: false
//   sc6 — confidence 0 (최저값) → enqueue 발생 + trackEvent properties 정확
//   sc7 — SLACK_WEBHOOK_URL 미설정 (skipped) → enqueue 성공 + slackNotified: false
//
// 격리: Prisma + fetch + trackEvent 전부 mock — 실 외부 호출 0건.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const hitlFindUniqueMock = vi.fn();
const hitlCreateMock = vi.fn();
const hitlUpdateMock = vi.fn();
const hitlCountMock = vi.fn();
const trackEventMock = vi.fn();

vi.mock("@/lib/db", () => ({
  prisma: {
    hITLQueue: {
      findUnique: (...args: unknown[]) => hitlFindUniqueMock(...args),
      create: (...args: unknown[]) => hitlCreateMock(...args),
      update: (...args: unknown[]) => hitlUpdateMock(...args),
      count: (...args: unknown[]) => hitlCountMock(...args),
    },
  },
}));

vi.mock("@/lib/analytics", () => ({
  trackEvent: (...args: unknown[]) => trackEventMock(...args),
  hashIdentifier: vi.fn(),
}));

import { maybeEnqueueHitl, HITL_CONFIDENCE_THRESHOLD } from "@/lib/hitl/enqueue";

const ORIGINAL_SLACK_URL = process.env.SLACK_WEBHOOK_URL;
const ORIGINAL_FETCH = globalThis.fetch;

const VALID_ARGS = {
  userId: "00000000-0000-0000-0000-000000000001",
  diagnoseResultId: "00000000-0000-0000-0000-00000000abcd",
  targetPhoneme: "ㅅ" as const,
};

beforeEach(() => {
  hitlFindUniqueMock.mockReset();
  hitlCreateMock.mockReset();
  hitlUpdateMock.mockReset();
  hitlCountMock.mockReset();
  trackEventMock.mockReset();

  // 기본: 신규 sessionId 경로.
  hitlFindUniqueMock.mockResolvedValue(null);
  hitlCountMock.mockResolvedValue(0); // abuse 0
  hitlCreateMock.mockResolvedValue({
    id: "queue-item-1",
    status: "pending",
    slaDueAt: new Date("2026-05-24T12:00:00Z"),
  });

  process.env.SLACK_WEBHOOK_URL = "https://hooks.slack.com/mock";
  globalThis.fetch = vi.fn().mockResolvedValue(new Response("ok", { status: 200 }));
});

afterEach(() => {
  process.env.SLACK_WEBHOOK_URL = ORIGINAL_SLACK_URL;
  globalThis.fetch = ORIGINAL_FETCH;
});

describe("FR-C-002 — maybeEnqueueHitl (Confidence < 70 자동 HITL 이관)", () => {
  it("[sc1] confidence 65 → enqueue + create 1회 + trackEvent 1회", async () => {
    const result = await maybeEnqueueHitl({ ...VALID_ARGS, confidenceScore: 65 });

    expect(result.enqueued).toBe(true);
    expect(result.queueItemId).toBe("queue-item-1");
    expect(result.reason).toBe("ok");
    expect(hitlCreateMock).toHaveBeenCalledTimes(1);
    expect(trackEventMock).toHaveBeenCalledTimes(1);

    const trackArgs = trackEventMock.mock.calls[0];
    expect(trackArgs[0]).toBe("hitl_enqueued");
    expect(trackArgs[1]).toMatchObject({
      queueId: "queue-item-1",
      sessionId: VALID_ARGS.diagnoseResultId,
      confidenceScore: 65,
      targetPhoneme: "ㅅ",
      slackNotified: true,
    });
  });

  it("[sc2] confidence 70 (경계) → enqueue 안 함 (조건이 strict less than)", async () => {
    const result = await maybeEnqueueHitl({ ...VALID_ARGS, confidenceScore: 70 });

    expect(result.enqueued).toBe(false);
    expect(result.queueItemId).toBeUndefined();
    expect(result.reason).toBe("above_threshold");
    expect(hitlCreateMock).not.toHaveBeenCalled();
    expect(trackEventMock).not.toHaveBeenCalled();
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("[sc3] confidence 95 → enqueue 안 함", async () => {
    const result = await maybeEnqueueHitl({ ...VALID_ARGS, confidenceScore: 95 });

    expect(result.enqueued).toBe(false);
    expect(result.reason).toBe("above_threshold");
    expect(hitlCreateMock).not.toHaveBeenCalled();
    expect(trackEventMock).not.toHaveBeenCalled();
  });

  it("[sc4] DB error → graceful (throw 안 함, { enqueued: false, reason: 'db_error' })", async () => {
    hitlCreateMock.mockRejectedValue(new Error("connection refused"));

    const result = await maybeEnqueueHitl({ ...VALID_ARGS, confidenceScore: 50 });

    expect(result.enqueued).toBe(false);
    expect(result.reason).toBe("db_error");
    expect(result.queueItemId).toBeUndefined();
    // Slack / trackEvent 는 DB 성공 후에만 발송 — DB 실패 시 호출 안 됨.
    expect(globalThis.fetch).not.toHaveBeenCalled();
    expect(trackEventMock).not.toHaveBeenCalled();
  });

  it("[sc5] Slack 실패 (fetch reject) → enqueue 성공 + slackNotified: false", async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error("network down"));

    const result = await maybeEnqueueHitl({ ...VALID_ARGS, confidenceScore: 30 });

    expect(result.enqueued).toBe(true);
    expect(result.queueItemId).toBe("queue-item-1");
    expect(hitlCreateMock).toHaveBeenCalledTimes(1);
    expect(trackEventMock).toHaveBeenCalledTimes(1);
    expect(trackEventMock.mock.calls[0][1]).toMatchObject({
      slackNotified: false,
    });
  });

  it("[sc6] confidence 0 (최저값) → enqueue + trackEvent properties 정확", async () => {
    const result = await maybeEnqueueHitl({
      ...VALID_ARGS,
      confidenceScore: 0,
      targetPhoneme: "ㄹ",
    });

    expect(result.enqueued).toBe(true);
    expect(hitlCreateMock).toHaveBeenCalledTimes(1);
    const createArg = hitlCreateMock.mock.calls[0][0] as {
      data: { confidenceScore: number; sessionId: string };
    };
    expect(createArg.data.confidenceScore).toBe(0);
    expect(createArg.data.sessionId).toBe(VALID_ARGS.diagnoseResultId);

    expect(trackEventMock.mock.calls[0][1]).toMatchObject({
      confidenceScore: 0,
      targetPhoneme: "ㄹ",
    });
  });

  it("[sc7] SLACK_WEBHOOK_URL 미설정 → enqueue 성공 + slackNotified: false (skipped)", async () => {
    delete process.env.SLACK_WEBHOOK_URL;

    const result = await maybeEnqueueHitl({ ...VALID_ARGS, confidenceScore: 60 });

    expect(result.enqueued).toBe(true);
    expect(hitlCreateMock).toHaveBeenCalledTimes(1);
    expect(globalThis.fetch).not.toHaveBeenCalled(); // webhook URL 없으니 fetch 호출 안 함
    expect(trackEventMock).toHaveBeenCalledTimes(1);
    expect(trackEventMock.mock.calls[0][1]).toMatchObject({
      slackNotified: false,
    });
  });

  it("[sc8] Slack 본문 — R4 자녀 식별 정보 미포함 (userId / transcript / email 등)", async () => {
    await maybeEnqueueHitl({
      ...VALID_ARGS,
      confidenceScore: 40,
      transcript: "비밀 발화",
      audioUrl: "https://example.com/secret.wav",
    });

    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    const [, init] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const body = JSON.parse(init.body as string) as { text: string };
    for (const forbidden of [
      VALID_ARGS.userId,
      "비밀 발화",
      "secret.wav",
      "email",
      "anonymousUserId",
    ]) {
      expect(body.text).not.toContain(forbidden);
    }
    // sessionId / queueId 만 노출.
    expect(body.text).toContain(VALID_ARGS.diagnoseResultId);
    expect(body.text).toContain("queue-item-1");
  });

  it("[sc9] HITL_CONFIDENCE_THRESHOLD = 70 (FR-C-002 spec)", () => {
    expect(HITL_CONFIDENCE_THRESHOLD).toBe(70);
  });
});
