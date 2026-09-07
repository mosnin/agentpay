-- CreateTable
CREATE TABLE "ChainCursor" (
    "id" TEXT NOT NULL,
    "blockNumber" BIGINT NOT NULL,
    "blockHash" TEXT NOT NULL,
    "halted" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChainCursor_pkey" PRIMARY KEY ("id")
);

