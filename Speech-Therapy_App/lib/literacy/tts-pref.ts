"use client";

// 문해 읽어주기(TTS) 사용자 환경설정 — 기기 음성 선택 + 읽기 속도. localStorage 단일 출처.
//
// 부모가 🔊 옆 ⚙️에서 고른 목소리·속도를 저장 → 전 게임의 useReadAloud 가 speak 시 적용.
// 기기 음성(Web Speech API getVoices)은 OS/브라우저에 설치된 것만 — 1개뿐이면 선택지 없음(속도만).
// 부모 목소리(ElevenLabs F11)는 ADR-09 윤리 화이트리스트(storybook/lullaby 한정) 밖이라 본 모듈 범위 외.

export interface TtsPref {
  /// 선택한 음성의 voiceURI (null = 기기 기본 한국어 음성).
  voiceURI: string | null;
  /// 읽기 속도 (0.6~1.3, 기본 0.95).
  rate: number;
}

const KEY = "literacy-tts-pref";
export const RATE_MIN = 0.6;
export const RATE_MAX = 1.3;
const DEFAULT: TtsPref = { voiceURI: null, rate: 0.95 };

function clampRate(r: number): number {
  if (!Number.isFinite(r)) return DEFAULT.rate;
  return Math.min(RATE_MAX, Math.max(RATE_MIN, r));
}

export function getTtsPref(): TtsPref {
  if (typeof window === "undefined") return DEFAULT;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return DEFAULT;
    const p = JSON.parse(raw) as Partial<TtsPref>;
    return {
      voiceURI: typeof p.voiceURI === "string" ? p.voiceURI : null,
      rate: typeof p.rate === "number" ? clampRate(p.rate) : DEFAULT.rate,
    };
  } catch {
    return DEFAULT;
  }
}

export function setTtsPref(pref: TtsPref): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      KEY,
      JSON.stringify({ voiceURI: pref.voiceURI, rate: clampRate(pref.rate) }),
    );
  } catch {
    /* no-op (사파리 프라이빗 등) */
  }
}

/// 그 기기의 한국어 음성 목록(lang ko*). 최초 호출 시 비어 있을 수 있음 → voiceschanged 후 재조회.
export function getKoreanVoices(): SpeechSynthesisVoice[] {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return [];
  return window.speechSynthesis
    .getVoices()
    .filter((v) => v.lang.toLowerCase().startsWith("ko"));
}
