"use server";

// API-001 — analyzeDiagnosis() Server Action 시그니처 stub.
// 구현은 FR-C-001 책임. 본 파일은 contract entry point 만 정의.

import type { DiagnosisInput, DiagnosisOutput } from "@/lib/schemas/diagnosis";
import { DiagnosisInputSchema } from "@/lib/schemas/diagnosis";

export async function analyzeDiagnosis(
  rawInput: unknown,
): Promise<DiagnosisOutput> {
  // 1) Zod 입력 검증 (INVALID_INPUT 에러 매핑은 호출 측 책임).
  const _input: DiagnosisInput = DiagnosisInputSchema.parse(rawInput);

  // 2) FR-C-001 구현:
  //    - lib/ai/gemini.ts 호출 (API-011)
  //    - 3축 점수 계산 + peerPercentile + confidence
  //    - DB-005 evaluation_results INSERT (lib/db.ts)
  //    - confidence < 70 시 lib/hitl.ts enqueueForReview (FR-C-002)
  //    - aiCushionText CON-04 금칙어 검증
  throw new Error("Not implemented — see FR-C-001");
}
