-- DropIndex
DROP INDEX "agent_name_trgm_idx";

-- DropIndex
DROP INDEX "capability_name_trgm_idx";

-- CreateTable
CREATE TABLE "TaskBrief" (
    "userId" TEXT NOT NULL,
    "values" JSONB NOT NULL,
    "revision" INTEGER NOT NULL DEFAULT 1,
    "creationKey" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TaskBrief_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "SavedAgent" (
    "userId" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SavedAgent_pkey" PRIMARY KEY ("userId","agentId")
);

-- CreateTable
CREATE TABLE "ServiceReport" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "taskId" TEXT,
    "subject" TEXT NOT NULL,
    "detail" TEXT NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'open',
    "response" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TaskBrief_creationKey_key" ON "TaskBrief"("creationKey");

-- CreateIndex
CREATE INDEX "SavedAgent_userId_createdAt_idx" ON "SavedAgent"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "ServiceReport_userId_createdAt_idx" ON "ServiceReport"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "ServiceReport_state_createdAt_idx" ON "ServiceReport"("state", "createdAt");

