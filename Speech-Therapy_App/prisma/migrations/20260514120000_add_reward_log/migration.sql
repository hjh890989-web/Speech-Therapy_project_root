-- DB-008b (Sprint 2) — RewardLog 신규 테이블 추가.
-- @@unique([userId, idempotencyKey]) 가 grantReward 멱등성을 SQL 레벨에서 보장.

-- CreateTable
CREATE TABLE "RewardLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "rewardType" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RewardLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RewardLog_userId_idempotencyKey_key" ON "RewardLog"("userId", "idempotencyKey");

-- CreateIndex
CREATE INDEX "RewardLog_userId_createdAt_idx" ON "RewardLog"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "RewardLog" ADD CONSTRAINT "RewardLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
