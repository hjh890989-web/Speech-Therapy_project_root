// FR-C-031 — EXP-2 검증 자동화 (V07 신규).
//
// EXP-2 가설 (V07 §6.6):
//   "예측 시뮬레이션 → M3 리텐션 향상 / 클릭 유저 익월 결제 유지율 비클릭 대비 ≥ 20%p↑"
//
// 본 모듈은 EXP-2 의 _계측 로직_ 만 — 실 데이터 수집은 Vercel Analytics (Phase 0)
// 또는 Amplitude (Phase 1+, V07 §3.3 External Systems) 에서.
//
// 책임:
//   - cohort 산출: prediction_cta_clicked 이벤트 발생 user vs 미발생 user
//   - retention 계산: 익월 결제 유지율 (또는 활성 사용자 유지율)
//   - 차이 (diffPp) 산출 + 임계 검증 (≥ 20%p ⇒ EXP-2 통과)
//
// pure function:
//   - 입력 (cohort 정의 + retention 데이터) → 출력 (검증 결과) 만 — Prisma / fetch 0건.
//   - 호출 측이 Amplitude / Vercel Analytics export API 또는 직접 DB query 로
//     데이터 준비 후 본 helper 호출.
//
// R4 정합:
//   - 입력은 _aggregate 수치_ 만 (cohort 크기 + retention 카운트) — 개별 userId 미포함.
//   - 본 모듈은 PII 미접근.
//
// Refs: TASK_FR-C-031.md, REQ-FUNC-044/045, V07 §6.6 EXP-2.

/** EXP-2 cohort 의 retention 입력. */
export interface CohortRetentionInput {
  /// `prediction_cta_clicked` 발생 user 의 cohort.
  clickers: {
    /// cohort 전체 크기 (예측 페이지 진입 + CTA 클릭한 user 수).
    total: number;
    /// 익월 (M+1) 결제 활성 user 수.
    retained: number;
  };
  /// `prediction_cta_clicked` 미발생 (예측 페이지 진입했지만 CTA 미클릭) cohort.
  nonClickers: {
    total: number;
    retained: number;
  };
}

/** EXP-2 검증 결과. */
export interface Exp2VerdictResult {
  /// clickers cohort 의 retention rate (0~1).
  clickersRate: number;
  /// nonClickers cohort 의 retention rate (0~1).
  nonClickersRate: number;
  /// diff in percentage points (clickers - nonClickers, 0~100 scale).
  diffPp: number;
  /// 통계적 충분성 검증 (각 cohort total ≥ 80 — V07 §6.6 EXP-2 n=800 4~8주 기준).
  hasSufficientSampleSize: boolean;
  /// EXP-2 가설 통과 여부 — diffPp ≥ THRESHOLD_PP AND hasSufficientSampleSize.
  passed: boolean;
  /// 통과 임계 (default 20%p, V07 §6.6 EXP-2).
  thresholdPp: number;
  /// 진단 라벨 — UI / Slack 표시용.
  verdict: "passed" | "below_threshold" | "insufficient_sample";
}

/**
 * EXP-2 cohort 차이 검증.
 *
 * @param input cohort 별 total / retained 카운트
 * @param thresholdPp 통과 임계 (default 20%p, V07 §6.6)
 * @param minSampleSize 각 cohort 의 최소 크기 (default 80)
 */
export function evaluateExp2Verdict(
  input: CohortRetentionInput,
  thresholdPp = 20,
  minSampleSize = 80,
): Exp2VerdictResult {
  const clickersRate = safeRate(input.clickers.retained, input.clickers.total);
  const nonClickersRate = safeRate(input.nonClickers.retained, input.nonClickers.total);
  const diffPp = (clickersRate - nonClickersRate) * 100;

  const hasSufficientSampleSize =
    input.clickers.total >= minSampleSize && input.nonClickers.total >= minSampleSize;

  const passedThreshold = diffPp >= thresholdPp;
  const passed = hasSufficientSampleSize && passedThreshold;

  let verdict: Exp2VerdictResult["verdict"];
  if (!hasSufficientSampleSize) {
    verdict = "insufficient_sample";
  } else if (passedThreshold) {
    verdict = "passed";
  } else {
    verdict = "below_threshold";
  }

  return {
    clickersRate,
    nonClickersRate,
    diffPp,
    hasSufficientSampleSize,
    passed,
    thresholdPp,
    verdict,
  };
}

/** total 0 일 때 0 반환 (NaN 방지). */
function safeRate(numerator: number, denominator: number): number {
  if (denominator <= 0) return 0;
  return numerator / denominator;
}

/**
 * EXP-2 결과의 Slack 메시지 빌더 (운영팀 보고용).
 *
 * R4: 자녀 식별 정보 0건 — aggregate 수치만 노출.
 */
export function buildExp2ReportMessage(
  result: Exp2VerdictResult,
  period: { from: string; to: string },
): string {
  const emoji = result.verdict === "passed" ? ":white_check_mark:" : ":warning:";
  const lines = [
    `${emoji} EXP-2 검증 — ${result.verdict}`,
    `• period: ${period.from} ~ ${period.to}`,
    `• clickers retention: ${(result.clickersRate * 100).toFixed(1)}%`,
    `• non-clickers retention: ${(result.nonClickersRate * 100).toFixed(1)}%`,
    `• diff: ${result.diffPp.toFixed(1)}%p (threshold: ${result.thresholdPp}%p)`,
    `• sample sufficiency: ${result.hasSufficientSampleSize ? "OK" : "INSUFFICIENT"}`,
  ];
  return lines.join("\n");
}

/**
 * EXP-2 검증 결과의 server-side console.log 텔레메트리.
 * Vercel Logs 수집 + 분석 백엔드 ingestion.
 */
export function logExp2Verdict(result: Exp2VerdictResult, period: { from: string; to: string }): void {
  try {
    console.log(
      JSON.stringify({
        level: "info",
        event: "exp2_cohort_evaluated",
        properties: {
          verdict: result.verdict,
          passed: result.passed,
          clickersRate: result.clickersRate,
          nonClickersRate: result.nonClickersRate,
          diffPp: result.diffPp,
          thresholdPp: result.thresholdPp,
          period,
        },
      }),
    );
  } catch {
    // graceful — 로깅 실패는 메인 흐름 차단 X.
  }
}
