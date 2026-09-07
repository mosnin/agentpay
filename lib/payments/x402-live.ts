import "server-only";
import { createHash } from "node:crypto";
import { z } from "zod";
import {
  createWalletClient,
  defineChain,
  http,
  isAddress,
  keccak256,
  parseSignature,
  encodeFunctionData,
  decodeEventLog,
  verifyTypedData,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { prisma } from "@/lib/prisma";
import { getSettlementNetwork } from "@/lib/settlement/networks";
import { chainClient } from "@/lib/settlement/evm";
import { profileRecords } from "@/lib/data-profile";
import routerArtifact from "@/contracts/artifacts/BidsInstantRouter.json";
import {
  SPLIT_SCHEME,
  receiveTypes,
  splitAuthorization,
  type SplitTerms,
} from "./x402-protocol";
import type { PaidRequest } from "@prisma/client";
const address = z
  .string()
  .refine(isAddress)
  .transform((v) => v as Hex);
const configSchema = z.object({
  network: z.string(),
  router: address,
  codeHash: z.string().regex(/^0x[0-9a-fA-F]{64}$/),
  seller: address,
  treasury: address,
  feeBps: z.number().int().min(0).max(1000),
  priceUnits: z.string().regex(/^[1-9][0-9]*$/),
  tokenName: z.string().min(1),
  tokenVersion: z.string().min(1),
  maxGasCostWei: z.string().regex(/^[1-9][0-9]*$/),
});
export function x402Config() {
  if (!process.env.BIDS_X402_CONFIG) return null;
  try {
    return configSchema.parse(JSON.parse(process.env.BIDS_X402_CONFIG));
  } catch {
    throw Error("Instant-payment configuration needs attention.");
  }
}
async function environment() {
  const c = x402Config();
  if (!c) throw Error("Instant payments are not configured.");
  const n = getSettlementNetwork(c.network);
  if (n.symbol !== "USDC")
    throw Error("This token has not been enabled for signed instant payments.");
  const client = chainClient(n);
  const [id, code, token, treasury, fee] = await Promise.all([
    client.getChainId(),
    client.getCode({ address: c.router }),
    ...(["token", "treasury", "feeBps"] as const).map((functionName) =>
      client.readContract({
        address: c.router,
        abi: routerArtifact.abi,
        functionName,
      }),
    ),
  ]);
  if (
    id !== n.chainId ||
    !code ||
    keccak256(code) !== c.codeHash ||
    String(token).toLowerCase() !== n.token.toLowerCase() ||
    String(treasury).toLowerCase() !== c.treasury.toLowerCase() ||
    Number(fee) !== c.feeBps
  )
    throw Error("Instant payment deployment mismatch.");
  return { c, n, client };
}
function hash(text: string) {
  return createHash("sha256").update(text).digest("hex");
}
export async function quoteInstant(
  userId: string,
  key: string,
  rows: Record<string, unknown>[],
) {
  const { c, n } = await environment();
  const id = `0x${hash(`${userId}:${key}`)}`;
  const inputHash = hash(JSON.stringify(rows));
  const prior = await prisma.paidRequest.findUnique({ where: { id } });
  if (prior) {
    if (prior.userId !== userId || prior.inputHash !== inputHash)
      throw Error("Idempotency key already belongs to another request.");
    return prior;
  }
  return prisma.paidRequest.create({
    data: {
      id,
      userId,
      inputHash,
      input: rows as never,
      network: n.id,
      sellerAddress: c.seller,
      treasury: c.treasury,
      router: c.router,
      asset: n.token,
      amountUnits: BigInt(c.priceUnits),
      feeBps: c.feeBps,
      nonce: id,
      expiresAt: new Date(Date.now() + 300000),
      output: profileRecords(rows),
    },
  });
}
export function instantRequirements(row: PaidRequest) {
  const c = x402Config();
  if (!c) throw Error("Instant payments are unavailable.");
  const n = getSettlementNetwork(row.network);
  const extra: SplitTerms = {
    requestId: row.id as Hex,
    seller: row.sellerAddress as Hex,
    treasury: row.treasury as Hex,
    feeBps: row.feeBps,
    validBefore: Math.floor(row.expiresAt.getTime() / 1000),
    name: c.tokenName,
    version: c.tokenVersion,
  };
  return {
    x402Version: 2,
    resource: {
      url: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/tools/data-profile`,
      description: "Data quality profile of supplied records",
      mimeType: "application/json",
    },
    accepts: [
      {
        scheme: SPLIT_SCHEME,
        network: `eip155:${n.chainId}`,
        asset: row.asset,
        amount: row.amountUnits.toString(),
        payTo: row.router,
        maxTimeoutSeconds: 300,
        extra,
      },
    ],
  };
}
export async function settleInstant(row: PaidRequest, header: string) {
  if (row.state === "settled") return row;
  const { c, n, client } = await environment();
  if (
    row.network !== n.id ||
    row.router.toLowerCase() !== c.router.toLowerCase() ||
    row.asset.toLowerCase() !== n.token.toLowerCase() ||
    row.treasury.toLowerCase() !== c.treasury.toLowerCase() ||
    row.feeBps !== c.feeBps
  )
    throw Error(
      "This quote belongs to a previous deployment; reconcile before changing configuration.",
    );
  if (header.length > 16000) throw Error("Payment header too large.");
  let raw: unknown;
  try {
    raw = JSON.parse(Buffer.from(header, "base64").toString("utf8"));
  } catch {
    throw Error("Invalid payment header.");
  }
  const parsed = z
    .object({
      x402Version: z.literal(2),
      accepted: z.object({
        scheme: z.literal(SPLIT_SCHEME),
        network: z.string(),
        asset: z.string(),
        amount: z.string(),
        payTo: z.string(),
      }),
      payload: z.object({
        payer: address,
        signature: z.string().regex(/^0x[0-9a-fA-F]{130}$/),
        requestId: z.literal(row.id),
      }),
    })
    .safeParse(raw);
  if (!parsed.success)
    throw Error("This service requires a bids-split-v1 x402 authorization.");
  const { payload, accepted } = parsed.data;
  if (
    accepted.network !== `eip155:${n.chainId}` ||
    accepted.asset.toLowerCase() !== row.asset.toLowerCase() ||
    accepted.amount !== row.amountUnits.toString() ||
    accepted.payTo.toLowerCase() !== row.router.toLowerCase()
  )
    throw Error("Payment requirements mismatch.");
  const extra = instantRequirements(row).accepts[0].extra;
  const authorization = splitAuthorization(
    payload.payer,
    row.router as Hex,
    row.amountUnits,
    extra,
  );
  if (
    !(await verifyTypedData({
      address: payload.payer,
      domain: {
        name: c.tokenName,
        version: c.tokenVersion,
        chainId: n.chainId,
        verifyingContract: n.token,
      },
      types: receiveTypes,
      primaryType: "ReceiveWithAuthorization",
      message: authorization,
      signature: payload.signature as Hex,
    }))
  )
    throw Error("Invalid payment signature.");
  const secret = process.env.BIDS_RELAYER_PRIVATE_KEY;
  if (!secret || !/^0x[0-9a-fA-F]{64}$/.test(secret))
    throw Error("The gas relayer is not configured.");
  const signer = privateKeyToAccount(secret as Hex);
  const chain = defineChain({
    id: n.chainId,
    name: n.id,
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    rpcUrls: { default: { http: [n.rpcUrl] } },
  });
  const wallet = createWalletClient({
    account: signer,
    chain,
    transport: http(n.rpcUrl),
  });
  let persisted = await prisma.paidRequest.findUniqueOrThrow({
    where: { id: row.id },
  });
  if (!persisted.rawTransaction) {
    if (row.expiresAt.getTime() <= Date.now())
      throw Error("Quote expired; use a new request key.");
    const signature = parseSignature(payload.signature as Hex);
    const data = encodeFunctionData({
      abi: routerArtifact.abi,
      functionName: "purchase",
      args: [
        row.id,
        row.sellerAddress,
        payload.payer,
        row.amountUnits,
        authorization.validBefore,
        Number(signature.v ?? BigInt(signature.yParity! + 27)),
        signature.r,
        signature.s,
      ],
    });
    persisted = await prisma.$transaction(
      async (tx) => {
        const sequence = `${n.id}:${signer.address}`;
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${sequence}))`;
        const fresh = await tx.paidRequest.findUniqueOrThrow({
          where: { id: row.id },
        });
        if (fresh.rawTransaction) return fresh;
        const pendingNonce = await client.getTransactionCount({
          address: signer.address,
          blockTag: "pending",
        });
        const saved = await tx.relayerSequence.findUnique({
          where: { id: sequence },
        });
        const nonce = Math.max(pendingNonce, Number(saved?.nextNonce ?? 0n));
        const prepared = await wallet.prepareTransactionRequest({
          account: signer,
          to: c.router,
          data,
          nonce,
          chain,
        });
        const cost =
          prepared.gas * (prepared.maxFeePerGas ?? prepared.gasPrice ?? 0n);
        if (cost > BigInt(c.maxGasCostWei))
          throw Error("Gas cost exceeds the relayer cap.");
        const rawTransaction = await wallet.signTransaction({
          ...prepared,
          chain,
        });
        const transactionHash = keccak256(rawTransaction);
        await tx.relayerSequence.upsert({
          where: { id: sequence },
          create: { id: sequence, nextNonce: BigInt(nonce + 1) },
          update: { nextNonce: BigInt(nonce + 1) },
        });
        return tx.paidRequest.update({
          where: { id: row.id },
          data: {
            payer: payload.payer,
            rawTransaction,
            transactionHash,
            relayerNonce: BigInt(nonce),
            state: "broadcasting",
          },
        });
      },
      { timeout: 30000 },
    );
  }
  if (persisted.payer?.toLowerCase() !== payload.payer.toLowerCase())
    throw Error("This request is already bound to another payer.");
  return confirmInstant(persisted);
}
export async function confirmInstant(persisted: PaidRequest) {
  if (persisted.state === "settled") return persisted;
  if (
    !persisted.rawTransaction ||
    !persisted.transactionHash ||
    !persisted.payer
  )
    throw Error("No signed payment is available to reconcile.");
  const row = persisted;
  const { c, n, client } = await environment();
  if (
    row.network !== n.id ||
    row.router.toLowerCase() !== c.router.toLowerCase() ||
    row.asset.toLowerCase() !== n.token.toLowerCase() ||
    row.treasury.toLowerCase() !== c.treasury.toLowerCase() ||
    row.feeBps !== c.feeBps
  )
    throw Error(
      "Restore the original deployment configuration before reconciling this payment.",
    );
  const payload = { payer: persisted.payer };
  let receipt;
  try {
    receipt = await client.getTransactionReceipt({
      hash: persisted.transactionHash as Hex,
    });
  } catch {
    try {
      await client.sendRawTransaction({
        serializedTransaction: persisted.rawTransaction as Hex,
      });
    } catch {
      /* Re-send of identical signed bytes can report already-known. */
    }
    throw Error(
      "Payment submitted or awaiting confirmation. Retry with the same request key and signature.",
    );
  }
  if (receipt.status !== "success")
    throw Error(
      "Payment transaction reverted. No service payment was collected; inspect its network fee before creating a new request.",
    );
  const height = await client.getBlockNumber();
  if (height - receipt.blockNumber + 1n < BigInt(n.confirmations))
    throw Error("Payment awaits confirmations. Retry the same request.");
  const block = await client.getBlock({ blockNumber: receipt.blockNumber });
  if (block.hash !== receipt.blockHash)
    throw Error("Payment receipt is not canonical yet.");
  const event = receipt.logs
    .filter((l) => l.address.toLowerCase() === c.router.toLowerCase())
    .flatMap((l) => {
      try {
        return [
          decodeEventLog({
            abi: routerArtifact.abi,
            data: l.data,
            topics: l.topics,
          }),
        ];
      } catch {
        return [];
      }
    })
    .find(
      (e) =>
        e.eventName === "Purchased" &&
        (e.args as { requestId?: string }).requestId === row.id,
    );
  if (!event) throw Error("Payment receipt does not match this request.");
  const args = event.args as unknown as {
    payer: string;
    seller: string;
    sellerAmount: bigint;
    feeAmount: bigint;
  };
  if (
    args.payer.toLowerCase() !== payload.payer.toLowerCase() ||
    args.seller.toLowerCase() !== row.sellerAddress.toLowerCase() ||
    args.sellerAmount + args.feeAmount !== row.amountUnits ||
    args.feeAmount !== (row.amountUnits * BigInt(row.feeBps)) / 10000n
  )
    throw Error("Receipt split mismatch.");
  return prisma.paidRequest.update({
    where: { id: row.id },
    data: {
      state: "settled",
      settledAt: new Date(Number(block.timestamp) * 1000),
    },
  });
}
