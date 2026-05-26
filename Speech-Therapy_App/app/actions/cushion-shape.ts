// FR-PERF-3-USE-SERVER-REFACTOR — cushion Server Action 의 shape (CLIENT-SAFE).
//
// Next.js 16 + Turbopack 의 "use server" 파일은 async function 외 export 금지 룰
// 정합 위해 분리. 본 파일은 "use server" directive 미포함.

export interface GenerateCushionResult {
  aiCushionText: string;
  /** 캐시 히트 (DB 에 이미 채워져 있어 Gemini 미호출) 여부. */
  fromCache: boolean;
}
