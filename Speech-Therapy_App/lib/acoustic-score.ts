// Sprint 3 §1~§2 — 음향 (acoustic) 점수.
//
// Sprint 3 §2 A: Web Audio API 실 features 가 있으면 **신호 기반** 점수,
// 없으면 (jsdom / 미지원 브라우저 / mock) **텍스트 프록시** 폴백.
//
// 신호 기반 (50% duration + 30% pitch + 20% energy):
//  - duration: 의도 음절 수 × 0.4초 (한국어 평균) 기준의 합리적 발화 길이
//  - pitch stability: pitchStd 가 너무 크면 발성 불안정
//  - energy: 적정 RMS (너무 낮으면 무음, 너무 높으면 잡음 / saturation)
//
// 프록시 (50% 길이 합리성 + 50% 명료성) — Sprint 3 §1 원본 유지:
//  - 자모 수 일치도
//  - STT 인식 한글 비율

import { countHangulSyllables, decomposeHangul } from "@/lib/phonetic-similarity";

/** Sprint 3 §2 A — 클라이언트 Web Audio API 가 추출한 음향 특징. */
export interface AcousticFeaturesInput {
  pitchMean: number | null;
  pitchStd: number | null;
  durationSec: number | null;
  energy: number | null;
}

/// 한국어 음절당 평균 발화 시간 (s). 영유아 기준 실측값에 약간의 여유 (~0.4초).
const EXPECTED_SEC_PER_SYLLABLE = 0.4;

/// Pitch 안정성 임계 (Hz). 표준편차 < 50 안정, 150+ 불안정.
const PITCH_STD_STABLE = 50;
const PITCH_STD_UNSTABLE = 150;

/// Energy 적정 범위 (RMS, 0~1). 0.005 미만 무음, 0.5 초과 saturation.
const ENERGY_SILENCE = 0.005;
const ENERGY_LOW_OK = 0.05;
const ENERGY_HIGH_OK = 0.5;

export function computeAcousticScore(
  intendedWord: string,
  transcribedWord: string,
  features?: AcousticFeaturesInput | null,
): number {
  if (!intendedWord || !transcribedWord) return 0;

  // Sprint 3 §2 A — 실 신호 기반 (durationSec + energy 둘 다 있어야 신뢰).
  if (
    features &&
    features.durationSec !== null &&
    features.energy !== null
  ) {
    return computeSignalScore(intendedWord, features);
  }

  // 폴백: 텍스트 프록시 (Sprint 3 §1).
  return computeProxyScore(intendedWord, transcribedWord);
}

function computeSignalScore(intendedWord: string, features: AcousticFeaturesInput): number {
  const intendedSyllables = countHangulSyllables(intendedWord);
  if (intendedSyllables === 0) return 0;

  const expectedDuration = intendedSyllables * EXPECTED_SEC_PER_SYLLABLE;
  const durationRatio = features.durationSec! / expectedDuration;

  // Duration sanity (50%): expected 의 50%~200% 범위면 100점, 그 외 선형 감점.
  let durationScore: number;
  if (durationRatio >= 0.5 && durationRatio <= 2.0) {
    durationScore = 100;
  } else if (durationRatio < 0.5) {
    durationScore = (durationRatio / 0.5) * 100;
  } else {
    // > 2.0 — saturation. ratio 3 → 50점, ratio 4+ → 0.
    durationScore = Math.max(0, 100 - (durationRatio - 2.0) * 50);
  }

  // Pitch stability (30%): pitchStd 가 null (무음 only) → 0, 안정/변동/불안정 분기.
  let pitchScore: number;
  if (features.pitchStd === null) {
    pitchScore = 0;
  } else if (features.pitchStd < PITCH_STD_STABLE) {
    pitchScore = 100;
  } else if (features.pitchStd < PITCH_STD_UNSTABLE) {
    const t = (features.pitchStd - PITCH_STD_STABLE) / (PITCH_STD_UNSTABLE - PITCH_STD_STABLE);
    pitchScore = 100 * (1 - t);
  } else {
    pitchScore = 0;
  }

  // Energy adequacy (20%): 무음/적정/saturation 분기.
  const energy = features.energy!;
  let energyScore: number;
  if (energy < ENERGY_SILENCE) {
    energyScore = 0;
  } else if (energy < ENERGY_LOW_OK) {
    energyScore = ((energy - ENERGY_SILENCE) / (ENERGY_LOW_OK - ENERGY_SILENCE)) * 100;
  } else if (energy <= ENERGY_HIGH_OK) {
    energyScore = 100;
  } else {
    energyScore = Math.max(0, 100 - (energy - ENERGY_HIGH_OK) * 200);
  }

  const total = 0.5 * durationScore + 0.3 * pitchScore + 0.2 * energyScore;
  return Math.max(0, Math.min(100, Math.round(total)));
}

function computeProxyScore(intendedWord: string, transcribedWord: string): number {
  const intendedJamos = decomposeHangul(intendedWord);
  const transcribedJamos = decomposeHangul(transcribedWord);
  if (intendedJamos.length === 0 || transcribedJamos.length === 0) return 0;

  const lengthRatio =
    Math.min(intendedJamos.length, transcribedJamos.length) /
    Math.max(intendedJamos.length, transcribedJamos.length);

  const meaningfulChars = [...transcribedWord].filter((ch) => !/\s|[.,!?·]/.test(ch));
  const hangulChars = countHangulSyllables(transcribedWord);
  const clarity = meaningfulChars.length > 0 ? hangulChars / meaningfulChars.length : 0;

  const score = 100 * (0.5 * lengthRatio + 0.5 * clarity);
  return Math.max(0, Math.min(100, Math.round(score)));
}
