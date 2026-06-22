// 읽기·언어 놀이 카탈로그 (literacy 허브용 레지스트리) — CR-2026-007 후속.
//
// 8개 미니게임을 발달 흐름 순으로 모아, 각자의 활성 플래그 상태에 따라 허브에서 노출한다.
// **플래그 off 게임은 목록에서 제외** — 미공개(KOPLAC 전) 콘텐츠가 허브에 새지 않는다.
// 모든 라우트는 `/literacy/<slug>`. CON-04: 제목·소개에 의료/진단/장애 금칙어 0.

import { isPhonologicalAwarenessEnabled } from "./phonological-awareness";
import { isDecodingEnabled } from "./decoding";
import { isRanEnabled } from "./ran";
import { isFluencyEnabled } from "./reading-fluency";
import { isInferenceEnabled } from "./inference";
import { isVocabEnabled } from "./vocabulary";
import { isNwrEnabled } from "./nonword-repetition";
import { isNarrativeEnabled } from "./narrative";
import { isPhonoRulesEnabled } from "./phono-rules";
import { isSpellingEnabled } from "./spelling";
import { stageForAgeMonths, type LiteracyStageId } from "./stages";

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
  /// 이 놀이의 핵심 구인이 속한 발달 단계(stages.ts 정본과 정합, CR-2026-009).
  /// ⚠️ 현 9종은 게임 자체 연령게이트가 만 7세(84m)에 묶여 S2~S4 구인도 '입문판'으로만 제공됨 —
  ///    학령기 콘텐츠는 후속(연령상한 해제 + S2~S4 신규 콘텐츠). 단계 라우팅은 구인 기준으로 태깅한다.
  stage: LiteracyStageId;
}

// 발달 흐름 순: 어휘 → 음운인식 → 작업기억 → 해독 → 소리변신 → 빠른이름대기 → 유창성 → 추론 → 담화.
export const LITERACY_GAMES: readonly LiteracyGameMeta[] = [
  { slug: "vocabulary", title: "낱말 놀이", emoji: "📚", blurb: "그림을 보고 이름을 말하며 낱말을 익혀요.", isEnabled: isVocabEnabled, stage: "S0" },
  { slug: "phonological-awareness", title: "소리 놀이", emoji: "🎵", blurb: "낱말을 이루는 소리를 듣고 나누고 합쳐 보아요.", isEnabled: isPhonologicalAwarenessEnabled, stage: "S1" },
  { slug: "nonword-repetition", title: "소리 따라 말하기", emoji: "🔊", blurb: "들은 소리를 똑같이 따라 말해 보아요.", isEnabled: isNwrEnabled, stage: "S0" },
  { slug: "decoding", title: "소리 내어 읽기", emoji: "🔡", blurb: "글자와 소리를 맞춰 또박또박 읽어 보아요.", isEnabled: isDecodingEnabled, stage: "S1" },
  { slug: "phono-rules", title: "소리 변신 놀이", emoji: "🔁", blurb: "글자와 다르게 나는 소리를 알아맞혀 보아요.", isEnabled: isPhonoRulesEnabled, stage: "S2" },
  { slug: "spelling", title: "받아쓰기 놀이", emoji: "✏️", blurb: "소리를 듣고 바르게 쓴 글자를 골라 보아요.", isEnabled: isSpellingEnabled, stage: "S2" },
  { slug: "ran", title: "빨리 이름대기", emoji: "⚡", blurb: "그림을 보고 빠르게 이름을 말해 보아요.", isEnabled: isRanEnabled, stage: "S1" },
  { slug: "reading-fluency", title: "또박또박 읽기", emoji: "📃", blurb: "짧은 글을 리듬을 살려 읽어 보아요.", isEnabled: isFluencyEnabled, stage: "S3" },
  { slug: "inference", title: "생각 나누기", emoji: "💭", blurb: "짧은 이야기로 함께 생각을 나눠 보아요.", isEnabled: isInferenceEnabled, stage: "S4" },
  { slug: "narrative", title: "이야기 놀이", emoji: "📖", blurb: "이야기를 차례대로 다시 말해 보아요.", isEnabled: isNarrativeEnabled, stage: "S0" },
];

/// 현재 활성(플래그 on)인 놀이만 (입력 순서 보존, 결정적).
export function enabledLiteracyGames(): LiteracyGameMeta[] {
  return LITERACY_GAMES.filter((g) => g.isEnabled());
}

/// 특정 발달 단계의 활성 놀이 (입력 순서 보존, 결정적).
export function enabledGamesForStage(stage: LiteracyStageId): LiteracyGameMeta[] {
  return LITERACY_GAMES.filter((g) => g.stage === stage && g.isEnabled());
}

/// 월령으로 발달 단계를 판정해 그 단계의 활성 놀이를 반환(결정적).
/// 도메인(24~144) 밖이면 빈 배열. stage 라우팅 진입점(`/literacy/start`)에서 사용.
export function enabledGamesForAge(ageMonths: number): LiteracyGameMeta[] {
  const stage = stageForAgeMonths(ageMonths);
  return stage ? enabledGamesForStage(stage.id) : [];
}
