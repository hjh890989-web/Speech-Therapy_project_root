// FR-C-005 — 금칙어 정규식 + 화이트리스트 (CON-04, ADR-04, REQ-FUNC-013/HITL-002).
// lib/text-safety.ts (인라인 sanitize) 의 정규식 출처. proxy.ts 에서도 import.
//
// Sprint 1: lib/text-safety.ts 가 페이지 인라인에서 사용.
// P1: proxy.ts 가 응답 본문 스트리밍 스캔에 사용 (Sprint 1 엔 placeholder).

/// 1차 금칙어: 의료·진단 단정 표현.
export const PRIMARY_BANNED = /(진단|장애|치료|환자|병|증상|처방|병원)/g;

/// 2차 금칙어: 부정·낙인 표현.
export const SECONDARY_BANNED = /(아프|장애아|문제아|이상)/g;

/// 화이트리스트: 의료적 표현이 아닌 직업·장소·과목 명사. 정규식 매칭 후 제외.
/// 예: "치료실"(장소), "치료사"(직업), "병행"(다른 의미) 은 차단 대상 아님.
const WHITELIST_PATTERNS: RegExp[] = [
  /치료사/,
  /치료실/,
  /언어치료/,
  /병행/,
  /병아리/,
  /이상해/,
];

/// 입력 텍스트에서 금칙어 매칭 위치 모두 반환.
/// 화이트리스트 패턴이 같은 영역을 덮으면 결과에서 제외.
export interface BannedMatch {
  /// 1차 금칙어 또는 2차 금칙어 어떤 정규식이 매칭되었는지.
  tier: "primary" | "secondary";
  /// 매칭된 텍스트.
  match: string;
  /// 시작 인덱스.
  index: number;
}

export function findBannedTerms(text: string): BannedMatch[] {
  if (!text) return [];

  const allowedRanges: Array<[number, number]> = [];
  for (const pattern of WHITELIST_PATTERNS) {
    const regex = new RegExp(pattern.source, "g");
    let m;
    while ((m = regex.exec(text)) !== null) {
      allowedRanges.push([m.index, m.index + m[0].length]);
    }
  }
  const isAllowed = (start: number, end: number): boolean =>
    allowedRanges.some(([a, b]) => start >= a && end <= b);

  const matches: BannedMatch[] = [];
  const scan = (re: RegExp, tier: "primary" | "secondary") => {
    const regex = new RegExp(re.source, "g");
    let m;
    while ((m = regex.exec(text)) !== null) {
      if (isAllowed(m.index, m.index + m[0].length)) continue;
      matches.push({ tier, match: m[0], index: m.index });
    }
  };
  scan(PRIMARY_BANNED, "primary");
  scan(SECONDARY_BANNED, "secondary");
  return matches.sort((a, b) => a.index - b.index);
}

/// true 면 금칙어 발견.
export function hasBannedTerm(text: string): boolean {
  return findBannedTerms(text).length > 0;
}
