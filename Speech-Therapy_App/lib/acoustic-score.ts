// Sprint 3 §1 — 음향 (acoustic) 점수.
//
// 측정 신호: 발화 음향이 합리적 길이로 명료하게 들렸는가.
//  - 자모 수 일치도 (길이 합리성): 의도와 비슷한 길이의 음성이 들렸는가
//  - 한글 인식 명료성: STT 가 읽어낸 글자 중 완성형 한글 비율 (영문/숫자/기호 섞이면 명료성 저하)
//
// 종합: 50% 길이 합리성 + 50% 명료성.
//
// 차별화:
// - articulation: 의도 자모와 발화 자모의 정합 (음소 정확도)
// - linguistic: 음절 단위 어휘 완성 (단어 길이 인지)
// - acoustic: 자모 단위 음향 길이 + STT 인식 품질

import { countHangulSyllables, decomposeHangul } from "@/lib/phonetic-similarity";

export function computeAcousticScore(intendedWord: string, transcribedWord: string): number {
  if (!intendedWord || !transcribedWord) return 0;

  const intendedJamos = decomposeHangul(intendedWord);
  const transcribedJamos = decomposeHangul(transcribedWord);
  if (intendedJamos.length === 0 || transcribedJamos.length === 0) return 0;

  // 자모 수 합리성 — 의도 길이와 비슷할수록 1.0 에 수렴.
  const lengthRatio =
    Math.min(intendedJamos.length, transcribedJamos.length) /
    Math.max(intendedJamos.length, transcribedJamos.length);

  // 명료성 — 발화 텍스트 중 완성형 한글 비율 (공백/구두점 제외 후).
  const meaningfulChars = [...transcribedWord].filter((ch) => !/\s|[.,!?·]/.test(ch));
  const hangulChars = countHangulSyllables(transcribedWord);
  const clarity = meaningfulChars.length > 0 ? hangulChars / meaningfulChars.length : 0;

  const score = 100 * (0.5 * lengthRatio + 0.5 * clarity);
  return Math.max(0, Math.min(100, Math.round(score)));
}
