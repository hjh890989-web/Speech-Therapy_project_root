// CON-04 — 금칙어 인라인 sanitize + 안전 문구 대체.
// FR-Q-002 (페이지 인라인) 가 직접 사용. 정규식·화이트리스트는 lib/forbidden-words.ts 단일 소스.
// P1 단계에서 proxy.ts 응답 스캔과 동일 정규식 공유.

import { hasBannedTerm } from "@/lib/forbidden-words";

const SAFE_FALLBACK = "잘 발음하고 있어요. 즐겁게 한 번 더 시도해 볼까요?";

/// 입력 텍스트에 금칙어가 있으면 true (화이트리스트 적용).
export function containsBannedTerms(text: string): boolean {
  return hasBannedTerm(text);
}

/// 금칙어 포함 시 안전 문구로 대체. 그렇지 않으면 원문 그대로.
export function sanitizeUserFacingText(text: string | null | undefined): string {
  if (!text) return SAFE_FALLBACK;
  return containsBannedTerms(text) ? SAFE_FALLBACK : text;
}
