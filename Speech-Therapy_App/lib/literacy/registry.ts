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
}

// 발달 흐름 순: 어휘 → 음운인식 → 작업기억 → 해독 → 소리변신 → 빠른이름대기 → 유창성 → 추론 → 담화.
export const LITERACY_GAMES: readonly LiteracyGameMeta[] = [
  { slug: "vocabulary", title: "낱말 놀이", emoji: "📚", blurb: "그림을 보고 이름을 말하며 낱말을 익혀요.", isEnabled: isVocabEnabled },
  { slug: "phonological-awareness", title: "소리 놀이", emoji: "🎵", blurb: "낱말을 이루는 소리를 듣고 나누고 합쳐 보아요.", isEnabled: isPhonologicalAwarenessEnabled },
  { slug: "nonword-repetition", title: "소리 따라 말하기", emoji: "🔊", blurb: "들은 소리를 똑같이 따라 말해 보아요.", isEnabled: isNwrEnabled },
  { slug: "decoding", title: "소리 내어 읽기", emoji: "🔡", blurb: "글자와 소리를 맞춰 또박또박 읽어 보아요.", isEnabled: isDecodingEnabled },
  { slug: "phono-rules", title: "소리 변신 놀이", emoji: "🔁", blurb: "글자와 다르게 나는 소리를 알아맞혀 보아요.", isEnabled: isPhonoRulesEnabled },
  { slug: "ran", title: "빨리 이름대기", emoji: "⚡", blurb: "그림을 보고 빠르게 이름을 말해 보아요.", isEnabled: isRanEnabled },
  { slug: "reading-fluency", title: "또박또박 읽기", emoji: "📃", blurb: "짧은 글을 리듬을 살려 읽어 보아요.", isEnabled: isFluencyEnabled },
  { slug: "inference", title: "생각 나누기", emoji: "💭", blurb: "짧은 이야기로 함께 생각을 나눠 보아요.", isEnabled: isInferenceEnabled },
  { slug: "narrative", title: "이야기 놀이", emoji: "📖", blurb: "이야기를 차례대로 다시 말해 보아요.", isEnabled: isNarrativeEnabled },
];

/// 현재 활성(플래그 on)인 놀이만 (입력 순서 보존, 결정적).
export function enabledLiteracyGames(): LiteracyGameMeta[] {
  return LITERACY_GAMES.filter((g) => g.isEnabled());
}
