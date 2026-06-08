// FR-C-LIT-01 (CR-2026-007 / REQ-FUNC-CL-09·CL-12) — 해독 채점 + 게이트 + 세션.
//
// ⚠️ 활성 게이트 (F15/음운인식 선례): 임상 해석/영속/F1-a 연동은 KOPLAC 자문
//    (docs/clinical-consultation-packet_CL08-10_literacy.md CL-09) 통과 전까지 비활성.
//    LITERACY_DECODING_ENABLED !== 'true' (default off) → UI 휴면.
// 연령 게이트 (CL-12): 만 5~7세 — 음운인식과 동일 기준 재사용.
//
// 채점: 목표 무의미단어 vs STT 전사 → computePhoneticSimilarity(기존 진단 로직 재사용, 0~100) ≥ 임계
//   → 정/오 0/1. **실 오반응(STT 전사) 기록**(기능적 기록, CL-09). 기존 조음 진단(diagnosis.ts)의
//   raw 점수·HITL escalation 과 무관(별도 활동) — F1-a 연동은 KOPLAC 후.
//
// ⚠️ STT 한계 (CL-09 자문 질문): Web Speech API STT 는 실제 어휘로 보정되는 경향 → 무의미단어
//   자동 채점 신뢰도 낮음. 따라서 UI 는 격려 톤 유지 + 응답을 기록하고, 채점은 best-effort 내부값.

import { computePhoneticSimilarity } from "@/lib/phonetic-similarity";
import { isPaAgeEligible } from "@/lib/literacy/phonological-awareness";
import type { DecodingItem } from "@/lib/literacy/decoding-content";
import { DECODING_ITEMS } from "@/lib/literacy/decoding-content";

// ----- 활성 플래그 (default off) -----
/// LITERACY_DECODING_ENABLED === 'true' 일 때만 해독 미니게임 활성. KOPLAC 게이트.
export function isDecodingEnabled(): boolean {
  return process.env.LITERACY_DECODING_ENABLED === "true";
}

// ----- 연령 게이트 (만 5~7세, 음운인식과 동일) -----
/// 해독 미니게임 연령 적격 — literacy 공통(만 5~7세).
export function isDecodingAgeEligible(ageMonths: number): boolean {
  return isPaAgeEligible(ageMonths);
}

// ----- 채점 (0/1 + 오반응 기록) -----
/// "정확히 읽음" 판정 임계 (computePhoneticSimilarity 0~100). KOPLAC 보정 대상.
export const DECODING_CORRECT_THRESHOLD = 80;

export interface DecodingScore {
  /// 0 = 오독 / 1 = 정독(유사도 ≥ 임계).
  correct: 0 | 1;
  /// 목표 vs 전사 음운 유사도 (0~100).
  similarity: number;
  /// 실 오반응 기록(STT 전사) — 기능적 기록(중재 참고). 빈 입력 시 "".
  response: string;
}

/// 단일 해독 시도 채점 (결정적 순수 함수, CL-09).
///  목표 무의미단어 vs STT 전사 → phonetic similarity ≥ 임계 → 1, 그 외 0. 전사는 항상 기록.
export function scoreDecodingResponse(item: DecodingItem, transcript: string): DecodingScore {
  const response = transcript.trim();
  if (response.length === 0) return { correct: 0, similarity: 0, response: "" };
  const similarity = computePhoneticSimilarity(item.word, response);
  return {
    correct: similarity >= DECODING_CORRECT_THRESHOLD ? 1 : 0,
    similarity,
    response,
  };
}

// ----- 세션 요약 -----
export interface DecodingSessionSummary {
  total: number;
  correct: number;
}

export function summarizeDecodingSession(scores: readonly DecodingScore[]): DecodingSessionSummary {
  return {
    total: scores.length,
    correct: scores.filter((s) => s.correct === 1).length,
  };
}

// ----- 세션 구성 -----
/// 개음절(CV) 먼저 → 폐음절(CVC) 순(잠정 위계)으로 N개. 결정적.
export function buildDecodingSession(count = 6): DecodingItem[] {
  const ordered = [...DECODING_ITEMS].sort((a, b) => {
    if (a.structure !== b.structure) return a.structure === "CV" ? -1 : 1;
    return 0;
  });
  return ordered.slice(0, Math.max(0, count));
}
