// DB-008 §AC — RewardProgress UPSERT 헬퍼.
// FR-C-009 (보상 INSERT) 와 TEST-009 (멱등성·동시성) 가 본 모듈을 호출.
//
// 동시성: Prisma `upsert` + `update.increment` 가 SQL 레벨에서 원자적이지 않은
// 환경 (SQLite) 에서는 race 가능. PostgreSQL 전환 시 자동으로 atomic 보장됨
// (Supabase = PostgreSQL). TEST-009 가 동시성 검증.

import { prisma } from "@/lib/db";

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
