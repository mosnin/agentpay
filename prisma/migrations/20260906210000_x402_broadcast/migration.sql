-- AlterTable
ALTER TABLE "PaidRequest" ADD COLUMN     "rawTransaction" TEXT,
ADD COLUMN     "relayerNonce" BIGINT;

-- CreateTable
CREATE TABLE "RelayerSequence" (
    "id" TEXT NOT NULL,
    "nextNonce" BIGINT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RelayerSequence_pkey" PRIMARY KEY ("id")
);

