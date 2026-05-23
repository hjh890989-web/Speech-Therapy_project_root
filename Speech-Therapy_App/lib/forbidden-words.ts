// FR-C-005 — 금칙어 정규식 + 화이트리스트 (CON-04, ADR-04, REQ-FUNC-013/HITL-002).
// lib/text-safety.ts (인라인 sanitize) 의 정규식 출처. proxy.ts 에서도 import.
//
// Sprint 1: lib/text-safety.ts 가 페이지 인라인에서 사용.
// P1: proxy.ts 가 응답 본문 스트리밍 스캔에 사용 (Sprint 1 엔 placeholder).

/// 1차 금칙어: 의료·진단 단정 표현.
/// `g` flag 는 의도적으로 미부착 — `.test()` 가 lastIndex 누적되어 false positive 발생.
/// findBannedTerms 안에서 매번 `new RegExp(source, 'g')` 로 사용한다.
export const PRIMARY_BANNED = /(진단|장애|치료|환자|병|증상|처방|병원)/;

/// 2차 금칙어: 부정·낙인 표현.
export const SECONDARY_BANNED = /(아프|장애아|문제아|이상)/;

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

// =====================================================================
// FR-C-005 (#28) — proxy.ts URL params 스캐너용 확장 API.
//
// proxy.ts (Next.js 16 root middleware) 는 응답 본문을 stream 으로 받기 때문에
// "응답 본문을 통째로 스캔" 은 미들웨어 단계에서 불가능. 본 PR 은 실효성 있는
// 다른 layer 로 보완한다:
//
//   1) URL search params 값을 스캔 → 금칙어 발견 시 sanitize (해당 key 만 제거)
//      후 rewrite. 차단(redirect) 보다 graceful — 사용자 입력 흐름 유지.
//   2) 개발 모드 전용 X-Forbidden-Words-Scan 헤더 부착 — 향후 dev console /
//      e2e 환경에서 페이지 본문 스캔 트리거용 마커.
//   3) 빌드 타임 정적 스캔 / 페이지 본문 dev tool 은 후속 PR.
//
// 본 모듈은 server / client / edge 모두 안전 — Node API 의존 0건.
// =====================================================================

/// proxy.ts 가 스캔 대상으로 삼는 search param key 목록.
/// 전체 query 가 아니라 사용자 입력이 직접 들어가는 알려진 key 만 검사 → 오탐 최소화.
/// (예: `?code=...` 같은 oauth callback / `?next=/admin` 같은 시스템 값은 제외)
export const SCANNED_SEARCH_PARAM_KEYS: readonly string[] = [
  "q", // 일반 검색 query
  "query", // alt 검색 key
  "search", // alt 검색 key
  "title", // user-supplied 제목
  "name", // user-supplied 이름 (검색 box)
  "note", // 메모 / 후기 입력
];

/// scanSearchParams 결과 단건.
export interface SearchParamHit {
  /// 스캔된 search param key.
  key: string;
  /// 원본 value (디코딩된 상태).
  value: string;
  /// 매칭된 금칙어 목록 (lib/forbidden-words findBannedTerms 의 부분 집합).
  matches: BannedMatch[];
}

/// scanSearchParams 결과 전체.
export interface SearchParamScanResult {
  /// 금칙어 매칭이 있는 key → hit.
  hits: SearchParamHit[];
  /// 위 hit 들에서 제거할 search param key 목록. proxy.ts 가 sanitize 시 사용.
  removedKeys: string[];
}

/// URL search params 안에서 금칙어 매칭을 스캔.
/// - 알려진 입력 key (SCANNED_SEARCH_PARAM_KEYS) 만 검사 — 시스템 key (code/next 등) 보존.
/// - URLSearchParams 동일 key 다중 value (`?q=a&q=b`) 도 모두 검사.
/// - 화이트리스트(`치료사`/`치료실` 등) 는 findBannedTerms 가 알아서 적용.
export function scanSearchParams(
  searchParams: URLSearchParams,
  options: { scanKeys?: readonly string[] } = {},
): SearchParamScanResult {
  const scanKeys = options.scanKeys ?? SCANNED_SEARCH_PARAM_KEYS;
  const hits: SearchParamHit[] = [];
  const removedKeys = new Set<string>();

  for (const key of scanKeys) {
    const values = searchParams.getAll(key);
    if (values.length === 0) continue;

    for (const value of values) {
      if (!value) continue;
      const matches = findBannedTerms(value);
      if (matches.length === 0) continue;
      hits.push({ key, value, matches });
      removedKeys.add(key);
    }
  }

  return { hits, removedKeys: Array.from(removedKeys) };
}

/// 헤더 이름 — 개발 모드에서 응답에 부착 (e2e/dev console 마커).
export const FORBIDDEN_WORDS_SCAN_HEADER = "X-Forbidden-Words-Scan";
/// 헤더 이름 — sanitize 발생 시 결과 표시 (URL params 에서 제거된 key 목록 CSV).
export const FORBIDDEN_WORDS_SANITIZED_HEADER = "X-Forbidden-Words-Sanitized";
