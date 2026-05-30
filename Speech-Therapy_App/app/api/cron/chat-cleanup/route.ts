// FR-C-NEW-F15 — F15 ChatMessage 7일 폐기 Cron (ADR-03).
//
// Schedule: GitHub Actions external-crons.yml (Vercel Hobby 2-cron 한도라 vercel.json 아님).
//
// 동작:
//   1) Cron Secret 검증(verifyCronSecret).
//   2) expiresAt < now 대상 hard-delete(deleteMany) — 발화 텍스트는 외부 의존 0이라 soft-delete 불요.
//   3) 텔레메트리(Vercel Logs) — chat_cleanup event(삭제 건수만, 자녀 식별 정보 0).
//
// R4/ADR-03: 자녀 자유발화의 7일 자동 폐기 binding. (저장은 submitChatUtterance — pii-mask 통과분만.)

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyCronSecret } from "@/lib/cron-auth";

export async function GET(request: Request) {
  const auth = verifyCronSecret(request);
  if (!auth.ok) {
    return NextResponse.json({ error: "UNAUTHORIZED", reason: auth.reason }, { status: 401 });
  }

  const start = Date.now();
  try {
    const result = await prisma.chatMessage.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });
    const elapsedMs = Date.now() - start;
    console.log(
      JSON.stringify({
        level: "info",
        event: "chat_cleanup",
        properties: { deleted: result.count, elapsedMs },
      }),
    );
    return NextResponse.json({ ok: true, deleted: result.count, elapsedMs });
  } catch (err) {
    console.error("[FR-C-NEW-F15] chat-cleanup cron failed:", err);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
