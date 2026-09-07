-- AlterTable
ALTER TABLE "Agent" ADD COLUMN     "lastVerifiedAt" TIMESTAMP(3),
ADD COLUMN     "reputationUpdatedAt" TIMESTAMP(3),
ADD COLUMN     "verificationError" TEXT,
ADD COLUMN     "verificationStatus" TEXT NOT NULL DEFAULT 'unverified';

-- AlterTable
ALTER TABLE "Artifact" ADD COLUMN     "submissionKey" TEXT;

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "amountMinor" INTEGER,
ADD COLUMN     "lastError" TEXT,
ADD COLUMN     "livemode" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "operation" TEXT,
ADD COLUMN     "operationStartedAt" TIMESTAMP(3),
ADD COLUMN     "sellerAccountId" TEXT,
ADD COLUMN     "stripeChargeId" TEXT,
ADD COLUMN     "stripePaymentIntentId" TEXT,
ADD COLUMN     "stripeRefundId" TEXT,
ADD COLUMN     "stripeSessionId" TEXT,
ADD COLUMN     "stripeTransferId" TEXT,
ALTER COLUMN "provider" SET DEFAULT 'disabled';

-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "creationDigest" TEXT,
ADD COLUMN     "creationKey" TEXT,
ADD COLUMN     "workerLeaseToken" TEXT,
ADD COLUMN     "workerLeaseUntil" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "stripeAccountId" TEXT;

-- CreateTable
CREATE TABLE "VerificationCheck" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "passed" BOOLEAN NOT NULL,
    "detail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VerificationCheck_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentEvent" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VerificationCheck_agentId_createdAt_idx" ON "VerificationCheck"("agentId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Artifact_submissionKey_key" ON "Artifact"("submissionKey");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_stripeSessionId_key" ON "Payment"("stripeSessionId");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_stripePaymentIntentId_key" ON "Payment"("stripePaymentIntentId");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_stripeTransferId_key" ON "Payment"("stripeTransferId");

-- CreateIndex
CREATE UNIQUE INDEX "Task_creationKey_key" ON "Task"("creationKey");

-- CreateIndex
CREATE UNIQUE INDEX "User_stripeAccountId_key" ON "User"("stripeAccountId");

-- AddForeignKey
ALTER TABLE "VerificationCheck" ADD CONSTRAINT "VerificationCheck_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

