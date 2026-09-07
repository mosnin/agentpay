-- CreateTable
CREATE TABLE "RateLimitBucket" (
    "id" TEXT NOT NULL,
    "tokens" DOUBLE PRECISION NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RateLimitBucket_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RateLimitBucket_updatedAt_idx" ON "RateLimitBucket"("updatedAt");

