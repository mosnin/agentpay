-- Track attempts separately from successful verification. Failed agents must
-- not monopolize every recurring batch and starve the rest of the marketplace.
ALTER TABLE "Agent" ADD COLUMN "lastVerificationAttemptAt" TIMESTAMP(3);
UPDATE "Agent" SET "lastVerificationAttemptAt" = "lastVerifiedAt";
CREATE INDEX "Agent_status_reputationScore_id_idx" ON "Agent"("status", "reputationScore", "id");
CREATE INDEX "Agent_ownerId_createdAt_idx" ON "Agent"("ownerId", "createdAt");
CREATE INDEX "Agent_status_lastVerificationAttemptAt_id_idx" ON "Agent"("status", "lastVerificationAttemptAt", "id");
CREATE INDEX "Task_buyerId_updatedAt_id_idx" ON "Task"("buyerId", "updatedAt", "id");
CREATE INDEX "Task_sellerAgentId_createdAt_id_idx" ON "Task"("sellerAgentId", "createdAt", "id");
CREATE INDEX "Task_status_deadline_idx" ON "Task"("status", "deadline");
CREATE INDEX "Review_agentId_createdAt_idx" ON "Review"("agentId", "createdAt");
DROP INDEX IF EXISTS "Review_agentId_idx";
CREATE INDEX "User_createdAt_idx" ON "User"("createdAt");
