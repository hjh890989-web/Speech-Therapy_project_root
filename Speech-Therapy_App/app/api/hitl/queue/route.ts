// API-005 — POST /api/hitl/queue (D4 Slack 웹훅 대체 모드) stub.
// 구현은 FR-C-002 책임. 본 파일은 라우트 + Zod 검증만.

import { NextResponse } from "next/server";
import {
  HitlEnqueueInputSchema,
  type HitlEnqueueOutput,
} from "@/lib/schemas/hitl";

export async function POST(request: Request) {
  // TODO: API-010 — INTERNAL_API_SECRET 헤더 검증 (현재는 통과).
  const _authHeader = request.headers.get("authorization");

  let parsed;
  try {
    const body = await request.json();
    parsed = HitlEnqueueInputSchema.parse(body);
  } catch (err) {
    return NextResponse.json(
      { error: "INVALID_INPUT", detail: String(err) },
      { status: 400 },
    );
  }

  // FR-C-002 구현:
  //    - lib/hitl.ts enqueueForReview(sessionId, userId, confidence)
  //    - Slack 웹훅 발송 (API-012 통합)
  //    - 중복 sessionId → 409
  //    - Rate Limit (동일 sessionId 1분 내) → 429
  void parsed;

  const placeholder: HitlEnqueueOutput = {
    success: false,
    queueId: "00000000-0000-0000-0000-000000000000",
    slaDueAt: new Date().toISOString(),
    slackNotified: false,
  };
  return NextResponse.json(
    { error: "NOT_IMPLEMENTED", placeholder },
    { status: 501 },
  );
}
