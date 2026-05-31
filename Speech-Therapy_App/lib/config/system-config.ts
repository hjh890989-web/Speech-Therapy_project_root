// ADR-13 — SystemConfig 런타임 토글 + 멱등성 헬퍼 (server-only).
//
// 책임:
//   - getSystemConfig / setSystemConfig — SystemConfig 키-밸류 안전 접근 (graceful).
//   - getCurrentPhase — env override → DB → default(phase1) 하이브리드 (ADR-13).
//   - isWithinIdempotencyWindow — 마지막 트리거 시각이 windowDays 이내인지 (Cron 재발화 차단).
//
// 정책: 값은 문자열. DB 부재/실패 시 graceful (default 폴백 — Cron 흐름 차단 금지).
// R4: 운영 설정만 — 사용자/자녀 식별 정보 미취급.
//
// Refs: ADR-13, FR-C-HITL-006 (재학습 멱등성), FR-C-HITL-007 (다양성 phase).

import { prisma } from "@/lib/db";

/** 알려진 SystemConfig 키 — 오타 방지 + 호출처 일관성. */
export const SYSTEM_CONFIG_KEYS = {
  /// FR-C-HITL-006 — 마지막 재학습 트리거(외부 ML 위탁 알림) 시각 (ISO).
  HITL_RETRAINING_TRIGGERED_AT: "hitl_retraining_triggered_at",
  /// FR-C-HITL-007 — 마지막 다양성 임계 위반 알림 시각 (ISO).
  HITL_DIVERSITY_ALERTED_AT: "hitl_diversity_alerted_at",
  /// 운영 phase 토글 ('phase1' | 'phase2').
  HITL_DIVERSITY_PHASE: "hitl_diversity_phase",
} as const;

export type HitlPhase = "phase1" | "phase2";

/** SystemConfig 값 조회 — 부재/오류 시 null (graceful). */
export async function getSystemConfig(key: string): Promise<string | null> {
  try {
    const row = await prisma.systemConfig.findUnique({
      where: { key },
      select: { value: true },
    });
    return row?.value ?? null;
  } catch (err) {
    console.error("[system-config] get 실패:", key, err);
    return null;
  }
}

/** SystemConfig 값 upsert. 실패 시 throw (호출 측이 graceful 처리). */
export async function setSystemConfig(key: string, value: string): Promise<void> {
  await prisma.systemConfig.upsert({
    where: { key },
    create: { key, value },
    update: { value },
  });
}

/**
 * 현재 운영 phase — ADR-13 하이브리드.
 *   1) env HITL_DIVERSITY_PHASE ('phase1'|'phase2') 우선 (즉시 토글).
 *   2) DB SystemConfig 값.
 *   3) 둘 다 없으면 default 'phase1'.
 */
export async function getCurrentPhase(): Promise<HitlPhase> {
  const env = process.env.HITL_DIVERSITY_PHASE;
  if (env === "phase2") return "phase2";
  if (env === "phase1") return "phase1";

  const db = await getSystemConfig(SYSTEM_CONFIG_KEYS.HITL_DIVERSITY_PHASE);
  if (db === "phase2") return "phase2";
  return "phase1";
}

/**
 * 멱등성 윈도우 검사 — key 의 마지막 시각이 windowDays 이내면 true(= 재발화 skip).
 *
 * @param key        SystemConfig 키 (ISO 타임스탬프 저장).
 * @param windowDays 윈도우 (일).
 * @param now        기준 시각.
 * @returns true = 윈도우 이내(skip 대상), false = 윈도우 밖/미설정/파싱 실패(진행 허용).
 */
export async function isWithinIdempotencyWindow(
  key: string,
  windowDays: number,
  now: Date,
): Promise<boolean> {
  const raw = await getSystemConfig(key);
  if (!raw) return false;
  const last = new Date(raw);
  if (Number.isNaN(last.getTime())) return false;
  const elapsedMs = now.getTime() - last.getTime();
  return elapsedMs < windowDays * 24 * 60 * 60 * 1000;
}
