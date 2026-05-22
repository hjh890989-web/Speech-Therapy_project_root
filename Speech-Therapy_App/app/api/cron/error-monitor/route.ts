// INFRA-002 + MON-002 — STT/Gemini 에러율 임계 검사 Cron.
//
// schedule (Pro 전환 시): "*/5 * * * *" (5분 주기) — STT 윈도우 5분 / Gemini 윈도우 1시간 모두 cover
// 현재 Hobby: vercel.json 등록 안 함 (수동/Preview 호출만, hitl-monitor 단일 슬롯 점유)
//
// 동작:
//   1. CRON_SECRET 검증
//   2. checkErrorThresholds() 호출 — STT (5분 3%) / Gemini (1시간 5%) 검사
//   3. 임계 초과 시 source 별 Slack alert (중복 방지: 1시간 cooldown)
//   4. 결과 JSON 응답 (모니터링 + 디버깅)
//
// 별도 task:
//   - AI Provider 자동 fallback (Gemini → OpenAI) — D4 정신상 수동 대응 우선, 별도 task

import { NextResponse } from "next/server";
import { verifyCronSecret } from "@/lib/cron-auth";
import { checkErrorThresholds, getErrorTrackingSnapshot } from "@/lib/error-tracking";

export async function GET(request: Request) {
  const auth = verifyCronSecret(request);
  if (!auth.ok) {
    return NextResponse.json({ error: "UNAUTHORIZED", reason: auth.reason }, { status: 401 });
  }

  const start = Date.now();
  try {
    const results = await checkErrorThresholds();
    const breachedCount = results.filter((r) => r.breached).length;
    const alertedCount = results.filter((r) => r.alertSent).length;

    return NextResponse.json({
      job: "error-monitor",
      breachedCount,
      alertedCount,
      results,
      snapshot: getErrorTrackingSnapshot(),
      durationMs: Date.now() - start,
    });
  } catch (err) {
    console.error("error-monitor: 실패", err);
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}
