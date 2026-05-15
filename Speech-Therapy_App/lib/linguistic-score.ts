// Sprint 3 §1~§2 — 언어 (linguistic) 점수.
//
// Sprint 3 §1 base: 음절 단위 어휘 완성도 (의도 vs 발화 음절 수).
// Sprint 3 §2 C 확장: Web Speech API SpeechRecognitionResult.confidence (STT 인식 자신도)
// 를 50% 가중치로 결합 → 인식 품질 자체를 신호로 반영.
//
// 차별화:
// - articulation: 자모 단위 정확도 (음소 정확도)
// - linguistic: 음절 단위 어휘 완성 + STT 인식 명확성
// - acoustic: 음향 신호 (duration/pitch/energy) 또는 텍스트 프록시

import { countHangulSyllables } from "@/lib/phonetic-similarity";

export function computeLinguisticScore(
  intendedWord: string,
  transcribedWord: string,
  sttConfidence?: number | null,
): number {
  const intendedSyllables = countHangulSyllables(intendedWord);
  const transcribedSyllables = countHangulSyllables(transcribedWord);

  if (intendedSyllables === 0 || transcribedSyllables === 0) return 0;

  const syllableRatio =
    Math.min(intendedSyllables, transcribedSyllables) /
    Math.max(intendedSyllables, transcribedSyllables);

  // Sprint 3 §2 C — sttConfidence 없으면 (jsdom / 기존 데이터) 기존 동작 (음절 일치만).
  if (sttConfidence === undefined || sttConfidence === null) {
    return Math.max(0, Math.min(100, Math.round(100 * syllableRatio)));
  }

  // sttConfidence 가 비정상 (NaN 등) 시 syllable 만 사용 — defensive.
  if (!Number.isFinite(sttConfidence)) {
    return Math.max(0, Math.min(100, Math.round(100 * syllableRatio)));
  }

  const clampedConfidence = Math.max(0, Math.min(1, sttConfidence));
  const score = 100 * (0.5 * syllableRatio + 0.5 * clampedConfidence);
  return Math.max(0, Math.min(100, Math.round(score)));
}
