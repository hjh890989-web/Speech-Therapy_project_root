// FR-C-013 (#36) — PATCH /api/hitl/[id]/comment
//
// 전문가 코멘트 + 보정 점수 저장 endpoint.
// detail page (app/admin/hitl/[id]/page.tsx) 의 Client Component (HitlCommentForm) 가 호출.
//
// 흐름:
//   1) Next.js 16 App Router params Promise unwrap → id (queueId)
//   2) Supabase auth.getUser() — 익명 시 401
//   3) User.role 조회 (직접 Supabase SELECT) — admin / principal / expert 외 403
//   4) request body Zod 검증 (HitlCommentPatchBodySchema) — 실패 시 400
//   5) submitExpertComment (admin-actions) — Prisma update + audit + telemetry
//   6) Prisma P2025 (row not found) → 404, 그 외 Prisma 에러 → 500
//
// RBAC 패턴:
//   - proxy.ts 의 lookupUserRole 은 NextRequest/NextResponse 기반 (middleware 전용).
//   - 본 endpoint 는 route handler — getSupabaseServerClient (lib/supabase/server) 사용 + Role SELECT 직접.
//   - 동일한 role 화이트리스트 (ADMIN_ALLOWED_ROLES = admin/principal/expert) 재사용.
//
// 멱등성 / 중복 검토:
//   - 같은 queueId 에 PATCH 재호출 시 overwrite (admin-actions submitExpertComment 정책).
//   - 409 미반환 — 재검토 운영 시나리오 허용.

import { NextResponse } from "next/server";
import { z } from "zod";

import { getSupabaseServerClient } from "@/lib/supabase/server";
import { ADMIN_ALLOWED_ROLES, type AdminAllowedRole } from "@/lib/auth-role";
import { HitlCommentPatchBodySchema } from "@/lib/schemas/hitl";
import { submitExpertComment } from "@/lib/hitl/admin-actions";

/** Next.js 16 App Router — dynamic route params 는 Promise. */
type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  // 1) path param 추출.
  const { id: queueId } = await context.params;
  if (!queueId || typeof queueId !== "string") {
    return NextResponse.json(
      { error: "INVALID_INPUT", detail: "queueId path param 누락" },
      { status: 400 },
    );
  }

  // 2) Supabase auth — 익명 차단.
  let supabase;
  try {
    supabase = await getSupabaseServerClient();
  } catch (err) {
    return NextResponse.json(
      { error: "INTERNAL_ERROR", detail: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  // 3) role 조회 — User 테이블 직접 SELECT (lib/auth-role 의 lookupUserRole 은 middleware 전용).
  // RLS users_select_own 가 본인 row 조회 허용.
  let role: string | null = null;
  try {
    const { data: userRow, error: roleError } = await supabase
      .from("User")
      .select("role")
      .eq("id", user.id)
      .maybeSingle<{ role: string | null }>();
    if (roleError) {
      return NextResponse.json(
        { error: "INTERNAL_ERROR", detail: roleError.message },
        { status: 500 },
      );
    }
    role = userRow?.role ?? null;
  } catch (err) {
    return NextResponse.json(
      { error: "INTERNAL_ERROR", detail: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }

  if (!role || !(ADMIN_ALLOWED_ROLES as readonly string[]).includes(role)) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }
  const expertRole = role as AdminAllowedRole;

  // 4) body Zod 검증.
  let parsed: z.infer<typeof HitlCommentPatchBodySchema>;
  try {
    const body = await request.json();
    parsed = HitlCommentPatchBodySchema.parse(body);
  } catch (err) {
    return NextResponse.json(
      { error: "INVALID_INPUT", detail: err instanceof Error ? err.message : String(err) },
      { status: 400 },
    );
  }

  // 5) 비즈니스 로직 위임.
  let result;
  try {
    result = await submitExpertComment({
      queueId,
      expertId: user.id,
      expertRole,
      comment: parsed.expertComment,
      correctedScore: parsed.correctedScore,
    });
  } catch (err) {
    // Prisma P2025 — record not found.
    const code = (err as { code?: string }).code;
    if (code === "P2025") {
      return NextResponse.json(
        { error: "NOT_FOUND", detail: `queueId=${queueId}` },
        { status: 404 },
      );
    }
    return NextResponse.json(
      { error: "INTERNAL_ERROR", detail: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }

  return NextResponse.json(
    {
      success: true as const,
      queueId: result.queueId,
      reviewedAt: result.reviewedAt.toISOString(),
      status: result.status,
      expertComment: result.expertComment,
      correctedScore: result.correctedScore,
      auditRecorded: result.auditRecorded,
    },
    { status: 200 },
  );
}
