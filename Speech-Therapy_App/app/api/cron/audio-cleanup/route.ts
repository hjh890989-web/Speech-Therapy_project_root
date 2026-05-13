// INFRA-002 + FR-C-004 — 음성 7일 폐기 Cron (D6 단순화).
// schedule: 매주 일요일 03:00 UTC — vercel.json
//
// D6 적용: Sprint 1 음성 원본 미저장 (audioVectorUri 항상 null) → No-op.
// 추후 P2 음성 영구 보관 도입 시 본 핸들러 활성 (audio storage 7일 초과 객체 삭제).

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyCronSecret } from "@/lib/cron-auth";

const RETENTION_DAYS = 7;

export async function GET(request: Request) {
  const auth = verifyCronSecret(request);
  if (!auth.ok) {
    return NextResponse.json({ error: "UNAUTHORIZED", reason: auth.reason }, { status: 401 });
  }

  const start = Date.now();
  const cutoff = new Date();
  cutoff.setUTCDate(cutoff.getUTCDate() - RETENTION_DAYS);

  // D6: Sprint 1 엔 audioVectorUri 항상 null → 0 row.
  // 미래 P2 활성 시 Supabase Storage 객체 delete 도 함께 처리.
  let deletedCount = 0;
  try {
    const result = await prisma.sessionLog.updateMany({
      where: {
        audioVectorUri: { not: null },
        startTime: { lt: cutoff },
      },
      data: { audioVectorUri: null },
    });
    deletedCount = result.count;
  } catch (err) {
    console.error("audio-cleanup: 실패", err);
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }

  return NextResponse.json({
    job: "audio-cleanup",
    discope: "D6",
    deletedCount,
    durationMs: Date.now() - start,
  });
}
