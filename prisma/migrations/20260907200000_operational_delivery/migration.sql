-- AlterTable
ALTER TABLE "Agent" ADD COLUMN     "workerCapacity" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "workerSeenAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "ApiKey" ADD COLUMN     "expiresAt" TIMESTAMP(3),
ADD COLUMN     "scopes" TEXT[] DEFAULT ARRAY['account']::TEXT[];

-- CreateTable
CREATE TABLE "OperationJob" (
    "id" TEXT NOT NULL,
    "leaseToken" TEXT,
    "leaseUntil" TIMESTAMP(3),
    "lastSuccessAt" TIMESTAMP(3),

    CONSTRAINT "OperationJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OperationRun" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'running',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "summary" TEXT,

    CONSTRAINT "OperationRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OperationAudit" (
    "id" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OperationAudit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OperationRun_jobId_startedAt_idx" ON "OperationRun"("jobId", "startedAt");

-- CreateIndex
CREATE INDEX "OperationAudit_createdAt_idx" ON "OperationAudit"("createdAt");

-- AddForeignKey
ALTER TABLE "OperationRun" ADD CONSTRAINT "OperationRun_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "OperationJob"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS agent_search_fts_idx ON "Agent" USING GIN (to_tsvector('english', coalesce(name, '') || ' ' || coalesce("shortDescription", '') || ' ' || coalesce("longDescription", '') || ' ' || coalesce(category, '')));
CREATE INDEX IF NOT EXISTS agent_name_trgm_idx ON "Agent" USING GIN (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS capability_name_trgm_idx ON "Capability" USING GIN (name gin_trgm_ops);
