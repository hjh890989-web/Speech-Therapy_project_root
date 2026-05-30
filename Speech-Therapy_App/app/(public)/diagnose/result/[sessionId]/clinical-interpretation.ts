// CL-03 활성화 — articulation 임상 밴드 → 부모 안내 카피 (ADR-04 치환).
//
// KOPLAC 임상 자문 검증 완료(2026-05-30) → lib/diagnose/clinical 의 검증된 cutoff 를
// 결과 페이지 해석에 가산. **점수 숫자는 바꾸지 않음** (additive 표시 전용 — ScoreCard 는 raw).
//
// CL-02 발달 위계(display-only): ctx(음소·연령) 제공 시, 해당 음소가 아동 연령에서 아직 발달적으로
//   기대되면 *밴드/카피만* 완화한다(부모를 발달적 오류로 과하게 놀라게 하지 않기). 채점·escalation·
//   저장은 raw 기준(app/actions/diagnosis.ts) — floor 가 HITL 을 삼키던 회귀(적대적 검증 2026-05-30)를
//   피하려 발달 보정을 display 로만 한정. atypical(비발달적) 오류 분리는 C단계(CL-01/04) 작업.
//
// ADR-04 / CON-04: 금칙어("치료"/"진단"/"장애"/"지연"/"지체") 0건 — 밴드(normal/watch/delayed)를
// 부모 친화 격려 톤으로 치환.

import {
  mapArticulationBand,
  applyDevelopmentalAdjustment,
  type ClinicalBand,
} from "@/lib/diagnose/clinical";

export interface ArticulationInterpretation {
  band: ClinicalBand;
  label: string;
  emoji: string;
}

/// CL-02 발달 보정용 표시 맥락 — 밴드 완화 판정에만 사용(점수 숫자 무변경).
export interface DevelopmentalDisplayContext {
  phoneme: string;
  ageMonths: number;
}

/// articulation 점수(0~100, PCC-like) → 임상 밴드 + ADR-04 치환 안내 카피.
/// ctx 제공 시 CL-02 발달 위계로 *밴드 산정 점수만* 완화(raw 숫자 표시는 호출 측 ScoreCard 가 유지).
export function articulationInterpretation(
  articulationScore: number,
  ctx?: DevelopmentalDisplayContext,
): ArticulationInterpretation {
  const bandScore = ctx
    ? applyDevelopmentalAdjustment(articulationScore, ctx.phoneme, ctx.ageMonths)
    : articulationScore;
  const band = mapArticulationBand(bandScore);
  switch (band) {
    case "normal":
      return { band, label: "또래와 비슷한 발음 수준이에요.", emoji: "🌟" };
    case "watch":
      return { band, label: "조금 더 연습하면 더 또렷해질 거예요.", emoji: "👍" };
    case "delayed":
      return { band, label: "미션으로 꾸준히 함께 연습하면 도움이 돼요.", emoji: "🌱" };
  }
}
