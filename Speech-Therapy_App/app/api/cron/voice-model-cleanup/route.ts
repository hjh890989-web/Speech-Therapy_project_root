// FR-C-027 — F11 voice_models 7일 폐기 Cron (V07).
//
// Schedule: GitHub Actions external-crons.yml — daily 04:00 UTC (다른 cron 과 분리).
//
// 동작:
//   1) Cron Secret 검증.
//   2) expiresAt < now AND deletedAt IS NULL 대상 조회.
//   3) ElevenLabs deleteVoice — voice_id 별 DELETE.
//   4) VoiceModel.deletedAt = now UPDATE (soft delete marker).
//   5) 텔레메트리 (Vercel Logs) — voice_model_cleanup event.
//
// R4: 자녀 식별 정보 미노출 — userId / modelHash / cleanup count 만.
// ADR-03: 7일 폐기 의무 binding.
//
// 실패 처리:
//   - ElevenLabs DELETE 실패 row 는 deletedAt 업데이트 skip + 재시도 (다음 Cron tick).
//   - graceful — 일부 실패해도 다른 row 처리 continue.
//
// Refs: TASK_FR-C-027.md, V07 §4.1 F11, ADR-03.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyCronSecret } from "@/lib/cron-auth";
import { deleteVoice } from "@/lib/voice-clone/elevenlabs-client";

export async function GET(request: Request) {
  const auth = verifyCronSecret(request);
  if (!auth.ok) {
    return NextResponse.json(
      { error: "UNAUTHORIZED", reason: auth.reason },
      { status: 401 },
    );
  }

  const start = Date.now();
  const now = new Date();

  let processed = 0;
  let deleted = 0;
  let elevenlabsSkipped = 0;
  let failed = 0;

  try {
    const expired = await prisma.voiceModel.findMany({
      where: {
        expiresAt: { lt: now },
        deletedAt: null,
      },
      select: { id: true, modelHash: true },
      take: 500, // 한 번에 500 row 처리 한도 (Cron timeout 회피).
    });
    processed = expired.length;

    for (const row of expired) {
      const result = await deleteVoice(row.modelHash);
      if (result.ok) {
        await prisma.voiceModel.update({
          where: { id: row.id },
          data: { deletedAt: now },
        });
        deleted += 1;
      } else if (result.skipped) {
        // ELEVENLABS_API_KEY 미설정 — soft delete marker 만 (외부 cleanup 사용자 측 책임).
        await prisma.voiceModel.update({
          where: { id: row.id },
          data: { deletedAt: now },
        });
        elevenlabsSkipped += 1;
      } else {
        // ElevenLabs DELETE 실패 — deletedAt 미업데이트, 다음 Cron tick 에서 재시도.
        failed += 1;
        console.warn("[FR-C-027] deleteVoice failed for", row.modelHash, result.error);
      }
    }

    const elapsedMs = Date.now() - start;
    console.log(
      JSON.stringify({
        level: "info",
        event: "voice_model_cleanup",
        properties: {
          processed,
          deleted,
          elevenlabsSkipped,
          failed,
          elapsedMs,
        },
      }),
    );

    return NextResponse.json({
      ok: true,
      processed,
      deleted,
      elevenlabsSkipped,
      failed,
      elapsedMs,
    });
  } catch (err) {
    console.error("[FR-C-027] cron failed:", err);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
