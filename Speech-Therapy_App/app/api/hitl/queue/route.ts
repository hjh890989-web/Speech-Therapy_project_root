// API-005 — POST /api/hitl/queue (D4 Slack 웹훅 대체 모드) 본격 구현.
// REQ-FUNC-003 / HITL-001, FR-C-002 외부 진입점.
//
// 동작:
//  1) INTERNAL_API_SECRET 헤더 인증
//  2) Zod 입력 검증
//  3) lib/hitl.enqueueForReview (DB UPSERT, idempotent)
//  4) notifyHITLBySlack (graceful)
//  5) Rate Limit (in-memory, 1분 내 동일 sessionId 차단)
//  6) 서버 텔레메트리: hitl_enqueued 구조화 로그 (lib/events.ts catalog 참조)

import { NextResponse } from "next/server";
import {
  HitlEnqueueInputSchema,
  type HitlEnqueueOutput,
} from "@/lib/schemas/hitl";
import { enqueueForReview } from "@/lib/hitl";
import { notifyHITLBySlack } from "@/lib/notifications/slack";
import type { AnalyticsEvent } from "@/lib/events";

// R4 보호: 자녀 식별 정보 절대 미포함 — sessionId / queueId / confidenceScore / slackNotified 만 노출.
function logHitlEnqueuedTelemetry(
  properties: Extract<AnalyticsEvent, { name: "hitl_enqueued" }>["properties"],
) {
  // Vercel Logs / Drains 가 수집할 수 있는 구조화 JSON 로그.
  // 브라우저 trackEvent (lib/analytics.ts) 는 서버 routes 에서 호출 불가 — 서버는 console 경로.
  console.log(
    JSON.stringify({
      level: "info",
      event: "hitl_enqueued",
      properties,
    }),
  );
}

// in-memory rate limit. 단일 lambda 인스턴스 내에서만 유효 (Vercel cold start 마다 리셋).
// Sprint 1 단순화. 본격은 SEC-004 (Redis/KV) 와 통합.
const recentSessionTimestamps = new Map<string, number>();
const RATE_LIMIT_WINDOW_MS = 60_000; // 1분.

function isRateLimited(sessionId: string): boolean {
  const now = Date.now();
  const last = recentSessionTimestamps.get(sessionId);
  if (last && now - last < RATE_LIMIT_WINDOW_MS) return true;
  recentSessionTimestamps.set(sessionId, now);
  // 메모리 보호: 1000건 초과 시 오래된 것부터 제거.
  if (recentSessionTimestamps.size > 1000) {
    const cutoff = now - RATE_LIMIT_WINDOW_MS;
    for (const [key, ts] of recentSessionTimestamps) {
      if (ts < cutoff) recentSessionTimestamps.delete(key);
    }
  }
  return false;
}

export async function POST(request: Request) {
  // 1) 내부 호출 인증.
  const secret = process.env.INTERNAL_API_SECRET;
  if (secret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }
  }

  // 2) 입력 Zod 검증.
  let parsed;
  try {
    const body = await request.json();
    parsed = HitlEnqueueInputSchema.parse(body);
  } catch (err) {
    return NextResponse.json(
      { error: "INVALID_INPUT", detail: err instanceof Error ? err.message : String(err) },
      { status: 400 },
    );
  }

  // 5) Rate Limit (1분 내 동일 sessionId 재시도 차단).
  if (isRateLimited(parsed.sessionId)) {
    return NextResponse.json({ error: "RATE_LIMITED" }, { status: 429 });
  }

  // 3) DB UPSERT — 멱등성 보장.
  let queue;
  try {
    queue = await enqueueForReview(parsed.sessionId, parsed.userId, parsed.confidenceScore);
  } catch (err) {
    return NextResponse.json(
      { error: "INTERNAL_ERROR", detail: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }

  // 4) Slack 알림 — graceful (실패해도 200).
  const slackResult = await notifyHITLBySlack({
    sessionId: parsed.sessionId,
    queueId: queue.id,
    confidenceScore: parsed.confidenceScore,
    slaDueAt: queue.slaDueAt,
  });

  const payload: HitlEnqueueOutput = {
    success: true,
    queueId: queue.id,
    slaDueAt: queue.slaDueAt.toISOString(),
    slackNotified: slackResult.ok,
  };

  // 6) 서버 텔레메트리 — R4 보호 (자녀 식별 정보 미노출).
  logHitlEnqueuedTelemetry({
    queueId: queue.id,
    sessionId: parsed.sessionId,
    confidenceScore: parsed.confidenceScore,
    slackNotified: slackResult.ok,
  });

  return NextResponse.json(payload, { status: 200 });
}
