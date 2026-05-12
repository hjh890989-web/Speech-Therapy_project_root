-- CreateEnum
CREATE TYPE "Role" AS ENUM ('parent', 'teacher', 'principal', 'expert', 'admin');

-- CreateEnum
CREATE TYPE "SubscriptionTier" AS ENUM ('free', 'basic', 'premium');

-- CreateEnum
CREATE TYPE "HITLStatus" AS ENUM ('pending', 'in_review', 'completed', 'escalated', 'dismissed');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT,
    "role" "Role" NOT NULL,
    "childAgeMonths" INTEGER,
    "subscriptionTier" "SubscriptionTier" NOT NULL DEFAULT 'free',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "institutionId" TEXT,
    "classId" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Institution" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "principalName" TEXT NOT NULL,
    "principalEmail" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "consentStatus" BOOLEAN NOT NULL DEFAULT false,
    "logoUri" TEXT,
    "subscriptionStartedAt" TIMESTAMP(3),
    "subscriptionTier" TEXT NOT NULL DEFAULT 'trial',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Institution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Class" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "teacherId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Class_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SessionLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "missionId" TEXT,
    "startTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "durationSec" INTEGER NOT NULL,
    "audioVectorUri" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SessionLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EvaluationResult" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "articulationScore" DOUBLE PRECISION NOT NULL,
    "linguisticScore" DOUBLE PRECISION NOT NULL,
    "acousticScore" DOUBLE PRECISION NOT NULL,
    "peerPercentile" DOUBLE PRECISION NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "hitlReviewed" BOOLEAN NOT NULL DEFAULT false,
    "aiCushionText" TEXT,
    "targetPhoneme" TEXT NOT NULL,
    "childAgeMonths" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EvaluationResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MissionCard" (
    "id" TEXT NOT NULL,
    "targetPhoneme" TEXT NOT NULL,
    "difficultyLevel" INTEGER NOT NULL,
    "rewardType" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "instructionText" TEXT NOT NULL,
    "mediaUri" TEXT,
    "ageRangeMin" INTEGER NOT NULL,
    "ageRangeMax" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MissionCard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WeeklyReport" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "weekNumber" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "scoreTrend" JSONB NOT NULL,
    "predictedNextScore" DOUBLE PRECISION,
    "predictionConfidence" DOUBLE PRECISION,
    "articulationAvg" DOUBLE PRECISION NOT NULL,
    "linguisticAvg" DOUBLE PRECISION NOT NULL,
    "acousticAvg" DOUBLE PRECISION NOT NULL,
    "peerPercentileAvg" DOUBLE PRECISION NOT NULL,
    "sessionCount" INTEGER NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WeeklyReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RewardProgress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "cumulativeStars" INTEGER NOT NULL DEFAULT 0,
    "treeGrowthLevel" INTEGER NOT NULL DEFAULT 0,
    "aiDrawingCount" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RewardProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HITLQueue" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "confidenceScore" DOUBLE PRECISION NOT NULL,
    "status" "HITLStatus" NOT NULL DEFAULT 'pending',
    "assignedExpertId" TEXT,
    "expertComment" TEXT,
    "groundTruthScore" JSONB,
    "slaDueAt" TIMESTAMP(3) NOT NULL,
    "escalatedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HITLQueue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_institutionId_idx" ON "User"("institutionId");

-- CreateIndex
CREATE INDEX "User_classId_idx" ON "User"("classId");

-- CreateIndex
CREATE UNIQUE INDEX "Institution_principalEmail_key" ON "Institution"("principalEmail");

-- CreateIndex
CREATE INDEX "Class_institutionId_idx" ON "Class"("institutionId");

-- CreateIndex
CREATE INDEX "SessionLog_userId_startTime_idx" ON "SessionLog"("userId", "startTime");

-- CreateIndex
CREATE UNIQUE INDEX "EvaluationResult_sessionId_key" ON "EvaluationResult"("sessionId");

-- CreateIndex
CREATE INDEX "EvaluationResult_userId_createdAt_idx" ON "EvaluationResult"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "MissionCard_targetPhoneme_difficultyLevel_idx" ON "MissionCard"("targetPhoneme", "difficultyLevel");

-- CreateIndex
CREATE INDEX "WeeklyReport_userId_generatedAt_idx" ON "WeeklyReport"("userId", "generatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "WeeklyReport_userId_year_weekNumber_key" ON "WeeklyReport"("userId", "year", "weekNumber");

-- CreateIndex
CREATE UNIQUE INDEX "RewardProgress_userId_key" ON "RewardProgress"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "HITLQueue_sessionId_key" ON "HITLQueue"("sessionId");

-- CreateIndex
CREATE INDEX "HITLQueue_status_slaDueAt_idx" ON "HITLQueue"("status", "slaDueAt");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Class" ADD CONSTRAINT "Class_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionLog" ADD CONSTRAINT "SessionLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionLog" ADD CONSTRAINT "SessionLog_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "MissionCard"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvaluationResult" ADD CONSTRAINT "EvaluationResult_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "SessionLog"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvaluationResult" ADD CONSTRAINT "EvaluationResult_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeeklyReport" ADD CONSTRAINT "WeeklyReport_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RewardProgress" ADD CONSTRAINT "RewardProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HITLQueue" ADD CONSTRAINT "HITLQueue_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "EvaluationResult"("sessionId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HITLQueue" ADD CONSTRAINT "HITLQueue_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HITLQueue" ADD CONSTRAINT "HITLQueue_assignedExpertId_fkey" FOREIGN KEY ("assignedExpertId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
