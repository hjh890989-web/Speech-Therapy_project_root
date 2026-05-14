// DB-008 §AC — RewardProgress UPSERT 헬퍼.
// FR-C-009 (보상 INSERT) 와 TEST-009 (멱등성·동시성) 가 본 모듈을 호출.
//
// Sprint 2 멱등성: RewardLog 테이블 @@unique([userId, idempotencyKey]) 로 강화.
// 다중 Vercel 인스턴스 + 동시 호출 모두 SQL 레벨에서 중복 차단.
// 동시성: Prisma `upsert` + `update.increment` 가 PostgreSQL 에서 atomic 보장.

import { prisma } from "@/lib/db";
import type {
  RewardInput,
  RewardOutput,
  RewardType,
} from "@/lib/schemas/reward";

/**
 * 테스트 hook — 멱등성 캐시 초기화 (Sprint 1 호환용 no-op).
 * Sprint 2 의 RewardLog 기반 멱등성은 mock 에서 직접 제어.
 */
export function __resetGrantedKeysForTest(): void {
  // no-op (Sprint 2 부터 멱등성은 RewardLog @@unique 가 담당).
}

/// Postgres unique constraint violation code (Prisma P2002 wrapper).
const PRISMA_UNIQUE_CONSTRAINT_ERROR = "P2002";

interface PrismaKnownError {
  code?: string;
}

function isUniqueConstraintError(err: unknown): boolean {
  return (
    typeof err === "object" && err !== null && (err as PrismaKnownError).code === PRISMA_UNIQUE_CONSTRAINT_ERROR
  );
}

/**
 * FR-C-009 — 보상 INSERT + DB 멱등성.
 *
 * - RewardLog @@unique([userId, idempotencyKey]) → 동일 키 재시도는 P2002 throw
 * - P2002 catch → wasSkipped=true + 현재 RewardProgress 반환 (idempotent)
 * - User row 없으면 anonymous parent 로 upsert (무로그인 진단 흐름 호환)
 * - rewardType 별 RewardProgress 컬럼 1개만 increment
 *
 * 다중 인스턴스 안전: Sprint 1 의 process-local Set 한계 제거.
 */
export async function grantReward(input: RewardInput): Promise<RewardOutput> {
  // anonymous 진단 사용자를 위한 User 보장 (FK 충돌 방지).
  await prisma.user.upsert({
    where: { id: input.userId },
    update: {},
    create: { id: input.userId, role: "parent" },
  });

  // RewardLog INSERT — 멱등성 게이트. 중복 시 P2002 throw.
  try {
    await prisma.rewardLog.create({
      data: {
        userId: input.userId,
        rewardType: input.rewardType,
        amount: input.amount,
        idempotencyKey: input.idempotencyKey,
      },
    });
  } catch (err) {
    if (isUniqueConstraintError(err)) {
      // 멱등 재호출 — 현재 상태만 반환.
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
    throw err;
  }

  // 신규 발급 — RewardProgress increment.
  const progress = await applyRewardIncrement(input.userId, input.rewardType, input.amount);

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
