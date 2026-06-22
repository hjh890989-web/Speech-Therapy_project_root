// 읽기·언어 놀이 카탈로그 (literacy 허브용 레지스트리) — CR-2026-007 / CR-2026-009.
//
// 14개 미니게임을 발달 흐름 순으로 모아, 각자의 활성 플래그 상태에 따라 허브에서 노출한다.
// **플래그 off 게임은 목록에서 제외** — 미공개 콘텐츠가 허브에 새지 않는다.
// 모든 라우트는 `/literacy/<slug>`. CON-04: 제목·소개에 의료/진단/장애 금칙어 0.

import { isPhonologicalAwarenessEnabled, isPaAgeEligible } from "./phonological-awareness";
import { isDecodingEnabled, isDecodingAgeEligible } from "./decoding";
import { isRanEnabled, isRanAgeEligible } from "./ran";
import { isFluencyEnabled, isFluencyAgeEligible } from "./reading-fluency";
import { isInferenceEnabled, isInferenceAgeEligible } from "./inference";
import { isVocabEnabled, isVocabAgeEligible } from "./vocabulary";
import { isNwrEnabled, isNwrAgeEligible } from "./nonword-repetition";
import { isNarrativeEnabled, isNarrativeAgeEligible } from "./narrative";
import { isPhonoRulesEnabled, isPhonoRulesAgeEligible } from "./phono-rules";
import { isSpellingEnabled, isSpellingAgeEligible } from "./spelling";
import { isReadRulesEnabled, isReadRulesAgeEligible } from "./read-rules";
import { isComprehensionEnabled, isComprehensionAgeEligible } from "./reading-comprehension";
import { isInferenceReadingEnabled, isInferenceReadingAgeEligible } from "./inference-reading";
import { isMorphologyEnabled, isMorphologyAgeEligible } from "./morphology";
import type { LiteracyStageId } from "./stages";

export interface LiteracyGameMeta {
  /// 라우트 slug (`/literacy/<slug>`).
  slug: string;
  /// 놀이 이름(자녀 친화, 금칙어 0).
  title: string;
  emoji: string;
  /// 한 줄 소개.
  blurb: string;
  /// 활성 플래그(default off) — true 일 때만 허브 노출.
  isEnabled: () => boolean;
  /// 이 놀이의 핵심 구인이 속한 발달 단계(stages.ts, 표시/분류용).
  /// ⚠️ 구인 기준 태그 — 게임 자체 연령게이트(isAgeEligible)와 다를 수 있다(예: inference 구인=S4지만
  ///    현 게임은 만5~7 입문판). **연령 라우팅은 stage 가 아니라 isAgeEligible 로 한다**(dead-end 방지).
  stage: LiteracyStageId;
  /// 게임 자체 연령게이트(각 모듈 isXAgeEligible). 라우팅 교차검증 단일 진실원.
  isAgeEligible: (ageMonths: number) => boolean;
}

// 발달 흐름 순: 어휘 → 음운인식 → 작업기억 → 해독 → 소리변신 → 받아쓰기 → 소리규칙읽기 →
//   빠른이름대기 → 유창성 → 글읽고답하기 → 추론 → 숨은뜻 → 낱말조각 → 담화.
export const LITERACY_GAMES: readonly LiteracyGameMeta[] = [
  { slug: "vocabulary", title: "낱말 놀이", emoji: "📚", blurb: "그림을 보고 이름을 말하며 낱말을 익혀요.", isEnabled: isVocabEnabled, stage: "S0", isAgeEligible: isVocabAgeEligible },
  { slug: "phonological-awareness", title: "소리 놀이", emoji: "🎵", blurb: "낱말을 이루는 소리를 듣고 나누고 합쳐 보아요.", isEnabled: isPhonologicalAwarenessEnabled, stage: "S1", isAgeEligible: isPaAgeEligible },
  { slug: "nonword-repetition", title: "소리 따라 말하기", emoji: "🔊", blurb: "들은 소리를 똑같이 따라 말해 보아요.", isEnabled: isNwrEnabled, stage: "S0", isAgeEligible: isNwrAgeEligible },
  { slug: "decoding", title: "소리 내어 읽기", emoji: "🔡", blurb: "글자와 소리를 맞춰 또박또박 읽어 보아요.", isEnabled: isDecodingEnabled, stage: "S1", isAgeEligible: isDecodingAgeEligible },
  { slug: "phono-rules", title: "소리 변신 놀이", emoji: "🔁", blurb: "글자와 다르게 나는 소리를 알아맞혀 보아요.", isEnabled: isPhonoRulesEnabled, stage: "S2", isAgeEligible: isPhonoRulesAgeEligible },
  { slug: "spelling", title: "받아쓰기 놀이", emoji: "✏️", blurb: "소리를 듣고 바르게 쓴 글자를 골라 보아요.", isEnabled: isSpellingEnabled, stage: "S2", isAgeEligible: isSpellingAgeEligible },
  { slug: "read-rules", title: "소리 규칙 읽기", emoji: "📣", blurb: "낱말이 어떻게 소리 나는지 골라 보아요.", isEnabled: isReadRulesEnabled, stage: "S2", isAgeEligible: isReadRulesAgeEligible },
  { slug: "ran", title: "빨리 이름대기", emoji: "⚡", blurb: "그림을 보고 빠르게 이름을 말해 보아요.", isEnabled: isRanEnabled, stage: "S1", isAgeEligible: isRanAgeEligible },
  { slug: "reading-fluency", title: "또박또박 읽기", emoji: "📃", blurb: "짧은 글을 리듬을 살려 읽어 보아요.", isEnabled: isFluencyEnabled, stage: "S3", isAgeEligible: isFluencyAgeEligible },
  { slug: "reading-comprehension", title: "글 읽고 답하기", emoji: "📖", blurb: "짧은 글을 읽고 내용에 맞는 답을 골라 보아요.", isEnabled: isComprehensionEnabled, stage: "S3", isAgeEligible: isComprehensionAgeEligible },
  { slug: "inference", title: "생각 나누기", emoji: "💭", blurb: "짧은 이야기로 함께 생각을 나눠 보아요.", isEnabled: isInferenceEnabled, stage: "S4", isAgeEligible: isInferenceAgeEligible },
  { slug: "inference-reading", title: "숨은 뜻 찾기", emoji: "🔎", blurb: "글을 읽고 드러나지 않은 뜻을 헤아려 보아요.", isEnabled: isInferenceReadingEnabled, stage: "S4", isAgeEligible: isInferenceReadingAgeEligible },
  { slug: "morphology", title: "낱말 조각 놀이", emoji: "🧩", blurb: "낱말을 합치고 나누며 숨은 뜻을 찾아 보아요.", isEnabled: isMorphologyEnabled, stage: "S4", isAgeEligible: isMorphologyAgeEligible },
  { slug: "narrative", title: "이야기 놀이", emoji: "📖", blurb: "이야기를 차례대로 다시 말해 보아요.", isEnabled: isNarrativeEnabled, stage: "S0", isAgeEligible: isNarrativeAgeEligible },
];

/// 현재 활성(플래그 on)인 놀이만 (입력 순서 보존, 결정적).
export function enabledLiteracyGames(): LiteracyGameMeta[] {
  return LITERACY_GAMES.filter((g) => g.isEnabled());
}

/// 특정 발달 단계로 태깅된 활성 놀이 (표시/분류용, 입력 순서 보존).
/// ⚠️ 연령 라우팅엔 쓰지 말 것 — 게임 게이트와 disjoint 가능. 라우팅은 enabledGamesForAge.
export function enabledGamesForStage(stage: LiteracyStageId): LiteracyGameMeta[] {
  return LITERACY_GAMES.filter((g) => g.stage === stage && g.isEnabled());
}

/// 월령에 **실제 적격**(게임 자체 연령게이트 통과)인 활성 놀이를 반환(결정적).
/// stage 태그가 아니라 isAgeEligible 로 교차검증 → start 라우팅 dead-end 0, 직접진입과 대칭.
/// stage 라우팅 진입점(`/literacy/start`)에서 사용.
export function enabledGamesForAge(ageMonths: number): LiteracyGameMeta[] {
  return LITERACY_GAMES.filter((g) => g.isEnabled() && g.isAgeEligible(ageMonths));
}
