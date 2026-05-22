// FR-C-014 (#37) — HITL 24h 미처리 자동 에스컬레이션 Vercel Cron + Slack 재알림.
//
// schedule (Pro 전환 시): "0 * * * *" — 매시 정각.
// 현재 Hobby 한도 (slot 1개): vercel.json 등록만, 첫 슬롯 hitl-monitor 가 점유 →
// 본 cron 은 Pro 전환 후 자동 활성. 수동/Preview 호출은 인증 통과.
//
// hitl-monitor (기존) 와의 책임 분리:
//   - hitl-monitor (매일 0시): bulk metric — escalateOverdueQueues (updateMany, 1쿼리),
//     SLA 임박 알림, 전문가 부담 임계 알림. Slack 은 집계 1회.
//   - hitl-escalation (본 cron, 매시): per-item Slack 재알림 + escalatedAt 마킹.
//     어뷰징 방어 (escalatedAt IS NULL 멱등) — 동일 sessionId 24h 내 alert 1회만.
//   - race-condition: hitl-monitor 가 먼저 마킹해도 본 cron 은 WHERE escalatedAt IS NULL 로 안전 (0 update).
//
// 동작 7단계:
//   1. CRON_SECRET 검증 (verifyCronSecret) — 401 시 차단.
//   2. findEscalationCandidates(now) — 24h 초과 + escalatedAt IS NULL + status in (pending, in_review).
//   3. 각 항목 escalateItem({ item, now }) — Slack 재알림 + DB update.
//   4. Slack 실패 시 errors 누적, DB 업데이트 skip → 다음 cron 주기 재시도.
//   5. DB 실패 시 errors 누적 + 다른 항목 계속 진행 (graceful).
//   6. 200 반환 (cron retry 안 함) — 실패는 다음 주기에 자연 보정.
//   7. 응답 구조: { job, scannedCount, escalatedCount, errors[], durationMs }.
//
// 금칙어 (CON-04): "치료" / "진단" / "장애" 사용 금지.

import { NextResponse } from "next/server";
import { verifyCronSecret } from "@/lib/cron-auth";
import { findEscalationCandidates, escalateItem } from "@/lib/hitl/escalation";

interface EscalationError {
  sessionId: string;
  queueId: string;
  reason: string;
}

export async function GET(request: Request) {
  const auth = verifyCronSecret(request);
  if (!auth.ok) {
    return NextResponse.json({ error: "UNAUTHORIZED", reason: auth.reason }, { status: 401 });
  }

  const start = Date.now();
  const now = new Date();

  let candidates: Awaited<ReturnType<typeof findEscalationCandidates>> = [];
  try {
    candidates = await findEscalationCandidates(now);
  } catch (err) {
    console.error("hitl-escalation: findEscalationCandidates 실패", err);
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }

  const errors: EscalationError[] = [];
  let escalatedCount = 0;

  for (const item of candidates) {
    const result = await escalateItem({ item, now });
    if (result.ok) {
      escalatedCount += 1;
    } else {
      errors.push({
        sessionId: item.sessionId,
        queueId: item.id,
        reason: result.error ?? "unknown",
      });
    }
  }

  return NextResponse.json({
    job: "hitl-escalation",
    scannedCount: candidates.length,
    escalatedCount,
    errors,
    durationMs: Date.now() - start,
  });
}
