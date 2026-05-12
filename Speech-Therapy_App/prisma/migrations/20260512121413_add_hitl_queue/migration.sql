-- CreateTable
CREATE TABLE "HITLQueue" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "confidenceScore" REAL NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "assignedExpertId" TEXT,
    "expertComment" TEXT,
    "groundTruthScore" JSONB,
    "slaDueAt" DATETIME NOT NULL,
    "escalatedAt" DATETIME,
    "completedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "HITLQueue_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "EvaluationResult" ("sessionId") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "HITLQueue_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "HITLQueue_assignedExpertId_fkey" FOREIGN KEY ("assignedExpertId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "HITLQueue_sessionId_key" ON "HITLQueue"("sessionId");

-- CreateIndex
CREATE INDEX "HITLQueue_status_slaDueAt_idx" ON "HITLQueue"("status", "slaDueAt");
