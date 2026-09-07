import "server-only";
import { confirmInstant } from "@/lib/payments/x402-live";
import { prisma } from "@/lib/prisma";
import { settlementNetworks } from "./networks";
import { verifiedNetwork } from "./evm";
import { reconcileOrder } from "./orders";
/** Bounded chain sweep. Database locks serialize each deployment cursor. */
export async function observeSettlements() {
  const sweepStart = Date.now();
  const results: {
    network: string;
    processed: number;
    halted?: boolean;
    error?: string;
  }[] = [];
  for (const n of settlementNetworks().filter((n) => n.enabled)) {
    if (Date.now() - sweepStart > 35000) break;
    const id = `${n.id}:${n.escrow.toLowerCase()}`;
    try {
      const { client } = await verifiedNetwork(n.id);
      let cursor = await prisma.chainCursor.findUnique({ where: { id } });
      if (cursor?.halted) {
        results.push({ network: n.id, processed: 0, halted: true });
        continue;
      }
      if (cursor) {
        const block = await client.getBlock({
          blockNumber: cursor.blockNumber,
        });
        if (block.hash !== cursor.blockHash) {
          await prisma.$transaction(async (tx) => {
            await tx.chainCursor.update({
              where: { id },
              data: { halted: true },
            });
            await tx.paymentOrder.updateMany({
              where: { network: n.id, state: { not: "quoted" } },
              data: {
                state: "reorg",
                lastError:
                  "A previously confirmed chain checkpoint changed. Reconciliation is paused for independent review.",
              },
            });
          });
          results.push({ network: n.id, processed: 0, halted: true });
          continue;
        }
      }
      const safe =
        (await client.getBlockNumber()) - BigInt(n.confirmations) + 1n;
      if (safe < 0n) continue;
      let from = cursor ? cursor.blockNumber + 1n : BigInt(n.deploymentBlock);
      let count = 0;
      while (from <= safe && Date.now() - sweepStart < 40000) {
        const to = from + 999n < safe ? from + 999n : safe;
        const logs = await client.getLogs({
          address: n.escrow,
          fromBlock: from,
          toBlock: to,
        });
        for (const log of logs) {
          if (!log.transactionHash || !log.topics[1]) continue;
          const order = await prisma.paymentOrder.findUnique({
            where: { jobKey: log.topics[1] },
          });
          if (
            !order ||
            order.network !== n.id ||
            order.escrow.toLowerCase() !== n.escrow.toLowerCase()
          )
            continue;
          try {
            await reconcileOrder(order.taskId, log.transactionHash);
            count++;
          } catch {
            await prisma.paymentOrder.update({
              where: { id: order.id },
              data: {
                lastError:
                  "A chain event requires reconciliation. Recover its transaction from the agreement receipt or contact support.",
              },
            });
            throw Error(
              "Event reconciliation paused; cursor preserved for retry.",
            );
          }
        }
        const block = await client.getBlock({ blockNumber: to });
        if (!block.hash) throw Error("Missing checkpoint hash.");
        if (cursor) {
          const moved = await prisma.chainCursor.updateMany({
            where: { id, blockNumber: cursor.blockNumber, halted: false },
            data: { blockNumber: to, blockHash: block.hash },
          });
          if (!moved.count) break;
        } else {
          try {
            await prisma.chainCursor.create({
              data: { id, blockNumber: to, blockHash: block.hash },
            });
          } catch {
            break;
          }
        }
        cursor = await prisma.chainCursor.findUniqueOrThrow({ where: { id } });
        from = to + 1n;
      }
      results.push({ network: n.id, processed: count });
    } catch {
      results.push({
        network: n.id,
        processed: 0,
        error: "Deployment or receipt verification needs attention.",
      });
    }
  }
  const pending = await prisma.paidRequest.findMany({
    where: { state: "broadcasting" },
    orderBy: { createdAt: "asc" },
    take: 10,
  });
  for (const row of pending) {
    if (Date.now() - sweepStart > 45000) break;
    try {
      await confirmInstant(row);
    } catch {
      /* Pending raw transactions remain retryable; never create another charge. */
    }
  }
  // Outbox delivery is transactional with its acknowledgement: a retry cannot duplicate notifications.
  const outbox = await prisma.taskOutbox.findMany({
    where: { deliveredAt: null, nextAttemptAt: { lte: new Date() } },
    orderBy: { createdAt: "asc" },
    take: 30,
  });
  for (const event of outbox) {
    try {
      await prisma.$transaction(async (tx) => {
        const claimed = await tx.taskOutbox.updateMany({
          where: {
            id: event.id,
            deliveredAt: null,
            OR: [{ lockedUntil: null }, { lockedUntil: { lt: new Date() } }],
          },
          data: { lockedUntil: new Date(Date.now() + 30000) },
        });
        if (!claimed.count) return;
        const task = await tx.task.findUnique({
          where: { id: event.taskId },
          include: { sellerAgent: true },
        });
        if (task) {
          for (const userId of [
            ...new Set(
              [task.buyerId, task.sellerAgent?.ownerId].filter(
                (x): x is string => !!x,
              ),
            ),
          ])
            await tx.notification.create({
              data: {
                userId,
                type: "payment_confirmed",
                title: `Agreement payment: ${event.event.toLowerCase()}`,
                body: `${task.title}. Open the agreement to review its confirmed transaction and next action.`,
                href: `/tasks/${task.id}`,
              },
            });
        }
        await tx.taskOutbox.update({
          where: { id: event.id },
          data: { deliveredAt: new Date(), lockedUntil: null },
        });
      });
    } catch {
      await prisma.taskOutbox.update({
        where: { id: event.id },
        data: {
          attempts: { increment: 1 },
          nextAttemptAt: new Date(Date.now() + 60000),
          lastError: "Notification delivery will retry.",
        },
      });
    }
  }
  return results;
}
