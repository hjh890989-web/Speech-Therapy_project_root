// FR-C-HITL-007 — expert 다양성 독립 Daily Cron (V07 §5.5).
//
// retraining-gate cron 과 _독립_ — 재학습 볼륨(게이트 1/2)과 무관하게 expert 분포 편향만 모니터링.
//   (retraining-gate 는 3 게이트 통과 맥락에서만 다양성을 부수 체크 → 볼륨 부족 시 편향을 놓침.)
//
// Schedule:
//   - GitHub Actions external-crons.yml 등록 권장 (daily 05:00 KST). Vercel Hobby 2 cron 한도 외.
//
// 동작:
//   1) CRON_SECRET 검증.
//   2) 30일 윈도우 expert 분포 집계 (aggregateByExpert).
//   3) getCurrentPhase (ADR-13) → Phase 1(Top-3 ≤ 60%) / Phase 2(HHI ≤ 0.3 + Gini ≤ 0.4) 분기.
//   4) 임계 위반 시 Slack alert — 멱등성(7일 내 재알림 차단).
//
// R4: 응답 / 로그 / Slack 에 expertId 미노출 — 집계 통계(top3/HHI/Gini/count)만.
// CON-04: Slack 메시지 금칙어 0건 (buildDiversityAlertMessage — 통계 문구만).
//
// Phase 2 자동조치(HHI≥2500 assignment 차단 / Gini>0.4 부스트)는 후속(스키마 확장 필요) — 본 PR 미포함.
//
// Refs: TASK_FR-C-HITL-007.md, V07 §5.5, ADR-11, ADR-13.

import { NextResponse } from "next/server";

import {
  getCurrentPhase,
  isWithinIdempotencyWindow,
  setSystemConfig,
  SYSTEM_CONFIG_KEYS,
} from "@/lib/config/system-config";
import { verifyCronSecret } from "@/lib/cron-auth";
import {
  buildDiversityAlertMessage,
  calculateExpertDiversity,
  evaluateDiversityVerdict,
} from "@/lib/hitl/expert-diversity";
import { aggregateByExpert } from "@/lib/hitl/retraining";
import { sendSlackMessage } from "@/lib/notifications/slack";

// Prisma 7 — Node 런타임. 매 요청 fresh.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const WINDOW_DAYS = 30; // HITL-007 — 30일 윈도우 expert 분포.
const ALERT_IDEMPOTENCY_DAYS = 7; // 위반 알림 7일 내 중복 차단.

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

  try {
    const phase = await getCurrentPhase();
    const distribution = await aggregateByExpert(since);
    const diversity = calculateExpertDiversity(distribution);
    const verdict = evaluateDiversityVerdict(diversity, phase);

    // 위반 시 alert — 멱등성(7일 내 재알림 차단).
    let alertSent = false;
    let idempotencySkip = false;
    if (!verdict.passed) {
      const within = await isWithinIdempotencyWindow(
        SYSTEM_CONFIG_KEYS.HITL_DIVERSITY_ALERTED_AT,
        ALERT_IDEMPOTENCY_DAYS,
        now,
      );
      if (within) {
        idempotencySkip = true;
      } else {
        const msg = buildDiversityAlertMessage(diversity, verdict);
        const r = await sendSlackMessage(msg);
        alertSent = r.ok;
        try {
          await setSystemConfig(
            SYSTEM_CONFIG_KEYS.HITL_DIVERSITY_ALERTED_AT,
            now.toISOString(),
          );
        } catch (err) {
          console.error("[FR-C-HITL-007] alerted_at 기록 실패:", err);
        }
      }
    }

    // 텔레메트리 — R4: expertId 미노출 (집계 통계만).
    console.log(
      JSON.stringify({
        level: "info",
        event: "hitl_expert_diversity_evaluated",
        properties: {
          phase,
          passed: verdict.passed,
          uniqueExpertCount: diversity.uniqueExpertCount,
          totalCount: diversity.totalCount,
          top3SharePct: diversity.top3SharePct,
          hhi: diversity.hhi,
          gini: diversity.gini,
          alertSent,
          idempotencySkip,
          elapsedMs: Date.now() - start,
        },
      }),
    );

    return NextResponse.json({
      ok: true,
      phase,
      passed: verdict.passed,
      reasons: verdict.reasons,
      uniqueExpertCount: diversity.uniqueExpertCount,
      totalCount: diversity.totalCount,
      top3SharePct: diversity.top3SharePct,
      hhi: diversity.hhi,
      gini: diversity.gini,
      alertSent,
      idempotencySkip,
    });
  } catch (err) {
    console.error("[FR-C-HITL-007] expert-diversity cron failed:", err);
    return NextResponse.json(
      {
        error: "INTERNAL_ERROR",
        message: err instanceof Error ? err.message : String(err),
      },
      { status: 500 },
    );
  }
}
