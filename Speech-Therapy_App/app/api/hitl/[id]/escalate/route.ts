// FR-C-014 잔여 (#37) — PATCH /api/hitl/[id]/escalate (admin 수동 에스컬레이션).
//
// 동작 (7단계):
//   1. Zod 입력 검증 — body.reason 은 enum 또는 미지정 (폴백 "manual").
//   2. RBAC — Supabase auth.getUser() → User.role 조회 (admin/principal/expert) → 비-expert 시 403.
//   3. Rate-limit — actor 1분 5건 제한 (lib/hitl/manual-escalate.ts in-memory sliding window).
//   4. DB 멱등성 — prisma.hITLQueue.updateMany({ where: { id, escalatedAt: null } }).
//      count===0 + 큐 존재 시 200 + alreadyEscalated:true (이미 escalated, 멱등).
//      count===0 + 큐 부재 시 404.
//      count===1 → Slack + audit + event log → 200.
//   5. Slack 알림 (manual-escalate helper) — graceful (실패해도 200).
//   6. recordAudit — action="hitl_manually_escalated" (lib/audit.ts).
//   7. 텔레메트리 로그 — hitl_manually_escalated event (lib/events.ts catalog).
//
// proxy.ts 가 /admin/* 만 RBAC 통과 → 본 endpoint (/api/hitl/[id]/escalate) 는
// proxy 의 RBAC 매트릭스 외부 → 본 endpoint 안에서 _명시적_ role 검증 필수.
//
// Next.js 16 App Router: params 는 Promise — 비동기 unwrap 필수.
//
// 어뷰징 방어 (REQ-FUNC-034):
//   - actor rate-limit 5/min — DoS amplifier 회피.
//   - 멱등성 — 동일 큐 N회 호출 → 1회만 Slack/audit (count===0 시 alreadyEscalated).
//   - role 검증 — parent / teacher 차단 (403).
//   - audit — 누가 / 언제 / 왜 → AuditLog.
//
// R4 (자녀 보호):
//   - 응답 / Slack 본문에 userId / email / 이름 미포함.
//   - sessionId / queueId / reason / role 만 노출.
//
// 금칙어 (CON-04): "치료" / "진단" / "장애" 사용 금지.

import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { recordAudit } from "@/lib/audit";
import {
  checkManualEscalateRateLimit,
  notifyManualEscalationBySlack,
  recordManualEscalate,
} from "@/lib/hitl/manual-escalate";
import type { AnalyticsEvent } from "@/lib/events";

/// allowed roles — proxy.ts 의 ADMIN_ALLOWED_ROLES 와 정합 (admin/principal/expert).
const ALLOWED_ROLES = ["admin", "principal", "expert"] as const;
type AllowedRole = (typeof ALLOWED_ROLES)[number];

const EscalateInputSchema = z
  .object({
    reason: z
      .enum(["expert_judgment", "sla_at_risk", "duplicate"])
      .optional(),
  })
  .strict();

type ReasonValue = NonNullable<z.infer<typeof EscalateInputSchema>["reason"]> | "manual";

/// R4 보호: 자녀 식별 정보 0건 — queueId / reason / role 만 노출.
function logManualEscalateTelemetry(
  properties: Extract<AnalyticsEvent, { name: "hitl_manually_escalated" }>["properties"],
) {
  console.log(
    JSON.stringify({
      level: "info",
      event: "hitl_manually_escalated",
      properties,
    }),
  );
}

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: Request, context: RouteContext): Promise<Response> {
  // 0) params unwrap (Next.js 16).
  const { id: queueId } = await context.params;
  if (!queueId || typeof queueId !== "string") {
    return NextResponse.json({ error: "INVALID_QUEUE_ID" }, { status: 400 });
  }

  // 1) Zod 검증 — body 미존재 / 빈 객체 허용 (reason 폴백 "manual").
  let reason: ReasonValue = "manual";
  try {
    const text = await request.text();
    if (text.trim().length > 0) {
      const parsed = EscalateInputSchema.parse(JSON.parse(text));
      reason = parsed.reason ?? "manual";
    }
  } catch (err) {
    return NextResponse.json(
      {
        error: "INVALID_INPUT",
        detail: err instanceof Error ? err.message : String(err),
      },
      { status: 400 },
    );
  }

  // 2) RBAC — Supabase auth.getUser() → User.role 조회.
  let actorId: string;
  let actorRole: AllowedRole;
  try {
    const supabase = await getSupabaseServerClient();
    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData?.user) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }
    actorId = userData.user.id;
    // RLS users_select_own — 본인 row 조회 가능.
    const { data: roleRow, error: roleErr } = await supabase
      .from("User")
      .select("role")
      .eq("id", actorId)
      .maybeSingle<{ role: string | null }>();
    if (roleErr) {
      return NextResponse.json(
        { error: "ROLE_LOOKUP_FAILED", detail: roleErr.message },
        { status: 500 },
      );
    }
    const role = roleRow?.role ?? null;
    if (!role || !(ALLOWED_ROLES as readonly string[]).includes(role)) {
      return NextResponse.json(
        { error: "FORBIDDEN", detail: "expert/admin/principal role required" },
        { status: 403 },
      );
    }
    actorRole = role as AllowedRole;
  } catch (err) {
    return NextResponse.json(
      { error: "AUTH_ERROR", detail: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }

  // 3) Rate-limit — actor 1분 5건.
  const rate = checkManualEscalateRateLimit(actorId);
  if (!rate.allowed) {
    return NextResponse.json(
      {
        error: "RATE_LIMITED",
        reason: rate.reason,
        retryAfterSec: rate.retryAfterSec,
      },
      {
        status: 429,
        headers: rate.retryAfterSec
          ? { "Retry-After": String(rate.retryAfterSec) }
          : undefined,
      },
    );
  }

  // 4) DB 멱등성 update — 큐 존재 사전 조회 (404 분기 위함).
  let existing: { id: string; sessionId: string; escalatedAt: Date | null } | null;
  try {
    existing = await prisma.hITLQueue.findUnique({
      where: { id: queueId },
      select: { id: true, sessionId: true, escalatedAt: true },
    });
  } catch (err) {
    return NextResponse.json(
      {
        error: "DB_ERROR",
        detail: err instanceof Error ? err.message : String(err),
      },
      { status: 500 },
    );
  }
  if (!existing) {
    return NextResponse.json({ error: "QUEUE_NOT_FOUND" }, { status: 404 });
  }

  // 이미 escalated → 멱등 200 (Slack/audit 호출 0회 — 어뷰징 방어).
  if (existing.escalatedAt !== null) {
    return NextResponse.json(
      {
        ok: true,
        alreadyEscalated: true,
        queueId: existing.id,
      },
      { status: 200 },
    );
  }

  const now = new Date();
  let updateCount = 0;
  try {
    const res = await prisma.hITLQueue.updateMany({
      where: { id: queueId, escalatedAt: null },
      data: {
        status: "escalated",
        escalatedAt: now,
        escalatedBy: actorId,
        escalationReason: reason,
      },
    });
    updateCount = res.count;
  } catch (err) {
    return NextResponse.json(
      {
        error: "DB_ERROR",
        detail: err instanceof Error ? err.message : String(err),
      },
      { status: 500 },
    );
  }

  // 동시 race — findUnique 이후 다른 프로세스가 마킹. 멱등 200 + alreadyEscalated.
  if (updateCount === 0) {
    return NextResponse.json(
      {
        ok: true,
        alreadyEscalated: true,
        queueId,
      },
      { status: 200 },
    );
  }

  // 4-b) rate-limit 카운터 증가 (성공한 escalate 만 카운트).
  recordManualEscalate(actorId);

  // 5) Slack 알림 (graceful).
  let slackOk = false;
  try {
    const slackResult = await notifyManualEscalationBySlack({
      queueId,
      sessionId: existing.sessionId,
      actorRole,
      reason,
      now,
    });
    slackOk = slackResult.ok === true;
    if (!slackOk) {
      console.warn(
        `[hitl manual escalate] Slack 알림 실패 — graceful 계속: ${slackResult.error ?? "unknown"}`,
      );
    }
  } catch (err) {
    console.warn("[hitl manual escalate] Slack 호출 예외 — graceful 계속:", err);
  }

  // 6) Audit log (graceful).
  try {
    await recordAudit({
      actorId,
      action: "hitl_manually_escalated",
      target: { tableName: "HITLQueue", rowId: queueId },
      payload: { reason, actorRole },
    });
  } catch (err) {
    console.warn("[hitl manual escalate] audit 호출 예외 — graceful 계속:", err);
  }

  // 7) 텔레메트리 로그.
  logManualEscalateTelemetry({
    queueId,
    reason,
    expertRole: actorRole,
  });

  return NextResponse.json(
    {
      ok: true,
      alreadyEscalated: false,
      queueId,
      escalatedAt: now.toISOString(),
      slackNotified: slackOk,
    },
    { status: 200 },
  );
}
