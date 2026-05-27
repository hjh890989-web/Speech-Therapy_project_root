// FR-C-HITL-005 — model_retraining_data application-side helper (V07 §5.3).
//
// 책임:
//   - sync_retraining_data PostgreSQL TRIGGER 의 동작을 _application 측에서 검증/조회_.
//   - TRIGGER 는 HITLQueue.groundTruthScore UPDATE 시 자동 INSERT (DB-016).
//   - 본 모듈은 _data 조회 + 분석_ 만 — INSERT 자체는 TRIGGER 가 강제.
//
// 사용처:
//   - FR-C-HITL-006 (3 게이트 Cron) — listRetrainingCohort / countCumulative 사용.
//   - FR-C-HITL-007 (HHI/Gini) — listByExpert / aggregateByExpert 사용.
//   - 운영자 (/admin/hitl) — recent INSERT 검증.
//
// R4 정합:
//   - 본 helper 는 _aggregate 수치_ 만 반환 — raw JSONB (aiScore / groundTruthScore)
//     은 TRIGGER 가 이미 sanitized=true. 호출 측이 raw JSON 직접 노출 시 책임.
//
// Refs: TASK_FR-C-HITL-005.md, V07 §5.3.2 TRIGGER, ADR-11.

import { prisma } from "@/lib/db";

/** ModelRetrainingData 의 application-side view — UI / Cron 분석용. */
export interface RetrainingEntry {
  id: string;
  sessionId: string;
  expertId: string;
  diffPct: number;
  consentTier: string;
  sanitized: boolean;
  createdAt: Date;
}

/** 최근 retraining cohort 조회 (3 게이트 Cron 입력). */
export async function listRetrainingCohort(args: {
  /// cohort 시작 시점 (default — 직전 재학습 이후).
  since?: Date;
  /// 최대 row 수 (default 5000 — Cron 한 번에 처리 한도).
  limit?: number;
}): Promise<RetrainingEntry[]> {
  const where = args.since ? { createdAt: { gte: args.since } } : {};
  const limit = args.limit ?? 5000;
  const rows = await prisma.modelRetrainingData.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      sessionId: true,
      expertId: true,
      diffPct: true,
      consentTier: true,
      sanitized: true,
      createdAt: true,
    },
  });
  return rows;
}

/** 누적 카운트 (3 게이트 의 cumulative ≥ 500 검증). */
export async function countCumulativeSince(since: Date): Promise<number> {
  return prisma.modelRetrainingData.count({
    where: { createdAt: { gte: since }, sanitized: true },
  });
}

/** expertId 별 카운트 — HHI / Gini 계산 입력. */
export async function aggregateByExpert(since: Date): Promise<Map<string, number>> {
  const rows = await prisma.modelRetrainingData.groupBy({
    by: ["expertId"],
    where: { createdAt: { gte: since }, sanitized: true },
    _count: { expertId: true },
  });
  const result = new Map<string, number>();
  for (const row of rows) {
    result.set(row.expertId, row._count.expertId);
  }
  return result;
}

/** sessionId 1건의 latest 적재 row 조회 (TRIGGER 검증 용). */
export async function findBySessionId(sessionId: string): Promise<RetrainingEntry | null> {
  return prisma.modelRetrainingData.findUnique({
    where: { sessionId },
    select: {
      id: true,
      sessionId: true,
      expertId: true,
      diffPct: true,
      consentTier: true,
      sanitized: true,
      createdAt: true,
    },
  });
}
