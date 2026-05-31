// API-020 — F16 푸시 일 1회 발송 Cron (/api/push/dispatch).
//
// schedule (vercel.json, Pro 전환 후): "0 9 * * *" UTC = 18:00 KST. 현재 Hobby 슬롯 한도 →
//   등록만, 활성은 Pro 전환 + D5 부활 후. 수동 / Preview 호출은 CRON_SECRET 으로 인증.
//
// 흐름:
//   1) CRON_SECRET 검증 (verifyCronSecret) — 401 차단.
//   2) F16 게이트 (isF16PushEnabled) — off 시 무발송 200 (D5 부활 전 기본).
//   3) 활성 구독 조회 (dismissCount < 임계, batch limit) — 옵트인 source of truth = row.
//   4) 각 구독 sendPush(일일 카피) — gone(404/410) 수집 / ok 수집.
//   5) sent → lastSentAt 갱신(updateMany), gone → DELETE(deleteMany). 200 반환(cron retry 안 함).
//
// 정보통신망법 §50: 옵트인 구독(row 존재)만 발송. 옵트아웃(unsubscribePush) = row 삭제 → 자동 제외.
// R4: 카피는 일반 유도문 (자녀 식별 0건). CON-04: send.ts 가 발송 직전 금칙어 fail-closed 검증.
//
// Refs: TASK_API-020.md, REQ-FUNC-040, ADR-10.

import { NextResponse } from "next/server";

import { verifyCronSecret } from "@/lib/cron-auth";
import { prisma } from "@/lib/db";
import { isF16PushEnabled } from "@/lib/push/config";
import { pickDailyPushCopy } from "@/lib/push/copy";
import { sendPush } from "@/lib/push/send";

// Prisma 7 — Node 런타임 필수 (Edge 미지원). 매 요청 fresh.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/// 한 주기 최대 발송 수 (DB / 발송 폭주 방지 — 초과분 다음 주기 자연 분산).
const BATCH_LIMIT = 500;
/// dismiss 누적 임계 — 이상이면 dispatch 제외 (Phase 2 빈도 적응 / 자동 옵트아웃).
const DISMISS_OPTOUT_THRESHOLD = 5;

export async function GET(request: Request) {
  // (1) CRON_SECRET.
  const auth = verifyCronSecret(request);
  if (!auth.ok) {
    return NextResponse.json(
      { error: "UNAUTHORIZED", reason: auth.reason },
      { status: 401 },
    );
  }

  // (2) F16 게이트 — off 시 무발송 (코드 배치 / 활성 0).
  if (!isF16PushEnabled()) {
    return NextResponse.json({
      job: "push-dispatch",
      skipped: true,
      reason: "disabled",
      sentCount: 0,
    });
  }

  const start = Date.now();
  const now = new Date();
  const copy = pickDailyPushCopy(now);

  // (3) 활성 구독 조회.
  let subs: Array<{
    id: string;
    endpoint: string;
    p256dh: string;
    auth: string;
  }> = [];
  try {
    subs = await prisma.pushSubscription.findMany({
      where: { dismissCount: { lt: DISMISS_OPTOUT_THRESHOLD } },
      select: { id: true, endpoint: true, p256dh: true, auth: true },
      take: BATCH_LIMIT,
    });
  } catch (err) {
    console.error("push-dispatch: findMany 실패", err);
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }

  // (4) 발송 — 결과별 id 수집.
  const sentIds: string[] = [];
  const goneIds: string[] = [];
  const errors: Array<{ id: string; reason: string }> = [];

  for (const sub of subs) {
    const result = await sendPush(
      { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
      copy,
    );
    if (result.ok) {
      sentIds.push(sub.id);
    } else if (result.gone) {
      goneIds.push(sub.id);
    } else if (!result.skipped) {
      errors.push({ id: sub.id, reason: result.error ?? "unknown" });
    }
  }

  // (5) sent → lastSentAt 갱신 / gone → DELETE (각 1쿼리).
  try {
    if (sentIds.length > 0) {
      await prisma.pushSubscription.updateMany({
        where: { id: { in: sentIds } },
        data: { lastSentAt: now },
      });
    }
    if (goneIds.length > 0) {
      await prisma.pushSubscription.deleteMany({
        where: { id: { in: goneIds } },
      });
    }
  } catch (err) {
    console.error("push-dispatch: post-send DB 갱신 실패", err);
    // 발송은 이미 완료 — 다음 주기 자연 보정. 200 유지.
  }

  return NextResponse.json({
    job: "push-dispatch",
    scannedCount: subs.length,
    sentCount: sentIds.length,
    goneCount: goneIds.length,
    errors,
    durationMs: Date.now() - start,
    batchLimited: subs.length >= BATCH_LIMIT,
  });
}
