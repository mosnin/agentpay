import { spawn } from "node:child_process";
import fs from "node:fs";
import { randomBytes, createHash } from "node:crypto";
import assert from "node:assert/strict";
import solc from "solc";
import { PrismaClient } from "@prisma/client";
import { chromium, expect } from "@playwright/test";
import { createPublicClient, createWalletClient, http, keccak256 } from "viem";
if (
  !/^postgresql:\/\/postgres@127\.0\.0\.1:56187\/bids_design(?:\?|$)/.test(
    process.env.DATABASE_URL || "",
  )
)
  throw Error(
    "This harness only accepts the isolated loopback bids_design database.",
  );
const evidence = process.env.BIDS_UI_EVIDENCE || "test-results/settlement-ui";
fs.mkdirSync(evidence, { recursive: true });
const db = new PrismaClient(),
  transport = http("http://127.0.0.1:18548"),
  client = createPublicClient({ transport }),
  root = "http://localhost:3193";
let chain, app, browser, agentId, taskId;
const actors = [];
let page;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const wallet = (account) => createWalletClient({ account, transport });
async function actor(name, address) {
  const secret = "bids_" + randomBytes(24).toString("hex");
  const user = await db.user.create({
    data: {
      name: `Settlement UI ${name}`,
      email: `ui-${name}-${randomBytes(8).toString("hex")}@test.invalid`,
      apiKeys: {
        create: {
          name: "Local settlement UI",
          prefix: secret.slice(0, 12),
          hashedKey: createHash("sha256").update(secret).digest("hex"),
        },
      },
      wallets: {
        create: {
          family: "evm",
          address,
          label: `Local ${name}`,
          verifiedAt: new Date(),
          isPayout: name === "seller",
        },
      },
    },
  });
  const a = {
    id: user.id,
    address,
    headers: { authorization: `Bearer ${secret}` },
  };
  actors.push(a);
  return a;
}
async function request(actor, path, data) {
  const r = await fetch(root + path, {
    method: data === undefined ? "GET" : "POST",
    headers: { ...actor.headers, "content-type": "application/json" },
    body: data === undefined ? undefined : JSON.stringify(data),
  });
  const result = await r.json();
  assert(r.ok, `${path}: ${r.status} ${JSON.stringify(result)}`);
  return result;
}
try {
  chain = spawn(
    process.execPath,
    ["node_modules/@foundry-rs/anvil/bin.mjs", "--port", "18548", "--silent"],
    { stdio: "ignore" },
  );
  let accounts;
  for (let i = 0; i < 80; i++) {
    try {
      accounts = await createWalletClient({ transport }).getAddresses();
      break;
    } catch {
      await sleep(100);
    }
  }
  assert(accounts);
  const compiled = JSON.parse(
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
  ).contracts["Token.sol"].TestToken;
  async function deploy(artifact, args = []) {
    return (
      await client.waitForTransactionReceipt({
        hash: await wallet(accounts[0]).deployContract({
          abi: artifact.abi,
          bytecode: artifact.bytecode,
          args,
          chain: null,
        }),
      })
    ).contractAddress;
  }
  const token = await deploy({
    abi: compiled.abi,
    bytecode: "0x" + compiled.evm.bytecode.object,
  });
  const escrow = await deploy(
    JSON.parse(fs.readFileSync("contracts/artifacts/BidsEscrow.json", "utf8")),
    [token, accounts[2], accounts[3], 500],
  );
  await client.waitForTransactionReceipt({
    hash: await wallet(accounts[0]).writeContract({
      address: token,
      abi: compiled.abi,
      functionName: "mint",
      args: [accounts[0], 100000000n],
      chain: null,
    }),
  });
  const network = {
    id: "local",
    chainId: 31337,
    rpcUrl: "http://127.0.0.1:18548",
    token,
    symbol: "USDC",
    decimals: 6,
    escrow,
    treasury: accounts[2],
    arbiter: accounts[3],
    feeBps: 500,
    confirmations: 1,
    codeHash: keccak256(await client.getCode({ address: escrow })),
    live: false,
    enabled: true,
  };
  app = spawn(
    process.execPath,
    ["node_modules/next/dist/bin/next", "start", "--port", "3193"],
    {
      env: {
        ...process.env,
        NEXT_PUBLIC_BIDS_PAYMENT_MODE: "crypto",
        BIDS_SETTLEMENT_NETWORKS: JSON.stringify([network]),
        BIDS_X402_CONFIG: "",
      },
      stdio: [
        "ignore",
        fs.openSync(evidence + "/settlement-ui-server.log", "w"),
        fs.openSync(evidence + "/settlement-ui-server-errors.log", "w"),
      ],
    },
  );
  let ready = false;
  for (let i = 0; i < 100; i++) {
    try {
      if ((await fetch(root + "/api/payments/networks")).ok) {
        ready = true;
        break;
      }
    } catch {}
    await sleep(100);
  }
  assert(ready, "Local app did not start");
  const buyer = await actor("buyer", accounts[0]),
    seller = await actor("seller", accounts[1]);
  const agent = await db.agent.create({
    data: {
      ownerId: seller.id,
      name: "Data profile verification",
      slug: "settlement-ui-" + randomBytes(8).toString("hex"),
      shortDescription: "Local funded UI fixture",
      longDescription: "Actual local contract and browser verification.",
      category: "Data",
    },
  });
  agentId = agent.id;
  const created = await request(buyer, "/api/tasks", {
    seller_agent_id: agentId,
    objective: "Return a summary of the supplied records",
    budget: 100,
    payment_rail: "crypto",
    output_schema: {
      type: "object",
      required: ["summary"],
      properties: { summary: { type: "string" } },
    },
  });
  taskId = created.task_id;
  browser = await chromium.launch({
    headless: true,
    ...(process.env.PLAYWRIGHT_CHROMIUM_PATH
      ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH }
      : {}),
  });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    extraHTTPHeaders: buyer.headers,
  });
  page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.exposeBinding("localWalletRequest", async (_, p) => {
    if (p.method === "eth_requestAccounts") return [buyer.address];
    if (p.method === "wallet_switchEthereumChain") {
      assert.equal(p.params[0].chainId, "0x7a69");
      return null;
    }
    if (p.method === "eth_sendTransaction") {
      const tx = p.params[0];
      assert.equal(tx.from.toLowerCase(), buyer.address.toLowerCase());
      assert(
        [token, escrow]
          .map((a) => a.toLowerCase())
          .includes(tx.to.toLowerCase()),
      );
      assert.equal(BigInt(tx.value), 0n);
      return client.request({ method: "eth_sendTransaction", params: [tx] });
    }
    throw Error("Unexpected wallet method " + p.method);
  });
  await page.addInitScript(() => {
    window.ethereum = { request: (p) => window.localWalletRequest(p) };
  });
  await page.goto(root + "/tasks/" + taskId);
  const panel = page.getByRole("region", { name: "Stablecoin settlement" });
  await panel
    .getByRole("button", { name: "Review fixed payment terms" })
    .click();
  await expect(panel).toContainText("Seller receives");
  await expect(panel).toContainText("95 USDC");
  await expect(panel).toContainText("5 USDC");
  await expect(panel).toContainText("Test network");
  await panel.screenshot({ path: evidence + "/settlement-terms-mobile.png" });
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
  );
  await panel
    .getByRole("button", { name: "1. Approve exact token allowance" })
    .click();
  await expect(panel).toContainText("Token approval submitted");
  await panel.getByRole("button", { name: "2. Fund 100 USDC" }).click();
  await panel
    .getByRole("button", { name: "Check transaction confirmation" })
    .click();
  await expect(panel).toContainText("Confirmed Funded");
  await request(seller, `/api/tasks/${taskId}/accept`, {});
  const delivery = await request(seller, `/api/tasks/${taskId}/artifacts`, {
    title: "Verified report",
    content: JSON.stringify({
      summary: "All three supplied records were profiled.",
    }),
  });
  assert.equal(delivery.valid, true);
  const tx = await request(seller, `/api/tasks/${taskId}/settlement`, {
    action: "submit",
  });
  const submitted = await wallet(seller.address).sendTransaction({
    to: tx.to,
    data: tx.data,
    value: BigInt(tx.value),
    chain: null,
  });
  await client.waitForTransactionReceipt({ hash: submitted });
  await request(seller, `/api/tasks/${taskId}/settlement`, {
    action: "reconcile",
    transactionHash: submitted,
  });
  await page.reload();
  await panel
    .getByRole("button", { name: "Approve delivery and release 100 USDC" })
    .click();
  await panel
    .getByRole("button", { name: "Check transaction confirmation" })
    .click();
  await expect(panel).toContainText("Confirmed Settled");
  await panel.screenshot({ path: evidence + "/settlement-receipt-mobile.png" });
  const balance = (address) =>
    client.readContract({
      address: token,
      abi: compiled.abi,
      functionName: "balanceOf",
      args: [address],
    });
  assert.equal(await balance(seller.address), 95000000n);
  assert.equal(await balance(accounts[2]), 5000000n);
  assert.equal(await balance(escrow), 0n);
  assert.equal(
    (await db.task.findUniqueOrThrow({ where: { id: taskId } })).status,
    "completed",
  );
  const report = await request(buyer, "/api/trust/profile");
  assert.equal(report.buyer.score, null);
  assert.deepEqual(errors, []);
  const result = {
    journey:
      "UI quote → exact allowance → funding → real seller API acceptance/delivery → seller chain commitment → UI approval → confirmed receipt",
    buyerPaid: "100 local test USDC",
    sellerReceived: "95 local test USDC",
    treasuryReceived: "5 local test USDC",
    escrowRemaining: "0",
    taskStatus: "completed",
    testPaymentExcludedFromTrust: true,
    browserErrors: errors,
    provider:
      "Injected test wallet forwarding actual transactions to isolated Anvil; no live funds or installed-wallet acceptance claimed",
  };
  fs.writeFileSync(
    evidence + "/settlement-ui-results.json",
    JSON.stringify(result, null, 2),
  );
  console.log(JSON.stringify(result, null, 2));
} catch (e) {
  if (page)
    await page.screenshot({
      path: evidence + "/settlement-ui-failure.png",
      fullPage: true,
    });
  throw e;
} finally {
  await browser?.close();
  try {
    if (taskId) {
      const order = await db.paymentOrder.findUnique({ where: { taskId } });
      if (order) {
        await db.ledgerEntry.deleteMany({ where: { orderId: order.id } });
        await db.paymentAttempt.deleteMany({ where: { orderId: order.id } });
        await db.paymentOrder.delete({ where: { id: order.id } });
      }
      await db.taskOutbox.deleteMany({ where: { taskId } });
      await db.task.delete({ where: { id: taskId } });
    }
    if (agentId) await db.agent.delete({ where: { id: agentId } });
    await db.user.deleteMany({
      where: { id: { in: actors.map((a) => a.id) } },
    });
  } finally {
    await db.$disconnect();
    app?.kill("SIGTERM");
    chain?.kill("SIGTERM");
  }
}
