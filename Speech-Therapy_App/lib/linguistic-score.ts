// Sprint 3 §1 — 언어 (linguistic) 점수.
//
// 측정 신호: 의도한 단어를 음절 단위로 끝까지 발화했는가.
// - 의도 "사과" (2음절) vs 발화 "사" (1음절) → 50%
// - 의도 "사과" (2음절) vs 발화 "수갑" (2음절) → 100% (음절 수 = 어휘 단위 완성)
// - 의도 "사과" (2음절) vs 빈 발화 → 0
//
// articulation 과 차별화: articulation 은 자모 단위 정확도, 본 점수는 어휘 완성 단위.

import { countHangulSyllables } from "@/lib/phonetic-similarity";

export function computeLinguisticScore(intendedWord: string, transcribedWord: string): number {
  const intendedSyllables = countHangulSyllables(intendedWord);
  const transcribedSyllables = countHangulSyllables(transcribedWord);

  if (intendedSyllables === 0 || transcribedSyllables === 0) return 0;

  const ratio = Math.min(intendedSyllables, transcribedSyllables) / Math.max(intendedSyllables, transcribedSyllables);
  return Math.max(0, Math.min(100, Math.round(100 * ratio)));
}
