// API-007 — PATCH /api/b2b/approval (D8 클립보드 대체) stub.
// 구현은 FR-C-017 (알림장 초안 생성) 책임.

import { NextResponse } from "next/server";
import {
  B2bApprovalInputSchema,
  type B2bApprovalOutput,
} from "@/lib/schemas/b2b";

export async function PATCH(request: Request) {
  // TODO: API-010 — teacher / principal 역할 검증.
  let parsed;
  try {
    const body = await request.json();
    parsed = B2bApprovalInputSchema.parse(body);
  } catch (err) {
    return NextResponse.json(
      { error: "INVALID_INPUT", detail: String(err) },
      { status: 400 },
    );
  }

  // FR-C-017 구현:
  //    - notificationDraftId 조회 + approved 상태 UPDATE
  //    - editedText 반영 (clipboardText 생성)
  //    - 무수정 카운트 통계 (REQ-FUNC-057 KPI ≥ 90%)
  //    - 자녀 본명 0건 검증
  void parsed;

  const placeholder: B2bApprovalOutput = {
    success: false,
    clipboardText: "",
    wasEdited: false,
    approvedAt: new Date().toISOString(),
  };
  return NextResponse.json(
    { error: "NOT_IMPLEMENTED", placeholder },
    { status: 501 },
  );
}
