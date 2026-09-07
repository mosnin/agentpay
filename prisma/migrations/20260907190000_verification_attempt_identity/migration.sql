-- A unique attempt identity prevents slow, stale verification from winning
-- against an edited listing or a newer verification run.
ALTER TABLE "Agent" ADD COLUMN "verificationAttemptId" TEXT;
