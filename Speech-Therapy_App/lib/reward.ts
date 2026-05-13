// DB-008 §AC — RewardProgress UPSERT 헬퍼.
// FR-C-009 (보상 INSERT) 와 TEST-009 (멱등성·동시성) 가 본 모듈을 호출.
//
// 동시성: Prisma `upsert` + `update.increment` 가 SQL 레벨에서 원자적이지 않은
// 환경 (SQLite) 에서는 race 가능. PostgreSQL 전환 시 자동으로 atomic 보장됨
// (Supabase = PostgreSQL). TEST-009 가 동시성 검증.

import { prisma } from "@/lib/db";
import type {
  RewardInput,
  RewardOutput,
  RewardType,
} from "@/lib/schemas/reward";

// Sprint 1 멱등성: process-local Set.
// 한계: 다중 Vercel 인스턴스 간 중복 가능. Sprint 2 에서 reward_log 테이블 +
// @@unique([userId, idempotencyKey]) 로 강화 예정.
const grantedKeys = new Set<string>();

function compositeKey(userId: string, key: string): string {
  return `${userId}:${key}`;
}

/** 테스트용 — process-local 멱등성 캐시 초기화. */
export function __resetGrantedKeysForTest(): void {
  grantedKeys.clear();
}

/**
 * FR-C-009 — 보상 UPSERT + 멱등성.
 *
 * - 동일 (userId, idempotencyKey) 재호출 → wasSkipped=true + 현재 상태만 반환
 * - User row 없으면 anonymous parent 로 upsert (무로그인 진단 흐름 호환, FK 충돌 방지)
 * - rewardType 별 RewardProgress 컬럼 1개만 increment
 */
export async function grantReward(input: RewardInput): Promise<RewardOutput> {
  const key = compositeKey(input.userId, input.idempotencyKey);

  if (grantedKeys.has(key)) {
    const current = await prisma.rewardProgress.findUnique({
      where: { userId: input.userId },
    });
    return {
      success: true,
      wasSkipped: true,
      cumulativeStars: current?.cumulativeStars ?? 0,
      treeGrowthLevel: current?.treeGrowthLevel ?? 0,
      aiDrawingCount: current?.aiDrawingCount ?? 0,
    };
  }

  // anonymous 진단 사용자를 위한 User 보장 (FK 충돌 방지).
  await prisma.user.upsert({
    where: { id: input.userId },
    update: {},
    create: { id: input.userId, role: "parent" },
  });

  const progress = await applyRewardIncrement(input.userId, input.rewardType, input.amount);
  grantedKeys.add(key);

  return {
    success: true,
    wasSkipped: false,
    cumulativeStars: progress.cumulativeStars,
    treeGrowthLevel: progress.treeGrowthLevel,
    aiDrawingCount: progress.aiDrawingCount,
  };
}

async function applyRewardIncrement(userId: string, type: RewardType, amount: number) {
  switch (type) {
    case "star":
      return incrementStars(userId, amount);
    case "tree":
      return incrementTreeGrowth(userId, amount);
    case "drawing":
      return incrementAiDrawingCount(userId, amount);
  }
}

export async function incrementStars(userId: string, n: number) {
  return prisma.rewardProgress.upsert({
    where: { userId },
    create: {
      userId,
      cumulativeStars: n,
    },
    update: {
      cumulativeStars: { increment: n },
    },
  });
}

export async function incrementTreeGrowth(userId: string, n: number = 1) {
  return prisma.rewardProgress.upsert({
    where: { userId },
    create: {
      userId,
      treeGrowthLevel: n,
    },
    update: {
      treeGrowthLevel: { increment: n },
    },
  });
}

export async function incrementAiDrawingCount(userId: string, n: number = 1) {
  return prisma.rewardProgress.upsert({
    where: { userId },
    create: {
      userId,
      aiDrawingCount: n,
    },
    update: {
      aiDrawingCount: { increment: n },
    },
  });
}

export async function getRewardProgress(userId: string) {
  return prisma.rewardProgress.findUnique({ where: { userId } });
}
