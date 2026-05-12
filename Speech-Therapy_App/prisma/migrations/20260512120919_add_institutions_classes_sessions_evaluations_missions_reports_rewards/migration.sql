-- CreateTable
CREATE TABLE "Institution" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "principalName" TEXT NOT NULL,
    "principalEmail" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "consentStatus" BOOLEAN NOT NULL DEFAULT false,
    "logoUri" TEXT,
    "subscriptionStartedAt" DATETIME,
    "subscriptionTier" TEXT NOT NULL DEFAULT 'trial',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Class" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "institutionId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "teacherId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Class_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SessionLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "missionId" TEXT,
    "startTime" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "durationSec" INTEGER NOT NULL,
    "audioVectorUri" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SessionLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SessionLog_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "MissionCard" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EvaluationResult" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "articulationScore" REAL NOT NULL,
    "linguisticScore" REAL NOT NULL,
    "acousticScore" REAL NOT NULL,
    "peerPercentile" REAL NOT NULL,
    "confidence" REAL NOT NULL,
    "hitlReviewed" BOOLEAN NOT NULL DEFAULT false,
    "aiCushionText" TEXT,
    "targetPhoneme" TEXT NOT NULL,
    "childAgeMonths" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EvaluationResult_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "SessionLog" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "EvaluationResult_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MissionCard" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "targetPhoneme" TEXT NOT NULL,
    "difficultyLevel" INTEGER NOT NULL,
    "rewardType" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "instructionText" TEXT NOT NULL,
    "mediaUri" TEXT,
    "ageRangeMin" INTEGER NOT NULL,
    "ageRangeMax" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "WeeklyReport" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "weekNumber" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "scoreTrend" JSONB NOT NULL,
    "predictedNextScore" REAL,
    "predictionConfidence" REAL,
    "articulationAvg" REAL NOT NULL,
    "linguisticAvg" REAL NOT NULL,
    "acousticAvg" REAL NOT NULL,
    "peerPercentileAvg" REAL NOT NULL,
    "sessionCount" INTEGER NOT NULL,
    "generatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WeeklyReport_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RewardProgress" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "cumulativeStars" INTEGER NOT NULL DEFAULT 0,
    "treeGrowthLevel" INTEGER NOT NULL DEFAULT 0,
    "aiDrawingCount" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "RewardProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT,
    "role" TEXT NOT NULL,
    "childAgeMonths" INTEGER,
    "subscriptionTier" TEXT NOT NULL DEFAULT 'free',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "institutionId" TEXT,
    "classId" TEXT,
    CONSTRAINT "User_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "User_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_User" ("childAgeMonths", "createdAt", "email", "id", "role", "subscriptionTier") SELECT "childAgeMonths", "createdAt", "email", "id", "role", "subscriptionTier" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE INDEX "User_institutionId_idx" ON "User"("institutionId");
CREATE INDEX "User_classId_idx" ON "User"("classId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

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
