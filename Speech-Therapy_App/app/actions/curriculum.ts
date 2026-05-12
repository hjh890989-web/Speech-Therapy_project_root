"use server";

// API-002 — getCurriculum() Server Action 시그니처 stub.
// 구현은 FR-C-008 책임.

import type { CurriculumInput, CurriculumOutput } from "@/lib/schemas/curriculum";
import { CurriculumInputSchema } from "@/lib/schemas/curriculum";

export async function getCurriculum(
  rawInput: unknown,
): Promise<CurriculumOutput> {
  const _input: CurriculumInput = CurriculumInputSchema.parse(rawInput);

  // FR-C-008 구현:
  //    - recentSessions 분석 → 3연속 실패 / 5연속 성공 패턴 판정
  //    - DB-006 MissionCard 카탈로그 조회 (음소 + 난이도 + 월령 매칭)
  //    - reason 분기: continue / level_down / level_up / phoneme_switch
  throw new Error("Not implemented — see FR-C-008");
}
