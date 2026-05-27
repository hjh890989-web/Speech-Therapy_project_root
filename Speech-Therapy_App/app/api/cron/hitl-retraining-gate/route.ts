// FR-C-HITL-006 — HITL 재학습 3 게이트 Daily Cron (V07 §5.3.3).
//
// Schedule:
//   - 본 Cron 은 GitHub Actions external-crons.yml 에 등록 (daily 03:30 KST).
//   - Vercel Hobby 2 cron 한도 (audio-cleanup + weekly-reports) 외 — 외부 cron 활용.
//
// 동작:
//   1) Cron Secret 검증 (verifyCronSecret).
//   2) 직전 24h cohort 조회 (lib/hitl/retraining.ts).
//   3) 3 게이트 검증 (lib/hitl/retraining-gate.ts).
//   4) Slack alert — 통과/미통과 모두 발송 (운영팀 + 위탁 ML 가시성).
//   5) FR-C-HITL-007: expert 다양성 별도 alert — Phase 임계 위반 시.
//
// R4: 자녀 식별 정보 (sessionId 제외) 미노출 — 통계 + period 만.
//
// Refs: TASK_FR-C-HITL-006.md, V07 §5.3.3, ADR-11.

import { NextResponse } from "next/server";
import { verifyCronSecret } from "@/lib/cron-auth";
import {
  listRetrainingCohort,
  aggregateByExpert,
} from "@/lib/hitl/retraining";
import {
  evaluateRetrainingGate,
  buildRetrainingGateMessage,
} from "@/lib/hitl/retraining-gate";
import {
  evaluateDiversityVerdict,
  buildDiversityAlertMessage,
} from "@/lib/hitl/expert-diversity";
import { sendSlackMessage } from "@/lib/notifications/slack";

const WINDOW_DAYS = 7; // 직전 7일 cohort — 3 게이트 검증 입력.

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
  const since = new Date(now.getTime() - WINDOW_DAYS * 24 * 60 * 60 * 1000);

  // Phase 분기 — env 또는 default Phase 1 (운영 정책 변경 시 env override).
  const phase: "phase1" | "phase2" =
    process.env.HITL_DIVERSITY_PHASE === "phase2" ? "phase2" : "phase1";

  try {
    // (1) cohort 조회.
    const cohort = await listRetrainingCohort({ since });
    const diffPctValues = cohort.map((c) => c.diffPct);
    const expertDistribution = await aggregateByExpert(since);

    // (2) 3 게이트 검증.
    const gateResult = evaluateRetrainingGate({
      diffPctValues,
      expertDistribution,
      phase,
    });

    const period = {
      from: since.toISOString(),
      to: now.toISOString(),
    };

    // (3) Slack alert — 통과/미통과 모두 발송.
    const gateMessage = buildRetrainingGateMessage(gateResult, period);
    const gateSlackResult = await sendSlackMessage(gateMessage);

    // (4) FR-C-HITL-007 — 다양성 임계 위반 별도 alert (게이트 3 미통과 시).
    let diversityAlertSent = false;
    if (!gateResult.gate3Passed) {
      const verdict = evaluateDiversityVerdict(gateResult.diversity, phase);
      if (!verdict.passed) {
        const diversityMsg = buildDiversityAlertMessage(gateResult.diversity, verdict);
        const r = await sendSlackMessage(diversityMsg);
        diversityAlertSent = r.ok;
      }
    }

    // (5) 텔레메트리 (Vercel Logs).
    console.log(
      JSON.stringify({
        level: "info",
        event: "hitl_retraining_gate_evaluated",
        properties: {
          period,
          phase,
          allPassed: gateResult.allPassed,
          gate1MeanDiffPct: gateResult.gate1MeanDiffPct,
          gate1Passed: gateResult.gate1Passed,
          gate2Count: gateResult.gate2Count,
          gate2Passed: gateResult.gate2Passed,
          gate3Passed: gateResult.gate3Passed,
          uniqueExpertCount: gateResult.diversity.uniqueExpertCount,
          hhi: gateResult.diversity.hhi,
          gini: gateResult.diversity.gini,
          top3SharePct: gateResult.diversity.top3SharePct,
          slackSent: gateSlackResult.ok,
          diversityAlertSent,
          elapsedMs: Date.now() - start,
        },
      }),
    );

    return NextResponse.json({
      ok: true,
      allPassed: gateResult.allPassed,
      gate1: { mean: gateResult.gate1MeanDiffPct, passed: gateResult.gate1Passed },
      gate2: { count: gateResult.gate2Count, passed: gateResult.gate2Passed },
      gate3: {
        passed: gateResult.gate3Passed,
        reason: gateResult.gate3Reason,
        hhi: gateResult.diversity.hhi,
        gini: gateResult.diversity.gini,
        top3SharePct: gateResult.diversity.top3SharePct,
        uniqueExpertCount: gateResult.diversity.uniqueExpertCount,
      },
      slackSent: gateSlackResult.ok,
      diversityAlertSent,
      period,
      phase,
    });
  } catch (err) {
    console.error("[FR-C-HITL-006] cron failed:", err);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
