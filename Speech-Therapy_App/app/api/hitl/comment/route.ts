// API-006 — PATCH /api/hitl/comment (D4 Studio + fallback) stub.
// 구현은 FR-C-013 책임.

import { NextResponse } from "next/server";
import {
  HitlCommentInputSchema,
  type HitlCommentOutput,
} from "@/lib/schemas/hitl";

export async function PATCH(request: Request) {
  // TODO: API-010 — Supabase Auth 로 expert / admin 역할 검증.
  let parsed;
  try {
    const body = await request.json();
    parsed = HitlCommentInputSchema.parse(body);
  } catch (err) {
    return NextResponse.json(
      { error: "INVALID_INPUT", detail: String(err) },
      { status: 400 },
    );
  }

  // FR-C-013 구현:
  //    - HITLQueue status='completed', expertComment, groundTruthScore UPDATE
  //    - EvaluationResult.hitlReviewed = true
  //    - 부모 알림 (Resend / Slack DM, API-012)
  //    - 48h 초과 시 마스터 재활사 강제 이관 (409 또는 admin only)
  //    - CON-04 금칙어 정규식 검증
  void parsed;

  const placeholder: HitlCommentOutput = {
    success: false,
    completedAt: new Date().toISOString(),
    userNotified: false,
  };
  return NextResponse.json(
    { error: "NOT_IMPLEMENTED", placeholder },
    { status: 501 },
  );
}
