"use client";

// CR-2026-009 Phase 3a — 문해력 놀이 완료 시 결과 1회 영속 훅(fire-and-forget).
//
// 설계:
//   - 세션 완료(done=true)가 되면 saveLiteracyResult 를 정확히 1회 호출(sentRef 가드).
//   - **fire-and-forget**: 영속 실패/거부(dormant·anonymous·consent 등)는 놀이 흐름과 무관 —
//     절대 UI 를 막거나 에러를 표면화하지 않는다(연습 우선).
//   - childAgeMonths/stage 는 서버가 조회/파생 — 클라이언트는 gameSlug + raw 만 전달.
//   - 플래그 off(prod 기본)면 서버가 dormant 로 graceful skip → 호출돼도 무해.
//
// 사용: 컴포넌트 최상단에서 (조건부 return 이전) 무조건 호출. done/rawScore 는 매 렌더 계산값.

import { useEffect, useRef } from "react";

import { saveLiteracyResult } from "@/app/actions/literacy-result";

export function useSaveLiteracyResultOnce(args: {
  /// 세션 완료 여부. true 로 전이되는 첫 순간에 1회 저장.
  done: boolean;
  /// registry slug (예: "phonological-awareness").
  gameSlug: string;
  /// 원점수(raw) — 구인별(정답수·완료시간 ms·완료 항목수 등).
  rawScore: number;
  /// 분모/총문항(선택).
  rawTotal?: number | null;
}): void {
  const { done, gameSlug, rawScore, rawTotal } = args;
  const sentRef = useRef(false);

  useEffect(() => {
    if (!done || sentRef.current) return;
    sentRef.current = true;
    void saveLiteracyResult({
      gameSlug,
      rawScore,
      ...(rawTotal != null ? { rawTotal } : {}),
    }).catch(() => {
      // 영속 실패는 놀이 흐름과 무관 — graceful swallow(연습 우선).
    });
  }, [done, gameSlug, rawScore, rawTotal]);
}
