// MON-001 (#64) — 일간 ±20% 변동 funnel Alert Cron.
//
// schedule: 매일 09:00 KST = 00:00 UTC ("0 0 * * *").
// vercel.json 의 crons 에 추가.
//
// 책임:
//   1. CRON_SECRET 검증 (verifyCronSecret) — 401 시 차단.
//   2. 어제 (yesterday, UTC) 와 그제 (day-before-yesterday, UTC) 의 funnel 집계.
//   3. compareConversions → pickAlertSteps:
//        |Δpp| > 20 (절대) 또는 |Δrel| > 20% (상대) 인 step 만 alert.
//   4. 어제 totalUsers = 0 인 경우 — 데이터 부재로 alert skip (false-positive 방어).
//   5. 그제 totalUsers = 0 인 경우 — baseline 부재 (첫 day) 로 alert skip + reason 명시.
//   6. Slack alert 발송 (sendSlackMessage). Slack 실패 / skip → errors[] 누적 + 200 반환.
//
// 비교 baseline 선택:
//   - 어제 vs 그제 (단일 일자 기준) — 변동 민감도 우선. 주말/평일 패턴 무시.
//   - 직전 주 평균 (어제 - 7~14일) 도 후보였으나, MVP 단계 데이터 양 부족 시 noise 가
//     심해 단순 day-vs-day 채택. 후속 PR 에서 7-day moving average 옵션 추가 가능.
//
// R4:
//   - Slack 본문엔 step 이름 / conversion 비율 / 변동 폭만 포함. userId / sessionId 0건.
//
// 멱등성 / 어뷰징 방어:
//   - 동일 day pair (어제, 그제) 에 대해 cron 이 1회만 실행되도록 vercel cron schedule 이 보장.
//     (cron 수동 트리거 시엔 매 호출 alert 재발송 — 운영 책임).
//   - errors[] 는 200 반환에 포함 (cron retry 안 함).
//
// 금칙어 (CON-04): 본 파일 / Slack 본문 / 단계 라벨 모두 "치료" / "진단" / "장애" 0건.

import { NextResponse } from "next/server";
import { verifyCronSecret } from "@/lib/cron-auth";
import {
  aggregateFunnel,
  addUtcDays,
  compareConversions,
  FUNNEL_STEP_LABEL,
  pickAlertSteps,
  toDayStartUtc,
  type FunnelAlertItem,
} from "@/lib/analytics/funnel";
import { sendSlackMessage } from "@/lib/notifications/slack";

interface FunnelAlertError {
  step?: string;
  reason: string;
}

/// Slack 본문 빌더 — R4 / 금칙어 검증을 위해 export 노출.
export function buildFunnelAlertMessage(args: {
  alertDate: string; // 어제 (YYYY-MM-DD UTC)
  baselineDate: string; // 그제 (YYYY-MM-DD UTC)
  items: FunnelAlertItem[];
}): string {
  const lines: string[] = [
    ":bar_chart: 퍼널 CVR 일간 ±20% 변동 alert",
    `• 기준일: ${args.alertDate} (UTC)`,
    `• baseline: ${args.baselineDate} (UTC, 직전일)`,
    `• 임계: |Δ| > 20%p 또는 |Δ/baseline| > 20%`,
    "",
  ];
  for (const it of args.items) {
    const arrow = it.direction === "up" ? "▲" : "▼";
    const rel =
      it.deltaRelative === null ? "n/a" : `${it.deltaRelative.toFixed(1)}%`;
    lines.push(
      `${arrow} ${FUNNEL_STEP_LABEL[it.step]} (${it.step}): ` +
        `${(it.baselineConversion * 100).toFixed(1)}% → ` +
        `${(it.targetConversion * 100).toFixed(1)}% ` +
        `(Δ ${it.deltaPp.toFixed(1)}%p, rel ${rel})`,
    );
  }
  return lines.join("\n");
}

export async function GET(request: Request) {
  const auth = verifyCronSecret(request);
  if (!auth.ok) {
    return NextResponse.json({ error: "UNAUTHORIZED", reason: auth.reason }, { status: 401 });
  }

  const start = Date.now();
  const now = new Date();
  const todayStart = toDayStartUtc(now);
  const yesterdayStart = addUtcDays(todayStart, -1);
  const dayBeforeStart = addUtcDays(todayStart, -2);

  const errors: FunnelAlertError[] = [];
  let alertsSent = 0;
  let skipReason: string | null = null;

  try {
    const [target, baseline] = await Promise.all([
      aggregateFunnel({ from: yesterdayStart, to: todayStart }),
      aggregateFunnel({ from: dayBeforeStart, to: yesterdayStart }),
    ]);

    if (target.totalUsers === 0) {
      skipReason = "no_target_data";
      return NextResponse.json({
        job: "funnel-alert",
        skipped: true,
        reason: skipReason,
        alertDate: target.date,
        baselineDate: baseline.date,
        alertsSent: 0,
        errors: [],
        durationMs: Date.now() - start,
      });
    }
    if (baseline.totalUsers === 0) {
      skipReason = "no_baseline_data";
      return NextResponse.json({
        job: "funnel-alert",
        skipped: true,
        reason: skipReason,
        alertDate: target.date,
        baselineDate: baseline.date,
        alertsSent: 0,
        errors: [],
        durationMs: Date.now() - start,
      });
    }

    const deltas = compareConversions(baseline, target);
    const items = pickAlertSteps(deltas);

    if (items.length === 0) {
      return NextResponse.json({
        job: "funnel-alert",
        skipped: false,
        reason: "no_significant_delta",
        alertDate: target.date,
        baselineDate: baseline.date,
        scannedSteps: deltas.length,
        alertsSent: 0,
        errors: [],
        durationMs: Date.now() - start,
      });
    }

    // 단일 Slack 메시지에 모든 step 묶음 — Slack 폭주 방지.
    const text = buildFunnelAlertMessage({
      alertDate: target.date,
      baselineDate: baseline.date,
      items,
    });
    try {
      const slackResult = await sendSlackMessage(text);
      if (slackResult.ok) {
        alertsSent = 1;
      } else {
        errors.push({
          reason: slackResult.skipped
            ? "slack_skipped"
            : `slack_failed:${slackResult.error ?? "unknown"}`,
        });
      }
    } catch (err) {
      errors.push({
        reason: `slack_exception:${err instanceof Error ? err.message : String(err)}`,
      });
    }

    return NextResponse.json({
      job: "funnel-alert",
      skipped: false,
      alertDate: target.date,
      baselineDate: baseline.date,
      scannedSteps: deltas.length,
      triggeredSteps: items.length,
      alertsSent,
      errors,
      durationMs: Date.now() - start,
    });
  } catch (err) {
    console.error("funnel-alert: aggregate 실패", err);
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}
