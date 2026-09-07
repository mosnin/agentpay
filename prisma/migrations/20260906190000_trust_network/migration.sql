-- AlterTable
ALTER TABLE "User" ADD COLUMN     "publicTrustProfile" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "acceptedAt" TIMESTAMP(3),
ADD COLUMN     "completedAt" TIMESTAMP(3),
ADD COLUMN     "firstSubmittedAt" TIMESTAMP(3),
ADD COLUMN     "fundedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "WalletAccount" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "family" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'external',
    "providerWalletId" TEXT,
    "verifiedAt" TIMESTAMP(3) NOT NULL,
    "isPayout" BOOLEAN NOT NULL DEFAULT false,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WalletAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WalletChallenge" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "family" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WalletChallenge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SpendingPolicy" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "walletId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "networks" TEXT[],
    "assets" TEXT[],
    "recipients" TEXT[],
    "perPaymentUnits" BIGINT NOT NULL,
    "perDayUnits" BIGINT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "apiKeyId" TEXT,
    "providerPolicyId" TEXT,
    "providerSignerId" TEXT,
    "state" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SpendingPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SpendingReservation" (
    "id" TEXT NOT NULL,
    "policyId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "amountUnits" BIGINT NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'reserved',
    "transactionHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SpendingReservation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentOrder" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "jobKey" TEXT NOT NULL,
    "network" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "decimals" INTEGER NOT NULL,
    "escrow" TEXT NOT NULL,
    "treasury" TEXT NOT NULL,
    "arbiter" TEXT NOT NULL,
    "buyerAddress" TEXT NOT NULL,
    "sellerAddress" TEXT NOT NULL,
    "totalUnits" BIGINT NOT NULL,
    "feeUnits" BIGINT NOT NULL,
    "sellerUnits" BIGINT NOT NULL,
    "feeBps" INTEGER NOT NULL,
    "feeMode" TEXT NOT NULL,
    "deliverBy" TIMESTAMP(3) NOT NULL,
    "reviewSeconds" INTEGER NOT NULL,
    "disputeSeconds" INTEGER NOT NULL,
    "termsHash" TEXT NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'quoted',
    "livemode" BOOLEAN NOT NULL DEFAULT false,
    "fundedAt" TIMESTAMP(3),
    "settledAt" TIMESTAMP(3),
    "artifactHash" TEXT,
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentAttempt" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "network" TEXT NOT NULL,
    "transactionHash" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'submitted',
    "blockHash" TEXT,
    "blockNumber" BIGINT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmedAt" TIMESTAMP(3),

    CONSTRAINT "PaymentAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LedgerEntry" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "eventKey" TEXT NOT NULL,
    "network" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "debitAccount" TEXT NOT NULL,
    "creditAccount" TEXT NOT NULL,
    "amountUnits" BIGINT NOT NULL,
    "transactionHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LedgerEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaskOutbox" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "dedupeKey" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deliveredAt" TIMESTAMP(3),
    "lockedUntil" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TaskOutbox_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrustFinding" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "disputeId" TEXT NOT NULL,
    "subjectUserId" TEXT NOT NULL,
    "outcome" TEXT NOT NULL,
    "publicReason" TEXT NOT NULL,
    "decidedById" TEXT NOT NULL,
    "supersededAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrustFinding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrustAppeal" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "findingId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'open',
    "response" TEXT,
    "reviewedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),

    CONSTRAINT "TrustAppeal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaidRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "inputHash" TEXT NOT NULL,
    "input" JSONB NOT NULL,
    "network" TEXT NOT NULL,
    "sellerAddress" TEXT NOT NULL,
    "treasury" TEXT NOT NULL,
    "router" TEXT NOT NULL,
    "asset" TEXT NOT NULL,
    "amountUnits" BIGINT NOT NULL,
    "feeBps" INTEGER NOT NULL,
    "nonce" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'quoted',
    "payer" TEXT,
    "transactionHash" TEXT,
    "output" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "settledAt" TIMESTAMP(3),

    CONSTRAINT "PaidRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WalletAccount_providerWalletId_key" ON "WalletAccount"("providerWalletId");

-- CreateIndex
CREATE INDEX "WalletAccount_userId_idx" ON "WalletAccount"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "WalletAccount_family_address_key" ON "WalletAccount"("family", "address");

-- CreateIndex
CREATE INDEX "WalletChallenge_userId_expiresAt_idx" ON "WalletChallenge"("userId", "expiresAt");

-- CreateIndex
CREATE INDEX "SpendingPolicy_userId_idx" ON "SpendingPolicy"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "SpendingReservation_orderId_key" ON "SpendingReservation"("orderId");

-- CreateIndex
CREATE INDEX "SpendingReservation_policyId_createdAt_idx" ON "SpendingReservation"("policyId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentOrder_taskId_key" ON "PaymentOrder"("taskId");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentOrder_jobKey_key" ON "PaymentOrder"("jobKey");

-- CreateIndex
CREATE INDEX "PaymentOrder_network_state_idx" ON "PaymentOrder"("network", "state");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentAttempt_network_transactionHash_key" ON "PaymentAttempt"("network", "transactionHash");

-- CreateIndex
CREATE UNIQUE INDEX "LedgerEntry_eventKey_key" ON "LedgerEntry"("eventKey");

-- CreateIndex
CREATE INDEX "LedgerEntry_orderId_idx" ON "LedgerEntry"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "TaskOutbox_dedupeKey_key" ON "TaskOutbox"("dedupeKey");

-- CreateIndex
CREATE INDEX "TaskOutbox_deliveredAt_nextAttemptAt_idx" ON "TaskOutbox"("deliveredAt", "nextAttemptAt");

-- CreateIndex
CREATE INDEX "TrustFinding_subjectUserId_supersededAt_idx" ON "TrustFinding"("subjectUserId", "supersededAt");

-- CreateIndex
CREATE UNIQUE INDEX "TrustAppeal_userId_findingId_key" ON "TrustAppeal"("userId", "findingId");

-- CreateIndex
CREATE UNIQUE INDEX "PaidRequest_nonce_key" ON "PaidRequest"("nonce");

-- CreateIndex
CREATE INDEX "PaidRequest_userId_state_idx" ON "PaidRequest"("userId", "state");

-- AddForeignKey
ALTER TABLE "WalletAccount" ADD CONSTRAINT "WalletAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WalletChallenge" ADD CONSTRAINT "WalletChallenge_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpendingPolicy" ADD CONSTRAINT "SpendingPolicy_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpendingPolicy" ADD CONSTRAINT "SpendingPolicy_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "WalletAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpendingReservation" ADD CONSTRAINT "SpendingReservation_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "SpendingPolicy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentOrder" ADD CONSTRAINT "PaymentOrder_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentAttempt" ADD CONSTRAINT "PaymentAttempt_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "PaymentOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LedgerEntry" ADD CONSTRAINT "LedgerEntry_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "PaymentOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrustFinding" ADD CONSTRAINT "TrustFinding_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrustFinding" ADD CONSTRAINT "TrustFinding_disputeId_fkey" FOREIGN KEY ("disputeId") REFERENCES "Dispute"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrustAppeal" ADD CONSTRAINT "TrustAppeal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrustAppeal" ADD CONSTRAINT "TrustAppeal_findingId_fkey" FOREIGN KEY ("findingId") REFERENCES "TrustFinding"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

