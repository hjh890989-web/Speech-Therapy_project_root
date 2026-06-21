// CR-2026-009 — saveLiteracyResult Server Action 계약(입력 스키마 + 결과 타입).
//
// 문해력 놀이/probe 결과 영속의 입력 검증. raw 점수만 받고 보정하지 않는다(display 레이어 원칙).
// stage 와 childAgeMonths 는 입력으로 받지 않고 서버가 파생/조회한다 — 클라이언트 신뢰 X:
//   - stage      : registry(게임 구인 단계)에서 파생.
//   - childAgeMonths: 인증 User.childAgeMonths 에서 서버 조회.
// CLIENT-SAFE: 본 파일은 "use server" 미포함(타입/스키마만).

import { z } from "zod";
import type { LiteracyStageId } from "@/lib/literacy/stages";

export const LiteracyResultInputSchema = z.object({
  /// 놀이 slug (registry LITERACY_GAMES 와 정합 — 액션에서 존재/활성 추가 검증).
  gameSlug: z.string().min(1).max(64),
  /// 원점수(raw) — 구인별(0/1 합·완료시간 ms·정확음절수·완료 항목수 등). 음수 불가, 유한.
  rawScore: z.number().finite().min(0),
  /// 분모/총문항(구인별, 선택).
  rawTotal: z.number().finite().min(0).optional(),
});
export type LiteracyResultInput = z.infer<typeof LiteracyResultInputSchema>;

/// 영속 생략 사유(success=true 이지만 저장 안 함 — 정상 graceful 경로).
export type LiteracyResultSkipReason =
  | "anonymous" // 비인증 — 익명 놀이는 ephemeral(저장 안 함)
  | "dormant" // 게임 미존재/플래그 off — 미공개 콘텐츠 누출 0
  | "age_out_of_domain" // User.childAgeMonths 미상 또는 만 2~12세 밖
  | "consent_required"; // 인증 user PIPA 미동의

/// Server Action 결과 — graceful(throw 없음).
export type LiteracyResultActionResult =
  | { success: true; persisted: true; id: string; stage: LiteracyStageId }
  | { success: true; persisted: false; reason: LiteracyResultSkipReason }
  | { success: false; reason: "invalid_input" | "db_failed"; message: string };
