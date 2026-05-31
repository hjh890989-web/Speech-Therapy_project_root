// API-020 — F16 푸시 dismiss 카운트 (/api/push/dismiss).
//
// SW notificationclose 핸들러가 POST { endpoint } → 해당 구독 dismissCount + 1.
// Phase 2: dispatch 가 dismissCount 임계(5) 이상을 제외 → 빈도 자동 감소 / 옵트아웃.
//
// 인증: SW(push) context 는 세션 쿠키가 불확실 → endpoint 키로 식별.
//   endpoint 는 push gateway 의 unguessable capability token (긴 무작위) — 본인 카운터만 증가,
//   타인 구독 식별 불가 → 악용 위험 낮음. (R4: endpoint 자체는 PII 아님.)
//
// Refs: TASK_DB-018.md (Scenario 3), TASK_API-020.md, REQ-FUNC-040.

import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/db";

// Prisma 7 — Node 런타임. 매 요청 fresh.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const BodySchema = z.object({
  endpoint: z.string().url().max(2048),
});

export async function POST(request: Request) {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
  }

  const parsed = BodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400 });
  }

  try {
    // updateMany — endpoint 매칭 0건이면 count 0 (404 노출 안 함, 정보 노출 최소화).
    const result = await prisma.pushSubscription.updateMany({
      where: { endpoint: parsed.data.endpoint },
      data: { dismissCount: { increment: 1 } },
    });
    return NextResponse.json({ updated: result.count });
  } catch (err) {
    console.error("push-dismiss: update 실패", err);
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}
