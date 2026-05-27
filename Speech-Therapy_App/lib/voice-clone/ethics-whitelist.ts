// FR-C-027 — F11 부모 음성 클로닝 윤리 화이트리스트 (V07).
//
// 책임 (ADR-09 윤리):
//   - 부모 목소리 적용 가능 콘텐츠: storybook (동화) / lullaby (자장가).
//   - 발음 교정 페이지 (exercise / correction / diagnose) 음성 적용 자동 차단.
//
// 정책 출처 (V07 §4.1 F11 + ADR-09):
//   - "치료자 ≠ 가족 역할 분리" — 발음 교정에는 부모 음성 미적용 (Wiki/clinical/실어증 § MIT 원리).
//   - 본 helper 는 _pure function_ — 호출 측이 적용 시도 직전 검증.
//
// R4 정합:
//   - 입력 contentType 은 application-side 상수 — PII 무관.

/** F11 음성 적용 허용 콘텐츠 타입 — 화이트리스트. */
export const ALLOWED_VOICE_CONTENT_TYPES = ["storybook", "lullaby"] as const;
export type AllowedVoiceContentType = (typeof ALLOWED_VOICE_CONTENT_TYPES)[number];

/** 금지 콘텐츠 타입 (ADR-09 윤리) — 명시적 라벨로 의도 강화. */
export const FORBIDDEN_VOICE_CONTENT_TYPES = [
  "exercise",
  "correction",
  "diagnose",
  "therapy",
] as const;
export type ForbiddenVoiceContentType = (typeof FORBIDDEN_VOICE_CONTENT_TYPES)[number];

/**
 * 음성 적용 가능 여부 검증 (ADR-09).
 *
 * - 허용: storybook / lullaby
 * - 차단: exercise / correction / diagnose / therapy (또는 미정의)
 *
 * 호출 위치:
 *   - API-018 의 `/api/voice-clone/render` Route Handler 진입 시
 *   - 동화/자장가 페이지 UI 의 음성 토글 활성화 시
 */
export function isVoiceContentAllowed(
  contentType: string,
): contentType is AllowedVoiceContentType {
  return (ALLOWED_VOICE_CONTENT_TYPES as readonly string[]).includes(contentType);
}

/** ADR-09 윤리 위반 시 throw 하는 strict 변형. */
export class EthicsViolationError extends Error {
  readonly code = "VOICE_ETHICS_VIOLATION";
  readonly contentType: string;
  constructor(contentType: string) {
    super(
      `VOICE_ETHICS_VIOLATION: '${contentType}' 은 부모 음성 적용 불가 (ADR-09 윤리 — 치료자 ≠ 가족 역할 분리)`,
    );
    this.name = "EthicsViolationError";
    this.contentType = contentType;
  }
}

/**
 * Strict 가드 — 차단 시 throw.
 *
 * 사용처: Server Action / Route Handler 진입 시 — `applyParentVoice({contentType})` 가드.
 */
export function assertVoiceContentAllowed(contentType: string): void {
  if (!isVoiceContentAllowed(contentType)) {
    throw new EthicsViolationError(contentType);
  }
}

/** appliedContentTypes 배열 정합성 검증 (DB-017 INSERT 직전 + 신뢰성 가드). */
export function sanitizeAppliedContentTypes(
  input: readonly string[],
): AllowedVoiceContentType[] {
  const seen = new Set<AllowedVoiceContentType>();
  for (const v of input) {
    if (isVoiceContentAllowed(v)) {
      seen.add(v);
    }
  }
  return Array.from(seen);
}
