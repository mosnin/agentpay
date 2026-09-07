import "server-only";
import { prisma } from "@/lib/prisma";
/** Native token totals from confirmed ledger credits, including partial settlements. */
export async function getStablecoinEarnings(userId: string) {
  return prisma.$queryRaw<Array<{ network: string; token: string; symbol: string; decimals: number; units: string }>>`
    SELECT o.network, o.token, o.symbol, o.decimals, SUM(l."amountUnits")::text AS units
    FROM "LedgerEntry" l JOIN "PaymentOrder" o ON o.id = l."orderId"
    JOIN "Task" t ON t.id = o."taskId" JOIN "Agent" a ON a.id = t."sellerAgentId"
    WHERE a."ownerId" = ${userId} AND o.livemode = true
      AND l."creditAccount" = 'wallet:' || o."sellerAddress"
      AND l."debitAccount" = 'escrow:' || o.id
    GROUP BY o.network, o.token, o.symbol, o.decimals ORDER BY o.network, o.token
  `;
}
