// FR-C-001 §3단계 — 또래 백분위 계산.
// Sprint 1 초기: 시드 데이터 부족 → 정규분포 가정 + 월령 기반 평균 곡선.
// Sprint 2~ 데이터 누적 시 z-score 실측 기반으로 교체.
//
// ⚠️ REQ-FUNC-CL-13 (Peña 데이터셋 원칙): 실측 규준 표본은 *정상 발달 아동 위주*여야 함.
//    현 실측 경로는 그 제약 미준수 placeholder — 하단 computePeerPercentile §1 주석 참조.

import { prisma } from "@/lib/db";

/// 표준정규분포 누적분포함수 (CDF). 백분위 환산용.
/// Abramowitz & Stegun 7.1.26 근사.
function normalCdf(z: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989422804014327 * Math.exp(-(z * z) / 2);
  const p =
    d *
    t *
    (0.31938153 +
      t *
        (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
  return z >= 0 ? 1 - p : p;
}

/// 만 24~84개월 구간의 발달 곡선 단순 모델.
/// 월령 ↑ → 평균 점수 ↑ (시그모이드 비슷한 단순 선형).
/// 표준편차는 15 점 (정규분포 가정).
function modelMean(childAgeMonths: number): number {
  // 24개월=40점, 84개월=85점 사이를 선형 보간.
  const clamped = Math.max(24, Math.min(84, childAgeMonths));
  return 40 + ((clamped - 24) / 60) * 45;
}

const MODEL_STD = 15;

/// 점수와 월령으로부터 또래 백분위 (0~100) 산출.
/// Sprint 1 초기엔 모델 기반. 향후 evaluation_results 누적 후 실측 기반으로 교체.
export async function computePeerPercentile(args: {
  childAgeMonths: number;
  targetPhoneme: string;
  compositeScore: number;
}): Promise<number> {
  // 1) 실측 시도 (해당 월령 + 음소).
  const recentSamples = await safeFindManySamples(args).catch(() => []);

  // ⚠️ REQ-FUNC-CL-13 (Peña, Spaulding & Plante 2006) — 규준 표본은 *정상 발달 아동 위주*여야 한다.
  //    현 경로는 ±6개월·동일음소의 **전 evaluationResult**(정상+지연 혼재)를 규준 표본으로 사용 →
  //    비정형 아동 포함으로 판별 정확도 저하(false +/- 양방향) 위험 = Peña 원칙 미준수 placeholder.
  //    [후속] 정상 발달 라벨링 메커니즘 도입 후 safeFindManySamples 를 정상 표본으로 제한할 것
  //    (라벨 부재 동안 본 경로 유지 — 모델 fallback 보다 표본 효용이 크다는 운영 판단). 채점·HITL 무관.
  if (recentSamples.length >= 30) {
    // 충분한 표본 — 경험적 백분위 (compositeScore 보다 작은 비율).
    const below = recentSamples.filter((s) => s < args.compositeScore).length;
    return Math.max(0, Math.min(100, Math.round((below / recentSamples.length) * 100)));
  }

  // 2) 모델 기반 fallback.
  const mean = modelMean(args.childAgeMonths);
  const z = (args.compositeScore - mean) / MODEL_STD;
  const percentile = normalCdf(z) * 100;
  return Math.max(0, Math.min(100, Math.round(percentile * 10) / 10));
}

async function safeFindManySamples(args: {
  childAgeMonths: number;
  targetPhoneme: string;
}): Promise<number[]> {
  // ±6개월 윈도우, 동일 음소.
  const rows = await prisma.evaluationResult.findMany({
    where: {
      childAgeMonths: {
        gte: args.childAgeMonths - 6,
        lte: args.childAgeMonths + 6,
      },
      targetPhoneme: args.targetPhoneme,
    },
    select: { articulationScore: true, linguisticScore: true, acousticScore: true },
    take: 500,
  });
  return rows.map((r) => (r.articulationScore + r.linguisticScore + r.acousticScore) / 3);
}

/// 3축 점수 → 단일 종합 점수 (단순 평균).
export function compositeScore(scores: {
  articulationScore: number;
  linguisticScore: number;
  acousticScore: number;
}): number {
  return (scores.articulationScore + scores.linguisticScore + scores.acousticScore) / 3;
}
