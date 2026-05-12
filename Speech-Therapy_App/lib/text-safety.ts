// CON-04 — 금칙어 인라인 검증 + 안전 문구 대체.
// FR-Q-002 (인라인) + FR-C-005 (Middleware, P1) 가 함께 사용.
// 의료적 단정 표현·진단 표현·자녀 식별 정보 가리키는 단어를 차단.

const BANNED_PATTERNS: RegExp[] = [
  /진단/,
  /장애/,
  /환자/,
  /질병/,
  /병원/,
  /처방/,
  /치료/,
];

const SAFE_FALLBACK = "잘 발음하고 있어요. 즐겁게 한 번 더 시도해 볼까요?";

/// 입력 텍스트에 금칙어가 있으면 true.
export function containsBannedTerms(text: string): boolean {
  return BANNED_PATTERNS.some((re) => re.test(text));
}

/// 금칙어 포함 시 안전 문구로 대체. 그렇지 않으면 원문 그대로.
export function sanitizeUserFacingText(text: string | null | undefined): string {
  if (!text) return SAFE_FALLBACK;
  return containsBannedTerms(text) ? SAFE_FALLBACK : text;
}
