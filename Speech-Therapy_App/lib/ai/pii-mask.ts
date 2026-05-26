// SEC-COMP-PII — 외부 AI (Gemini / OpenAI 등) 호출 직전 transcript / user 텍스트에서
// PII (Personally Identifiable Information) 를 마스킹하는 helper.
//
// 적용 위치 (현재):
// - lib/ai/prompts.ts `buildScoringPrompt` — transcript 마스킹 (defense in depth; 현재 호출 site 부재, 미래 재활성화 대비)
//
// 미적용 (의도):
// - lib/cushion/generate.ts `buildUserPrompt` 의 `studentName` — B2B 알림장 의도된 호명 기능.
//   별도 동의 흐름 (FR-C-018 동의서 + /settings/consent) 으로 부모 동의 처리.
//
// 한국 PIPA / 일반 PII 대상 패턴:
// - 전화번호 (휴대폰 / 일반 / 국제)
// - 이메일
// - 주민등록번호 (RRN)
// - 신용카드 (Luhn 미검증, 패턴만)
// - IP 주소
// - URL
// - 한국식 상세 주소 (시/도/구/동 + 번지)
//
// 미포함 (위양성 risk):
// - 한국 성+이름 (2~4자 패턴) — 일반 명사와 충돌 빈도 높음 (예: "사과" 와 인명 구분 불가)
// - 학교 / 회사 / 시설 이름 — 패턴 정의 불가
//
// 마스킹 후 보존:
// - 발음 / 음운 / 형태소 분석 가능 (어휘 자체는 유지)
// - 학습 데이터의 카테고리 정보 (예: "[전화번호]") 만 노출

const PATTERNS: ReadonlyArray<{ regex: RegExp; label: string }> = [
  // 주민등록번호 (xxxxxx-xxxxxxx, 13자리). 가장 critical — 먼저 차단.
  { regex: /\b\d{6}-?[1-4]\d{6}\b/g, label: "[주민등록번호]" },
  // 신용카드 (4-4-4-4 또는 4-6-4-4-4 ... 단순 패턴).
  { regex: /\b\d{4}-\d{4}-\d{4}-\d{4}\b/g, label: "[카드번호]" },
  // 이메일.
  { regex: /\b[\w.+-]+@[\w-]+\.[\w.-]+\b/g, label: "[이메일]" },
  // 휴대폰 / 일반 전화 (010-xxxx-xxxx / 02-xxx-xxxx / 0xx-xxxx-xxxx / +82-10-xxxx-xxxx).
  // 국내 형식: 선행 0. 국제 형식 (+82): 선행 0 없이 1~2자리 지역코드.
  // 하이픈 유무 무관, 단 trailing \b 로 16자 카드번호 / RRN 과 분리.
  {
    regex: /(?:\+?82-?\d{1,2}|0\d{1,2})-?\d{3,4}-?\d{4}\b/g,
    label: "[전화번호]",
  },
  // URL (http / https).
  { regex: /https?:\/\/[^\s)>\]]+/g, label: "[URL]" },
  // IPv4 주소.
  { regex: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g, label: "[IP주소]" },
  // 한국식 상세 주소 — 광역 (도/시) + (시/구) 0~2회 + 동/로/길 + 번지/호 + 숫자.
  // 광역 단위는 optional, 시/구 도 0회 이상 — 도-시-구-동 / 시-구-동 / 구-동 / 동만 형식 모두 매칭.
  // 위양성 최소화 위해 trailing 번지/호 + 숫자 필수.
  {
    regex:
      /(?:[가-힣]{2,}(?:특별시|광역시|시|도)\s)?(?:[가-힣]{2,}(?:시|군|구)\s){0,2}[가-힣]{2,}(?:동|읍|면|리|로|길)\s?\d+(?:-\d+)?(?:번지|호)?/g,
    label: "[주소]",
  },
];

/// 입력 text 에서 PII 패턴을 라벨로 치환. 원본 미변경.
/// 미아동 발화 transcript 의 길이 (보통 1~3문장) 에 최적화 — 정규식 7개 순차 적용.
export function maskPii(text: string): string {
  let masked = text;
  for (const { regex, label } of PATTERNS) {
    masked = masked.replace(regex, label);
  }
  return masked;
}
