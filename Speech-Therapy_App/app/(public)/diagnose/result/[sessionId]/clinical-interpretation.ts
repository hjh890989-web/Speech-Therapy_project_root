// CL-03 활성화 — articulation 임상 밴드 → 부모 안내 카피 (ADR-04 치환).
//
// KOPLAC 임상 자문 검증 완료(2026-05-30) → lib/diagnose/clinical 의 검증된 cutoff 를
// 결과 페이지 해석에 가산. **점수는 바꾸지 않음** (additive 표시 전용).
//
// ADR-04 / CON-04: 금칙어("치료"/"진단"/"장애"/"지연"/"지체") 0건 — 밴드(normal/watch/delayed)를
// 부모 친화 격려 톤으로 치환.

import { mapArticulationBand, type ClinicalBand } from "@/lib/diagnose/clinical";

export interface ArticulationInterpretation {
  band: ClinicalBand;
  label: string;
  emoji: string;
}

/// articulation 점수(0~100, PCC-like) → 임상 밴드 + ADR-04 치환 안내 카피.
export function articulationInterpretation(
  articulationScore: number,
): ArticulationInterpretation {
  const band = mapArticulationBand(articulationScore);
  switch (band) {
    case "normal":
      return { band, label: "또래와 비슷한 발음 수준이에요.", emoji: "🌟" };
    case "watch":
      return { band, label: "조금 더 연습하면 더 또렷해질 거예요.", emoji: "👍" };
    case "delayed":
      return { band, label: "미션으로 꾸준히 함께 연습하면 도움이 돼요.", emoji: "🌱" };
  }
}
