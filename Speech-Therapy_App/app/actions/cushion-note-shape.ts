// FR-PERF-3-USE-SERVER-REFACTOR — cushion-note Server Action 의 shape (CLIENT-SAFE).
//
// Next.js 16 + Turbopack 의 "use server" 파일은 async function 외 export 금지 룰
// 정합 위해 분리. 본 파일은 "use server" directive 미포함 — class / type / interface
// 모두 안전하게 export 가능.
//
// CushionAuthError 는 _server-side_ 환경에서 throw + catch 됨 — Client 측에서 instanceof
// 검사는 일반적으로 안 함 (Server Action 결과 객체 만으로 분기). 단 import path 호환을
// 위해 본 shape 모듈로 이동.

import type {
  CushionFallbackReason,
  CushionSource,
} from "@/lib/cushion/generate";
import type { CushionEmailResult } from "@/lib/cushion/email";

export interface GenerateCushionNoteResult {
  text: string;
  source: CushionSource;
  fallbackReason: CushionFallbackReason | null;
  evaluationResultId: string;
}

export class CushionAuthError extends Error {
  constructor(
    message: string,
    public readonly status: 401 | 403 | 404,
  ) {
    super(message);
    this.name = "CushionAuthError";
  }
}

export interface SendCushionNoteToParentResult extends CushionEmailResult {
  evaluationResultId: string;
}
