import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { spawn, type ChildProcess } from "node:child_process";
import fs from "node:fs";
import {
  createPublicClient,
  createWalletClient,
  http,
  keccak256,
  type Hex,
  parseAbi,
  parseSignature,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
vi.mock("server-only", () => ({}));
// Explicitly opt in, and only against a loopback database named bids_design.
const run = process.env.BIDS_CHAIN_INTEGRATION === "1";
let server: ChildProcess;
let prisma: typeof import("@/lib/prisma").prisma;
let orders: typeof import("@/lib/settlement/orders");
let instant: typeof import("@/lib/payments/x402-live");
const transport = http("http://127.0.0.1:18547");
const client = createPublicClient({ transport });
let accounts: Hex[];
let token: Hex, escrow: Hex, router: Hex;
let buyerId: string,
  sellerId: string,
  agentId: string,
  taskId: string,
  walletId: string;
const prefix = `chain-${Date.now()}`;
const tokenAbi = parseAbi([
  "function mint(address,uint256)",
  "function approve(address,uint256) returns(bool)",
  "function balanceOf(address) view returns(uint256)",
]);
function wallet(account: Hex) {
  return createWalletClient({ account, transport });
}
async function send(account: Hex, to: Hex, data: Hex) {
  const hash = await wallet(account).sendTransaction({ to, data, chain: null });
  await client.waitForTransactionReceipt({ hash });
  return hash;
}
describe.skipIf(!run)(
  "actual EVM settlement and persistent receipt recovery",
  () => {
    beforeAll(async () => {
      if (
        !/^postgresql:\/\/postgres@127\.0\.0\.1:56187\/bids_design(?:\?|$)/.test(
          process.env.DATABASE_URL || "",
        )
      )
        throw Error("Refusing non-test database");
      server = spawn(
        process.execPath,
        [
          "node_modules/@foundry-rs/anvil/bin.mjs",
          "--port",
          "18547",
          "--silent",
        ],
        { stdio: "ignore" },
      );
      for (let i = 0; i < 100; i++) {
        try {
          accounts = await createWalletClient({ transport }).getAddresses();
          break;
        } catch {
          await new Promise((r) => setTimeout(r, 100));
        }
      }
      expect(accounts).toBeTruthy();
      const solc = (await import("solc")).default;
      const output = JSON.parse(
        solc.compile(
          JSON.stringify({
            language: "Solidity",
            sources: {
              "Token.sol": {
                content: fs.readFileSync("contracts/test/Token.sol", "utf8"),
              },
            },
            settings: {
              evmVersion: "paris",
              outputSelection: { "*": { "*": ["abi", "evm.bytecode.object"] } },
            },
          }),
        ),
      );
      const compiled = output.contracts["Token.sol"].TestToken;
      async function deploy(
        a: { abi: unknown[]; bytecode: Hex },
        args: unknown[] = [],
      ) {
        const hash = await wallet(accounts[0]).deployContract({
          abi: a.abi,
          bytecode: a.bytecode,
          args,
          chain: null,
        });
        return (await client.waitForTransactionReceipt({ hash }))
          .contractAddress!;
      }
      token = await deploy({
        abi: compiled.abi,
        bytecode: `0x${compiled.evm.bytecode.object}`,
      });
      escrow = await deploy(
        JSON.parse(
          fs.readFileSync("contracts/artifacts/BidsEscrow.json", "utf8"),
        ),
        [token, accounts[2], accounts[3], 500],
      );
      router = await deploy(
        JSON.parse(
          fs.readFileSync("contracts/artifacts/BidsInstantRouter.json", "utf8"),
        ),
        [token, accounts[2], 500],
      );
      process.env.BIDS_SETTLEMENT_NETWORKS = JSON.stringify([
        {
          id: "local",
          chainId: 31337,
          rpcUrl: "http://127.0.0.1:18547",
          token,
          symbol: "USDC",
          decimals: 6,
          escrow,
          treasury: accounts[2],
          arbiter: accounts[3],
          feeBps: 500,
          confirmations: 1,
          codeHash: keccak256((await client.getCode({ address: escrow }))!),
          live: false,
          enabled: true,
        },
      ]);
      process.env.BIDS_X402_CONFIG = JSON.stringify({
        network: "local",
        router,
        codeHash: keccak256((await client.getCode({ address: router }))!),
        seller: accounts[1],
        treasury: accounts[2],
        feeBps: 500,
        priceUnits: "10000",
        tokenName: "USD Coin",
        tokenVersion: "2",
        maxGasCostWei: "100000000000000000",
      });
      // Public Anvil fixture key, never used outside this local test node.
      process.env.BIDS_RELAYER_PRIVATE_KEY =
        "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
      ({ prisma } = await import("@/lib/prisma"));
      orders = await import("@/lib/settlement/orders");
      instant = await import("@/lib/payments/x402-live");
      const buyer = await prisma.user.create({
        data: { email: `${prefix}-buyer@test.invalid`, name: "Chain buyer" },
      });
      buyerId = buyer.id;
      const seller = await prisma.user.create({
        data: { email: `${prefix}-seller@test.invalid`, name: "Chain seller" },
      });
      sellerId = seller.id;
      const agent = await prisma.agent.create({
        data: {
          name: "Real data service",
          slug: prefix,
          shortDescription: "Test service",
          longDescription: "Local integration fixture",
          category: "Data",
          ownerId: sellerId,
        },
      });
      agentId = agent.id;
      walletId = (
        await prisma.walletAccount.create({
          data: {
            userId: buyerId,
            family: "evm",
            address: accounts[0],
            label: "Test buyer",
            verifiedAt: new Date(),
          },
        })
      ).id;
      await prisma.walletAccount.create({
        data: {
          userId: sellerId,
          family: "evm",
          address: accounts[1],
          label: "Test seller",
          verifiedAt: new Date(),
          isPayout: true,
        },
      });
      taskId = (
        await prisma.task.create({
          data: {
            title: "Profile records",
            objective: "Measure supplied records",
            category: "Data",
            buyerId,
            sellerAgentId: agentId,
            budget: 100,
            status: "pending",
            payment: {
              create: {
                amount: 100,
                provider: "stablecoin",
                mode: "pay_per_task",
                status: "pending",
              },
            },
          },
        })
      ).id;
      await wallet(accounts[0]).writeContract({
        address: token,
        abi: tokenAbi,
        functionName: "mint",
        args: [accounts[0], 200000000n],
        chain: null,
      });
    }, 30000);
    afterAll(async () => {
      try {
        if (prisma && taskId) {
          const o = await prisma.paymentOrder.findUnique({ where: { taskId } });
          if (o) {
            await prisma.ledgerEntry.deleteMany({ where: { orderId: o.id } });
            await prisma.paymentAttempt.deleteMany({
              where: { orderId: o.id },
            });
            await prisma.paymentOrder.delete({ where: { id: o.id } });
          }
          await prisma.taskOutbox.deleteMany({ where: { taskId } });
          await prisma.task.delete({ where: { id: taskId } });
          if (agentId) await prisma.agent.delete({ where: { id: agentId } });
          if (buyerId)
            await prisma.paidRequest.deleteMany({ where: { userId: buyerId } });
          await prisma.relayerSequence.deleteMany({
            where: { id: { startsWith: "local:" } },
          });
          await prisma.user.deleteMany({
            where: { id: { in: [buyerId, sellerId].filter(Boolean) } },
          });
          await prisma.$disconnect();
        }
      } finally {
        server?.kill("SIGTERM");
        delete process.env.BIDS_RELAYER_PRIVATE_KEY;
      }
    }, 10000);
    it("funds, delivers, releases and records the exact split only once", async () => {
      const buyer = { id: buyerId, role: "buyer" },
        seller = { id: sellerId, role: "seller" };
      const order = await orders.createOrder(
        taskId,
        buyerId,
        "local",
        walletId,
      );
      expect(order.feeUnits).toBe(5000000n);
      await expect(
        orders.prepareOrderAction(taskId, seller, "fund"),
      ).rejects.toThrow();
      let tx = await orders.prepareOrderAction(
        taskId,
        buyer,
        "approve_allowance",
      );
      await send(accounts[0], tx.to as Hex, tx.data);
      tx = await orders.prepareOrderAction(taskId, buyer, "fund");
      const fundingHash = await send(accounts[0], tx.to as Hex, tx.data);
      await orders.reconcileOrder(taskId, fundingHash);
      await orders.reconcileOrder(taskId, fundingHash);
      expect(
        await prisma.ledgerEntry.count({ where: { orderId: order.id } }),
      ).toBe(1);
      expect(
        (await prisma.payment.findUniqueOrThrow({ where: { taskId } })).status,
      ).toBe("escrowed");
      await prisma.task.update({
        where: { id: taskId },
        data: {
          status: "validating",
          acceptedAt: new Date(),
          firstSubmittedAt: new Date(),
          artifacts: {
            create: {
              title: "Data profile",
              type: "json",
              content: '{"count":3}',
              validationStatus: "passed",
            },
          },
        },
      });
      await expect(
        orders.prepareOrderAction(taskId, buyer, "approve"),
      ).rejects.toThrow();
      tx = await orders.prepareOrderAction(taskId, seller, "submit");
      await orders.reconcileOrder(
        taskId,
        await send(accounts[1], tx.to as Hex, tx.data),
      );
      tx = await orders.prepareOrderAction(taskId, buyer, "approve");
      const releaseHash = await send(accounts[0], tx.to as Hex, tx.data);
      await orders.reconcileOrder(taskId, releaseHash);
      await orders.reconcileOrder(taskId, releaseHash);
      expect(
        (await prisma.task.findUniqueOrThrow({ where: { id: taskId } })).status,
      ).toBe("completed");
      expect(
        await prisma.ledgerEntry.count({ where: { orderId: order.id } }),
      ).toBe(3);
      expect(
        await client.readContract({
          address: token,
          abi: tokenAbi,
          functionName: "balanceOf",
          args: [accounts[1]],
        }),
      ).toBe(95000000n);
      const { getTrustReport } = await import("@/lib/trust/queries");
      expect((await getTrustReport(sellerId)).seller.score).toBeNull();
      expect((await getTrustReport(sellerId)).eligibleJobs).toBe(0);
    }, 30000);
    it("performs an x402 purchase and recovers the same paid output without a second transfer", async () => {
      const row = await instant.quoteInstant(buyerId, "stable-request-key", [
        { id: 1, email: "" },
        { id: 1, email: "" },
      ]);
      await expect(
        instant.quoteInstant(buyerId, "stable-request-key", [{ id: 2 }]),
      ).rejects.toThrow("Idempotency");
      const { BidsSplitClient } = await import("@/lib/payments/x402-client");
      const { x402Client } = await import("@x402/core/client");
      const signer = privateKeyToAccount(
        process.env.BIDS_RELAYER_PRIVATE_KEY as Hex,
      );
      const scheme = new BidsSplitClient(
        {
          address: signer.address,
          signTypedData: (args) => signer.signTypedData(args as never),
        },
        {
          network: "eip155:31337",
          asset: token,
          router,
          sellers: [accounts[1]],
          treasury: accounts[2],
          maxAmount: 10000n,
          maxFeeBps: 500,
          reserve: async () => {},
        },
      );
      const sdk = new x402Client()
        .setSpendControls({
          allowedAssets: [
            {
              network: "eip155:31337",
              asset: token,
              maxAmountPerPayment: "10000",
            },
          ],
        })
        .register("eip155:31337", scheme);
      const payload = await sdk.createPaymentPayload(
        instant.instantRequirements(row) as never,
      );
      const header = Buffer.from(JSON.stringify(payload)).toString("base64");
      await expect(instant.settleInstant(row, header)).rejects.toThrow(
        "awaiting confirmation",
      );
      const persisted = await prisma.paidRequest.findUniqueOrThrow({
        where: { id: row.id },
      });
      expect(persisted.rawTransaction).toMatch(/^0x/);
      await client.waitForTransactionReceipt({
        hash: persisted.transactionHash as Hex,
      });
      const paid = await instant.confirmInstant(
        await prisma.paidRequest.update({
          where: { id: row.id },
          data: { expiresAt: new Date(0) },
        }),
      );
      expect(paid.state).toBe("settled");
      expect(paid.output).toMatchObject({ rowCount: 2, duplicateRows: 1 });
      const again = await instant.settleInstant(paid, header);
      expect(again.transactionHash).toBe(paid.transactionHash);
      expect(
        await client.readContract({
          address: token,
          abi: tokenAbi,
          functionName: "balanceOf",
          args: [accounts[1]],
        }),
      ).toBe(95009500n);
      expect(
        await client.readContract({
          address: token,
          abi: tokenAbi,
          functionName: "balanceOf",
          args: [accounts[2]],
        }),
      ).toBe(5000500n);
    }, 30000);
    it("another payer cannot consume a buyer's instant request identifier", async () => {
      const row = await instant.quoteInstant(buyerId, "front-run-key", [
        { id: 1 },
      ]);
      const { receiveTypes, splitAuthorization } = await import(
        "@/lib/payments/x402-protocol"
      );
      const extra = instant.instantRequirements(row).accepts[0].extra;
      const abi = JSON.parse(
        fs.readFileSync("contracts/artifacts/BidsInstantRouter.json", "utf8"),
      ).abi;
      const domain = {
        name: "USD Coin",
        version: "2",
        chainId: 31337,
        verifyingContract: token,
      };
      const attackMessage = splitAuthorization(accounts[4], router, 100n, {
        ...extra,
        seller: accounts[4],
      });
      const attackSignature = parseSignature(
        await wallet(accounts[4]).signTypedData({
          domain,
          types: receiveTypes,
          primaryType: "ReceiveWithAuthorization",
          message: attackMessage,
        }),
      );
      await wallet(accounts[0]).writeContract({
        address: token,
        abi: tokenAbi,
        functionName: "mint",
        args: [accounts[4], 100n],
        chain: null,
      });
      const attackHash = await wallet(accounts[4]).writeContract({
        address: router,
        abi,
        functionName: "purchase",
        args: [
          row.id,
          accounts[4],
          accounts[4],
          100n,
          attackMessage.validBefore,
          Number(attackSignature.v ?? BigInt(attackSignature.yParity! + 27)),
          attackSignature.r,
          attackSignature.s,
        ],
        chain: null,
      });
      expect(
        (await client.waitForTransactionReceipt({ hash: attackHash })).status,
      ).toBe("success");
      const signer = privateKeyToAccount(
        process.env.BIDS_RELAYER_PRIVATE_KEY as Hex,
      );
      const signature = await signer.signTypedData({
        domain,
        types: receiveTypes,
        primaryType: "ReceiveWithAuthorization",
        message: splitAuthorization(
          signer.address,
          router,
          row.amountUnits,
          extra,
        ),
      });
      const header = Buffer.from(
        JSON.stringify({
          x402Version: 2,
          accepted: instant.instantRequirements(row).accepts[0],
          payload: { requestId: row.id, payer: signer.address, signature },
        }),
      ).toString("base64");
      await expect(instant.settleInstant(row, header)).rejects.toThrow(
        "awaiting confirmation",
      );
      const saved = await prisma.paidRequest.findUniqueOrThrow({
        where: { id: row.id },
      });
      await client.waitForTransactionReceipt({
        hash: saved.transactionHash as Hex,
      });
      expect((await instant.confirmInstant(saved)).state).toBe("settled");
    }, 30000);
  },
);
