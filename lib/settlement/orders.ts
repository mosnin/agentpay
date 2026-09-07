import "server-only";
import { randomBytes, createHash } from "node:crypto";
import {
  keccak256,
  encodeAbiParameters,
  parseAbiParameters,
  decodeEventLog,
  encodeFunctionData,
  type Hex,
} from "viem";
import { prisma } from "@/lib/prisma";
import { usdMinorUnits } from "@/lib/payment-mode";
import { verifiedNetwork, readJob, txData, escrowAbi, erc20Abi } from "./evm";
import type { PaymentOrder } from "@prisma/client";
export function serialize<T>(value: T) {
  return JSON.parse(
    JSON.stringify(value, (_, v) => (typeof v === "bigint" ? v.toString() : v)),
  );
}
export function deliveryHash(artifact: {
  id: string;
  content: string | null;
  url: string | null;
}) {
  return `0x${createHash("sha256")
    .update(
      JSON.stringify({
        id: artifact.id,
        content: artifact.content,
        url: artifact.url,
      }),
    )
    .digest("hex")}` as Hex;
}
export async function createOrder(
  taskId: string,
  userId: string,
  network: string,
  walletId: string,
) {
  const prior = await prisma.paymentOrder.findUnique({ where: { taskId } });
  if (prior) {
    const task = await prisma.task.findUniqueOrThrow({ where: { id: taskId } });
    if (task.buyerId !== userId)
      throw Error("Only the buyer can view this payment order.");
    if (prior.network !== network)
      throw Error("The network is locked for this agreement.");
    return prior;
  }
  const { n } = await verifiedNetwork(network);
  const task = await prisma.task.findUniqueOrThrow({
    where: { id: taskId },
    include: { sellerAgent: true, payment: true, contract: true },
  });
  if (
    task.buyerId !== userId ||
    task.status !== "pending" ||
    task.payment?.provider !== "stablecoin" ||
    task.payment.status !== "pending" ||
    !task.sellerAgent
  )
    throw Error("This agreement is not awaiting stablecoin funding.");
  const [buyer, seller] = await Promise.all([
    prisma.walletAccount.findFirst({
      where: { id: walletId, userId, family: "evm", revokedAt: null },
    }),
    prisma.walletAccount.findFirst({
      where: {
        userId: task.sellerAgent.ownerId,
        family: "evm",
        isPayout: true,
        revokedAt: null,
      },
    }),
  ]);
  if (!buyer || !seller)
    throw Error(
      "Both buyer and seller need a verified wallet; the seller must select a payout wallet.",
    );
  if (buyer.address.toLowerCase() === seller.address.toLowerCase())
    throw Error("Buyer and seller wallets must differ.");
  const totalUnits =
    BigInt(usdMinorUnits(task.budget)) * 10n ** BigInt(n.decimals - 2);
  const feeUnits = (totalUnits * BigInt(n.feeBps)) / 10000n;
  const deliverBy = task.deadline ?? new Date(Date.now() + 7 * 86400000);
  if (
    deliverBy.getTime() <= Date.now() + 60000 ||
    deliverBy.getTime() > Date.now() + 89 * 86400000
  )
    throw Error(
      "Choose a delivery deadline between one minute and 89 days from now.",
    );
  const reviewSeconds = 3 * 86400,
    disputeSeconds = 14 * 86400;
  const termsHash = `0x${createHash("sha256")
    .update(
      JSON.stringify({
        version: 1,
        taskId,
        contract: task.contract,
        network: n.id,
        token: n.token,
        buyer: buyer.address,
        seller: seller.address,
        amount: totalUnits.toString(),
        feeBps: n.feeBps,
        treasury: n.treasury,
        arbiter: n.arbiter,
        deliverBy: Math.floor(deliverBy.getTime() / 1000),
        reviewSeconds,
        disputeSeconds,
        nonce: randomBytes(32).toString("hex"),
      }),
    )
    .digest("hex")}` as Hex;
  const jobKey = keccak256(
    encodeAbiParameters(parseAbiParameters("address, bytes32"), [
      buyer.address as Hex,
      termsHash,
    ]),
  );
  return prisma.$transaction(
    async (tx) => {
      const changed = await tx.task.updateMany({
        where: {
          id: taskId,
          status: "pending",
          payment: { provider: "stablecoin", status: "pending" },
        },
        data: { deadline: deliverBy },
      });
      if (!changed.count) throw Error("Agreement changed.");
      return tx.paymentOrder.create({
        data: {
          taskId,
          jobKey,
          network: n.id,
          token: n.token,
          symbol: n.symbol,
          decimals: n.decimals,
          escrow: n.escrow,
          treasury: n.treasury,
          arbiter: n.arbiter,
          buyerAddress: buyer.address,
          sellerAddress: seller.address,
          totalUnits,
          feeUnits,
          sellerUnits: totalUnits - feeUnits,
          feeBps: n.feeBps,
          feeMode: "seller_deduction",
          deliverBy,
          reviewSeconds,
          disputeSeconds,
          termsHash,
          livemode: n.live,
        },
      });
    },
    { isolationLevel: "Serializable" },
  );
}
function assertOrder(
  order: PaymentOrder,
  n: Awaited<ReturnType<typeof verifiedNetwork>>["n"],
) {
  if (
    order.token.toLowerCase() !== n.token.toLowerCase() ||
    order.escrow.toLowerCase() !== n.escrow.toLowerCase() ||
    order.treasury.toLowerCase() !== n.treasury.toLowerCase() ||
    order.arbiter.toLowerCase() !== n.arbiter.toLowerCase() ||
    order.feeBps !== n.feeBps ||
    order.livemode !== n.live
  )
    throw Error(
      "Agreement configuration changed. Reconciliation requires its original deployment.",
    );
}
export async function prepareOrderAction(
  taskId: string,
  user: { id: string; role: string },
  action: string,
  grossSellerUnits?: string,
) {
  const order = await prisma.paymentOrder.findUniqueOrThrow({
    where: { taskId },
  });
  const task = await prisma.task.findUniqueOrThrow({
    where: { id: taskId },
    include: {
      sellerAgent: true,
      artifacts: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });
  const buyer = task.buyerId === user.id,
    seller = task.sellerAgent?.ownerId === user.id;
  const { n, client, job } = await readJob(order.network, order.jobKey);
  assertOrder(order, n);
  let from: string;
  let functionName: string;
  let args: unknown[] = [order.jobKey];
  if (action === "approve_allowance" || action === "fund") {
    if (
      !buyer ||
      job[7] !== 0 ||
      task.status !== "pending" ||
      order.state !== "quoted"
    )
      throw Error("Agreement is not awaiting funding.");
    if (order.deliverBy.getTime() <= Date.now())
      throw Error("Funding deadline expired.");
    from = order.buyerAddress;
    if (action === "approve_allowance")
      return {
        chainId: n.chainId,
        from,
        to: n.token,
        data: encodeFunctionData({
          abi: erc20Abi,
          functionName: "approve",
          args: [n.escrow, order.totalUnits],
        }),
        value: "0x0",
        action,
      };
    const allowance = await client.readContract({
      address: n.token,
      abi: erc20Abi,
      functionName: "allowance",
      args: [from as Hex, n.escrow],
    });
    if (allowance < order.totalUnits)
      throw Error("Approve the exact token allowance before funding.");
    functionName = "fund";
    args = [
      order.jobKey,
      order.sellerAddress,
      order.totalUnits,
      BigInt(Math.floor(order.deliverBy.getTime() / 1000)),
      BigInt(order.reviewSeconds),
      order.termsHash,
    ];
  } else if (action === "submit") {
    if (
      !seller ||
      task.status !== "validating" ||
      !task.artifacts[0] ||
      task.artifacts[0].validationStatus !== "passed"
    )
      throw Error("Submit a valid artifact before committing delivery.");
    from = order.sellerAddress;
    functionName = "submit";
    args.push(deliveryHash(task.artifacts[0]));
  } else if (action === "approve") {
    if (
      !buyer ||
      task.status !== "validating" ||
      !task.artifacts[0] ||
      task.artifacts[0].validationStatus !== "passed" ||
      job[9] !== deliveryHash(task.artifacts[0])
    )
      throw Error(
        "The on-chain delivery must match the validated artifact before approval.",
      );
    from = order.buyerAddress;
    functionName = "approve";
  } else if (action === "dispute") {
    if (!buyer && !seller) throw Error("Only a participant may dispute.");
    from = buyer ? order.buyerAddress : order.sellerAddress;
    functionName = "dispute";
  } else if (["refundExpired", "refundUnresolved"].includes(action)) {
    if (!buyer) throw Error("Only the buyer can claim this refund.");
    from = order.buyerAddress;
    functionName = action;
  } else if (["sellerRefund", "claimAfterReview"].includes(action)) {
    if (!seller) throw Error("Only the seller can perform this action.");
    from = order.sellerAddress;
    functionName = action;
  } else if (action === "resolve") {
    if (
      user.role !== "admin" ||
      !grossSellerUnits ||
      !/^\d+$/.test(grossSellerUnits) ||
      BigInt(grossSellerUnits) > order.totalUnits
    )
      throw Error(
        "An administrator must specify the seller allocation within the funded amount.",
      );
    from = order.arbiter;
    functionName = "resolve";
    args.push(BigInt(grossSellerUnits));
  } else throw Error("Unknown wallet action.");
  const data = txData(functionName, args);
  await client.call({ account: from as Hex, to: n.escrow, data });
  return { chainId: n.chainId, from, to: n.escrow, data, value: "0x0", action };
}
export async function reconcileOrder(taskId: string, hash: string) {
  const order = await prisma.paymentOrder.findUniqueOrThrow({
    where: { taskId },
  });
  const { n, client } = await verifiedNetwork(order.network);
  assertOrder(order, n);
  const receipt = await client.getTransactionReceipt({ hash: hash as Hex });
  if (
    receipt.status !== "success" ||
    receipt.to?.toLowerCase() !== order.escrow.toLowerCase()
  )
    throw Error("This is not a successful escrow transaction.");
  const height = await client.getBlockNumber();
  if (height - receipt.blockNumber + 1n < BigInt(n.confirmations))
    throw Error(
      "Waiting for network confirmations. Retry the same transaction hash.",
    );
  const block = await client.getBlock({ blockNumber: receipt.blockNumber });
  if (block.hash !== receipt.blockHash)
    throw Error("Transaction was reorganized; wait for a canonical receipt.");
  const decoded = receipt.logs
    .filter((l) => l.address.toLowerCase() === order.escrow.toLowerCase())
    .flatMap((l) => {
      try {
        return [
          decodeEventLog({ abi: escrowAbi, data: l.data, topics: l.topics }),
        ];
      } catch {
        return [];
      }
    })
    .filter((e) => (e.args as { jobId?: string }).jobId === order.jobKey);
  if (!decoded.length) throw Error("Receipt does not refer to this agreement.");
  const job = (await client.readContract({
    address: n.escrow,
    abi: escrowAbi,
    functionName: "jobs",
    args: [order.jobKey],
    blockNumber: receipt.blockNumber,
  })) as readonly unknown[];
  if (
    String(job[0]).toLowerCase() !== order.buyerAddress.toLowerCase() ||
    String(job[1]).toLowerCase() !== order.sellerAddress.toLowerCase() ||
    job[2] !== order.totalUnits ||
    job[8] !== order.termsHash ||
    Number(job[3]) !== Math.floor(order.deliverBy.getTime() / 1000) ||
    Number(job[4]) !== order.reviewSeconds
  )
    throw Error("On-chain agreement terms do not match.");
  const at = new Date(Number(block.timestamp) * 1000);
  await prisma.$transaction(
    async (tx) => {
      const previous = await tx.paymentAttempt.findUnique({
        where: {
          network_transactionHash: {
            network: order.network,
            transactionHash: hash.toLowerCase(),
          },
        },
      });
      if (previous) {
        if (previous.orderId !== order.id)
          throw Error("Receipt already belongs to another agreement.");
        return;
      }
      const fresh = await tx.paymentOrder.findUniqueOrThrow({
        where: { id: order.id },
      });
      await tx.paymentAttempt.create({
        data: {
          orderId: order.id,
          network: order.network,
          transactionHash: hash.toLowerCase(),
          kind: decoded.map((e) => e.eventName).join(","),
          state: "confirmed",
          blockHash: receipt.blockHash,
          blockNumber: receipt.blockNumber,
          confirmedAt: at,
        },
      });
      if (!fresh.fundedAt && !decoded.some((e) => e.eventName === "Funded"))
        throw Error("Reconcile the funding transaction first.");
      for (const e of decoded) {
        const args = e.args as unknown as Record<string, unknown>;
        const eventKey = `${n.id}:${hash}:${e.eventName}`;
        if (e.eventName === "Funded") {
          if (fresh.state !== "quoted") continue;
          await tx.paymentOrder.update({
            where: { id: order.id },
            data: { state: "funded", fundedAt: at },
          });
          await tx.payment.update({
            where: { taskId },
            data: {
              status: "escrowed",
              transactionHash: hash,
              livemode: n.live,
            },
          });
          await tx.task.update({
            where: { id: taskId },
            data: { fundedAt: at },
          });
          await tx.ledgerEntry.create({
            data: {
              orderId: order.id,
              eventKey,
              network: n.id,
              token: n.token,
              debitAccount: `wallet:${order.buyerAddress}`,
              creditAccount: `escrow:${order.id}`,
              amountUnits: order.totalUnits,
              transactionHash: hash,
            },
          });
        }
        if (
          e.eventName === "Submitted" &&
          !["released", "refunded", "disputed"].includes(fresh.state)
        )
          await tx.paymentOrder.update({
            where: { id: order.id },
            data: {
              state: "submitted",
              artifactHash: String(args.artifactHash),
            },
          });
        if (
          e.eventName === "Disputed" &&
          !["released", "refunded"].includes(fresh.state)
        ) {
          await tx.paymentOrder.update({
            where: { id: order.id },
            data: { state: "disputed" },
          });
          await tx.task.update({
            where: { id: taskId },
            data: { status: "disputed" },
          });
          const participant = await tx.task.findUniqueOrThrow({
            where: { id: taskId },
            include: { sellerAgent: true },
          });
          const openedById =
            String(args.by).toLowerCase() === order.buyerAddress.toLowerCase()
              ? participant.buyerId
              : participant.sellerAgent!.ownerId;
          await tx.dispute.create({
            data: {
              taskId,
              openedById,
              reason: `On-chain dispute ${hash}. Both parties should provide supporting evidence to the dispute authority.`,
              status: "open",
              createdAt: at,
            },
          });
        }
        if (e.eventName === "Settled") {
          const seller = BigInt(String(args.sellerAmount)),
            fee = BigInt(String(args.feeAmount)),
            refund = BigInt(String(args.buyerRefund));
          if (
            seller + fee + refund !== order.totalUnits ||
            ((seller + fee) * BigInt(order.feeBps)) / 10000n !== fee
          )
            throw Error("Settlement amounts do not match.");
          await tx.paymentOrder.update({
            where: { id: order.id },
            data: {
              state: seller + fee === 0n ? "refunded" : "released",
              settledAt: at,
              artifactHash: String(job[9]),
            },
          });
          await tx.payment.update({
            where: { taskId },
            data: {
              status: seller + fee === 0n ? "refunded" : "released",
              transactionHash: hash,
              livemode: n.live,
            },
          });
          if (Number(job[6]) > 0)
            await tx.dispute.updateMany({
              where: { taskId, status: { in: ["open", "reviewing"] } },
              data: {
                status: "resolved",
                resolution: `On-chain settlement ${hash}: seller ${seller}, fee ${fee}, buyer refund ${refund} atomic units. This financial decision does not by itself establish misconduct.`,
              },
            });
          const artifact = await tx.artifact.findFirst({
            where: { taskId },
            orderBy: { createdAt: "desc" },
          });
          const completed =
            refund === 0n &&
            artifact?.validationStatus === "passed" &&
            deliveryHash(artifact) === job[9];
          await tx.task.update({
            where: { id: taskId },
            data: {
              status: completed
                ? "completed"
                : refund > 0n
                  ? "cancelled"
                  : "disputed",
              completedAt: completed ? at : null,
            },
          });
          for (const [account, amount] of [
            [`wallet:${order.sellerAddress}`, seller],
            [`treasury:${order.treasury}`, fee],
            [`wallet:${order.buyerAddress}`, refund],
          ] as const)
            if (amount > 0n)
              await tx.ledgerEntry.create({
                data: {
                  orderId: order.id,
                  eventKey: `${eventKey}:${account}`,
                  network: n.id,
                  token: n.token,
                  debitAccount: `escrow:${order.id}`,
                  creditAccount: account,
                  amountUnits: amount,
                  transactionHash: hash,
                },
              });
        }
        await tx.taskOutbox.upsert({
          where: { dedupeKey: eventKey },
          create: {
            taskId,
            event: e.eventName!,
            dedupeKey: eventKey,
            payload: { transactionHash: hash, network: n.id },
          },
          update: {},
        });
      }
    },
    { isolationLevel: "Serializable" },
  );
  return prisma.paymentOrder.findUniqueOrThrow({ where: { id: order.id } });
}
