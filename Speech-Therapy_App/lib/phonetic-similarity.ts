// Sprint 2 §2 — 한국어 발음 유사도 측정 (의도 단어 vs STT 전사 단어).
//
// 핵심 설계:
//   1. 한글 음절을 자모로 분해 (초성/중성/종성).
//   2. 음운 그룹별 가중 Levenshtein 거리.
//   3. 0~100 정규화 점수 (100 = 완전 일치, 0 = 완전 다름).
//
// Why deterministic:
//   Gemini 텍스트 기반 평가는 STT 보정으로 인해 발음 차이를 거의 반영 못함.
//   본 모듈은 STT transcript 자체가 의도 단어와 어떻게 다른지를 정량화.

const HANGUL_BASE = 0xac00;
const HANGUL_END = 0xd7a3;
const JUNG_COUNT = 21;
const JONG_COUNT = 28;

const CHO_LIST = [
  "ㄱ", "ㄲ", "ㄴ", "ㄷ", "ㄸ", "ㄹ", "ㅁ", "ㅂ", "ㅃ", "ㅅ",
  "ㅆ", "ㅇ", "ㅈ", "ㅉ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ",
] as const;

const JUNG_LIST = [
  "ㅏ", "ㅐ", "ㅑ", "ㅒ", "ㅓ", "ㅔ", "ㅕ", "ㅖ", "ㅗ", "ㅘ",
  "ㅙ", "ㅚ", "ㅛ", "ㅜ", "ㅝ", "ㅞ", "ㅟ", "ㅠ", "ㅡ", "ㅢ", "ㅣ",
] as const;

const JONG_LIST = [
  "", "ㄱ", "ㄲ", "ㄳ", "ㄴ", "ㄵ", "ㄶ", "ㄷ", "ㄹ", "ㄺ",
  "ㄻ", "ㄼ", "ㄽ", "ㄾ", "ㄿ", "ㅀ", "ㅁ", "ㅂ", "ㅄ", "ㅅ",
  "ㅆ", "ㅇ", "ㅈ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ",
] as const;

// 같은 그룹 내 자모 치환은 완전 다른 자모 치환 (1.0) 의 절반 (0.5) 비용.
// 임상적 근거: 영유아 발음에서 흔히 혼동되는 자질군.
const PHONETIC_GROUPS: ReadonlyArray<ReadonlySet<string>> = [
  new Set(["ㅅ", "ㅆ", "ㅈ", "ㅉ", "ㅊ"]),  // sibilants / affricates
  new Set(["ㄱ", "ㄲ", "ㅋ"]),                // velar stops
  new Set(["ㄷ", "ㄸ", "ㅌ"]),                // alveolar stops
  new Set(["ㅂ", "ㅃ", "ㅍ"]),                // bilabial stops
  new Set(["ㄴ", "ㅁ", "ㅇ"]),                // nasals
  new Set(["ㄹ", "ㄴ"]),                      // liquid / nasal 혼동
  new Set(["ㅏ", "ㅑ"]),                      // a / ya
  new Set(["ㅓ", "ㅕ"]),                      // eo / yeo
  new Set(["ㅗ", "ㅛ"]),                      // o / yo
  new Set(["ㅜ", "ㅠ"]),                      // u / yu
];

function isSamePhoneticGroup(a: string, b: string): boolean {
  if (a === b) return false;
  return PHONETIC_GROUPS.some((g) => g.has(a) && g.has(b));
}

function substitutionCost(a: string, b: string): number {
  if (a === b) return 0;
  if (isSamePhoneticGroup(a, b)) return 0.5;
  return 1;
}

/**
 * 한글 문자열을 자모 배열로 분해.
 * 한글 음절이 아닌 문자 (공백 / 영문 / 숫자 / 구두점) 는 그대로 1 자모로 취급.
 */
export function decomposeHangul(text: string): string[] {
  const jamos: string[] = [];
  for (const ch of text) {
    const code = ch.codePointAt(0);
    if (code === undefined) continue;
    if (code < HANGUL_BASE || code > HANGUL_END) {
      // 공백 / 구두점은 비교에서 노이즈 — 알파벳/숫자는 그대로 비교 대상.
      if (/\s|[.,!?·]/.test(ch)) continue;
      jamos.push(ch);
      continue;
    }
    const offset = code - HANGUL_BASE;
    const cho = Math.floor(offset / (JUNG_COUNT * JONG_COUNT));
    const jung = Math.floor((offset % (JUNG_COUNT * JONG_COUNT)) / JONG_COUNT);
    const jong = offset % JONG_COUNT;
    jamos.push(CHO_LIST[cho]);
    jamos.push(JUNG_LIST[jung]);
    if (jong > 0) jamos.push(JONG_LIST[jong]);
  }
  return jamos;
}

function weightedLevenshtein(a: ReadonlyArray<string>, b: ReadonlyArray<string>): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  // dp[i][j] = a[0..i) vs b[0..j) 의 최소 비용.
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const sub = substitutionCost(a[i - 1], b[j - 1]);
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,        // deletion
        dp[i][j - 1] + 1,        // insertion
        dp[i - 1][j - 1] + sub,  // substitution / match
      );
    }
  }
  return dp[m][n];
}

/**
 * 두 한국어 단어의 발음 유사도 (0~100 정수).
 *  - 100: 자모 완전 일치
 *  - 0: 모든 자모 다름 (또는 한쪽 빈 문자열)
 *
 * 음운 그룹 가중치 적용 — 같은 그룹 (예: ㅅ↔ㅈ) 치환은 다른 그룹 치환의 절반 페널티.
 */
export function computePhoneticSimilarity(intendedWord: string, transcribedWord: string): number {
  const intendedJamos = decomposeHangul(intendedWord);
  const transcribedJamos = decomposeHangul(transcribedWord);

  if (intendedJamos.length === 0 || transcribedJamos.length === 0) return 0;

  const distance = weightedLevenshtein(intendedJamos, transcribedJamos);
  const maxLen = Math.max(intendedJamos.length, transcribedJamos.length);
  const similarity = 100 * (1 - distance / maxLen);

  return Math.max(0, Math.min(100, Math.round(similarity)));
}

/** 결과 페이지 시각화용 — 자모 배열 + 정합/불일치 여부 동시 노출. */
export interface PhoneticDiff {
  intendedJamos: string[];
  transcribedJamos: string[];
  similarity: number;
  isPerfectMatch: boolean;
}

export function analyzePhoneticDiff(
  intendedWord: string,
  transcribedWord: string,
): PhoneticDiff {
  const intendedJamos = decomposeHangul(intendedWord);
  const transcribedJamos = decomposeHangul(transcribedWord);
  const similarity = computePhoneticSimilarity(intendedWord, transcribedWord);
  return {
    intendedJamos,
    transcribedJamos,
    similarity,
    isPerfectMatch:
      intendedJamos.length === transcribedJamos.length &&
      intendedJamos.every((j, i) => j === transcribedJamos[i]),
  };
}
