-- CreateIndex
CREATE INDEX "agent_name_trgm_idx" ON "Agent" USING GIN ("name" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "capability_name_trgm_idx" ON "Capability" USING GIN ("name" gin_trgm_ops);

-- AddForeignKey
ALTER TABLE "TaskBrief" ADD CONSTRAINT "TaskBrief_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedAgent" ADD CONSTRAINT "SavedAgent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedAgent" ADD CONSTRAINT "SavedAgent_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceReport" ADD CONSTRAINT "ServiceReport_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

