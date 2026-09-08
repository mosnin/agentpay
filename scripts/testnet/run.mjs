import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { confirmedReceipt } from "./confirmation.mjs";
import {
  createPublicClient,
  createWalletClient,
  http,
  parseAbi,
  keccak256,
  encodeAbiParameters,
  parseAbiParameters,
  encodeFunctionData,
  encodeDeployData,
  parseEther,
  formatEther,
  parseSignature,
  toHex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";
import {
  wallets,
  publicWallets,
  stateDir,
  manifestFile,
  saveManifest,
  CHAIN_ID,
  USDC,
} from "./state.mjs";
const rpc = process.env.BIDS_TESTNET_RPC_URL || "https://sepolia.base.org";
const client = createPublicClient({
  chain: baseSepolia,
  transport: http(rpc, { timeout: 15000, retryCount: 1 }),
});
const privateState = wallets(),
  accounts = Object.fromEntries(
    Object.entries(privateState.roles).map(([r, a]) => [
      r,
      privateKeyToAccount(a.privateKey),
    ]),
  );
let manifest = fs.existsSync(manifestFile)
  ? JSON.parse(fs.readFileSync(manifestFile, "utf8"))
  : { ...publicWallets(), feeBps: 500, usdc: USDC, operations: {}, checks: [] };
assert.equal(manifest.chainId, CHAIN_ID);
assert.equal(manifest.usdc, USDC);
for (const [r, a] of Object.entries(accounts))
  assert.equal(manifest.addresses[r], a.address);
const persist = () => saveManifest(manifest);
const tokenAbi = parseAbi([
  "function balanceOf(address) view returns(uint256)",
  "function approve(address,uint256) returns(bool)",
  "function name() view returns(string)",
  "function version() view returns(string)",
  "function decimals() view returns(uint8)",
]);
const escrowArtifact = JSON.parse(
  fs.readFileSync("contracts/artifacts/BidsEscrow.json", "utf8"),
);
const routerArtifact = JSON.parse(
  fs.readFileSync("contracts/artifacts/BidsInstantRouter.json", "utf8"),
);
async function send(label, role, request) {
  const account = accounts[role];
  let op = manifest.operations[label];
  if (!op) {
    const wallet = createWalletClient({
      account,
      chain: baseSepolia,
      transport: http(rpc),
    });
    const prepared = await wallet.prepareTransactionRequest({
      ...request,
      account,
      chain: baseSepolia,
    });
    assert(
      prepared.gas * (prepared.maxFeePerGas || prepared.gasPrice || 0n) <=
        parseEther("0.001"),
      "Test gas cap exceeded",
    );
    const raw = await wallet.signTransaction(prepared);
    op = {
      role,
      hash: keccak256(raw),
      raw,
      createdAt: new Date().toISOString(),
    };
    manifest.operations[label] = op;
    persist();
  }
  assert.equal(op.role, role);
  let receipt = await client
    .getTransactionReceipt({ hash: op.hash })
    .catch(() => null);
  if (!receipt) {
    try {
      await client.sendRawTransaction({ serializedTransaction: op.raw });
    } catch {
      if (!(await client.getTransaction({ hash: op.hash }).catch(() => null)))
        throw Error(
          `${label}: broadcast uncertain; persisted transaction preserved for retry`,
        );
    }
  }
  receipt = await confirmedReceipt(client, op.hash);
  assert.equal(receipt.status, "success", `${label} reverted`);
  assert.equal(
    (await client.getBlock({ blockNumber: receipt.blockNumber })).hash,
    receipt.blockHash,
    "Noncanonical receipt",
  );
  op.blockNumber = receipt.blockNumber.toString();
  op.blockHash = receipt.blockHash;
  op.contractAddress = receipt.contractAddress;
  op.confirmedAt = new Date().toISOString();
  persist();
  console.log(`${label}: https://sepolia.basescan.org/tx/${op.hash}`);
  return receipt;
}
const tokenBalance = (address) =>
  client.readContract({
    address: USDC,
    abi: tokenAbi,
    functionName: "balanceOf",
    args: [address],
  });
const escrowTx = (name, args) => ({
  to: manifest.escrow,
  data: encodeFunctionData({
    abi: escrowArtifact.abi,
    functionName: name,
    args,
  }),
  value: 0n,
});
function check(name) {
  if (!manifest.checks.includes(name)) manifest.checks.push(name);
  persist();
  console.log("PASS " + name);
}
async function rejected(role, functionName, args) {
  let rejected = false;
  try {
    await client.simulateContract({
      account: accounts[role].address,
      address: manifest.escrow,
      abi: escrowArtifact.abi,
      functionName,
      args,
    });
  } catch (e) {
    if (
      e.name === "ContractFunctionExecutionError" &&
      e.cause?.name === "ContractFunctionRevertedError"
    )
      rejected = true;
    else throw e;
  }
  assert(rejected, `Expected rejection: ${functionName}`);
}
function job(name, amount) {
  manifest.jobs ??= {};
  if (!manifest.jobs[name]) {
    const terms = keccak256(
      toHex(`${manifest.createdAt}:${name}:${accounts.buyer.address}`),
    );
    manifest.jobs[name] = {
      terms,
      key: keccak256(
        encodeAbiParameters(parseAbiParameters("address,bytes32"), [
          accounts.buyer.address,
          terms,
        ]),
      ),
      amount: String(amount),
      deliverBy: Math.floor(Date.now() / 1000) + 7 * 86400,
      artifact: keccak256(
        toHex("Bids Base Sepolia actual test artifact: " + name),
      ),
    };
    persist();
  }
  return manifest.jobs[name];
}
async function fund(name, j) {
  await send(
    name + "-fund",
    "buyer",
    escrowTx("fund", [
      j.key,
      accounts.seller.address,
      BigInt(j.amount),
      BigInt(j.deliverBy),
      86400n,
      j.terms,
    ]),
  );
}
async function main() {
  assert.equal(
    await client.getChainId(),
    CHAIN_ID,
    "Refusing a network other than Base Sepolia",
  );
  assert.equal(
    await client.readContract({
      address: USDC,
      abi: tokenAbi,
      functionName: "decimals",
    }),
    6,
  );
  manifest.tokenName = await client.readContract({
    address: USDC,
    abi: tokenAbi,
    functionName: "name",
  });
  manifest.tokenVersion = await client.readContract({
    address: USDC,
    abi: tokenAbi,
    functionName: "version",
  });
  persist();
  const balances = Object.fromEntries(
    await Promise.all(
      Object.entries(accounts).map(async ([r, a]) => [
        r,
        formatEther(await client.getBalance({ address: a.address })),
      ]),
    ),
  );
  console.log(
    JSON.stringify({
      network: "Base Sepolia",
      testETH: balances,
      buyerTestUSDC: String(await tokenBalance(accounts.buyer.address)),
    }),
  );
  if (
    !manifest.escrow &&
    Object.keys(manifest.operations).length === 0 &&
    (await client.getBalance({ address: accounts.deployer.address })) <
      parseEther("0.001")
  )
    throw Error(
      `Test funding required: send at least 0.001 Base Sepolia ETH to ${accounts.deployer.address}`,
    );
  for (const role of ["buyer", "seller", "arbiter"])
    await send("gas-" + role, "deployer", {
      to: accounts[role].address,
      value: parseEther("0.0001"),
    });
  if (!manifest.escrow) {
    const r = await send("deploy-escrow", "deployer", {
      data: encodeDeployData({
        abi: escrowArtifact.abi,
        bytecode: escrowArtifact.bytecode,
        args: [USDC, accounts.treasury.address, accounts.arbiter.address, 500],
      }),
      value: 0n,
    });
    manifest.escrow = r.contractAddress;
    manifest.deploymentBlock = r.blockNumber.toString();
    persist();
  }
  if (!manifest.router) {
    const r = await send("deploy-router", "deployer", {
      data: encodeDeployData({
        abi: routerArtifact.abi,
        bytecode: routerArtifact.bytecode,
        args: [USDC, accounts.treasury.address, 500],
      }),
      value: 0n,
    });
    manifest.router = r.contractAddress;
    persist();
  }
  manifest.codeHash = keccak256(
    await client.getCode({ address: manifest.escrow }),
  );
  manifest.routerCodeHash = keccak256(
    await client.getCode({ address: manifest.router }),
  );
  persist();
  for (const [address, abi] of [
    [manifest.escrow, escrowArtifact.abi],
    [manifest.router, routerArtifact.abi],
  ]) {
    assert.equal(
      (
        await client.readContract({ address, abi, functionName: "token" })
      ).toLowerCase(),
      USDC.toLowerCase(),
    );
    assert.equal(
      (
        await client.readContract({ address, abi, functionName: "treasury" })
      ).toLowerCase(),
      accounts.treasury.address.toLowerCase(),
    );
    assert.equal(
      Number(
        await client.readContract({ address, abi, functionName: "feeBps" }),
      ),
      500,
    );
  }
  check("Deployed immutable token, treasury and 5% test fee match");
  if (!manifest.initialBalances) {
    manifest.initialBalances = {
      buyer: String(await tokenBalance(accounts.buyer.address)),
      seller: String(await tokenBalance(accounts.seller.address)),
      treasury: String(await tokenBalance(accounts.treasury.address)),
    };
    persist();
    assert(
      BigInt(manifest.initialBalances.buyer) >= 6000000n,
      "Buyer needs six test USDC",
    );
  }
  await send("approve-budget", "buyer", {
    to: USDC,
    data: encodeFunctionData({
      abi: tokenAbi,
      functionName: "approve",
      args: [manifest.escrow, 5000000n],
    }),
    value: 0n,
  });
  const release = job("release", 1000000n);
  await fund("release", release);
  await send(
    "release-submit",
    "seller",
    escrowTx("submit", [release.key, release.artifact]),
  );
  await send("release-approve", "buyer", escrowTx("approve", [release.key]));
  await rejected("buyer", "approve", [release.key]);
  check("Fund, artifact commitment, release and duplicate-release rejection");
  const refund = job("refund", 2000000n);
  await fund("refund", refund);
  await send(
    "voluntary-refund",
    "seller",
    escrowTx("sellerRefund", [refund.key]),
  );
  check("Voluntary full refund");
  const dispute = job("dispute", 2000000n);
  await fund("dispute", dispute);
  await send(
    "dispute-submit",
    "seller",
    escrowTx("submit", [dispute.key, dispute.artifact]),
  );
  await send("open-dispute", "buyer", escrowTx("dispute", [dispute.key]));
  await rejected("buyer", "approve", [dispute.key]);
  await rejected("buyer", "resolve", [dispute.key, 1000000n]);
  await send(
    "resolve-dispute",
    "arbiter",
    escrowTx("resolve", [dispute.key, 1000000n]),
  );
  check(
    "Dispute freezes approval, rejects unauthorized resolution and supports partial refund",
  );
  const requestId = keccak256(toHex(`${manifest.createdAt}:instant`)),
    amount = 1000000n;
  const nonce = keccak256(
    encodeAbiParameters(
      parseAbiParameters("bytes32,address,uint256,uint16,address"),
      [
        requestId,
        accounts.seller.address,
        amount,
        500,
        accounts.treasury.address,
      ],
    ),
  );
  if (!manifest.operations["instant-pay"]) {
    const validAfter = 0n,
      validBefore = BigInt(Math.floor(Date.now() / 1000) + 300);
    const signature = await accounts.buyer.signTypedData({
      domain: {
        name: manifest.tokenName,
        version: manifest.tokenVersion,
        chainId: CHAIN_ID,
        verifyingContract: USDC,
      },
      types: {
        ReceiveWithAuthorization: [
          { name: "from", type: "address" },
          { name: "to", type: "address" },
          { name: "value", type: "uint256" },
          { name: "validAfter", type: "uint256" },
          { name: "validBefore", type: "uint256" },
          { name: "nonce", type: "bytes32" },
        ],
      },
      primaryType: "ReceiveWithAuthorization",
      message: {
        from: accounts.buyer.address,
        to: manifest.router,
        value: amount,
        validAfter,
        validBefore,
        nonce,
      },
    });
    const { r, s, v } = parseSignature(signature);
    await send("instant-pay", "deployer", {
      to: manifest.router,
      data: encodeFunctionData({
        abi: routerArtifact.abi,
        functionName: "purchase",
        args: [
          requestId,
          accounts.seller.address,
          accounts.buyer.address,
          amount,
          validBefore,
          Number(v),
          r,
          s,
        ],
      }),
      value: 0n,
    });
  } else await send("instant-pay", "deployer", {});
  check(
    "Native test USDC ReceiveWithAuthorization atomically splits instant payment",
  );
  const sellerDelta =
      (await tokenBalance(accounts.seller.address)) -
      BigInt(manifest.initialBalances.seller),
    treasuryDelta =
      (await tokenBalance(accounts.treasury.address)) -
      BigInt(manifest.initialBalances.treasury),
    buyerSpent =
      BigInt(manifest.initialBalances.buyer) -
      (await tokenBalance(accounts.buyer.address));
  assert.equal(sellerDelta, 2850000n);
  assert.equal(treasuryDelta, 150000n);
  assert.equal(buyerSpent, 3000000n);
  assert.equal(await tokenBalance(manifest.escrow), 0n);
  assert.equal(await tokenBalance(manifest.router), 0n);
  check(
    "Exact aggregate conservation: buyer 3 USDC, seller 2.85, treasury 0.15, zero stranded balances",
  );
  manifest.completedAt = new Date().toISOString();
  manifest.result = {
    buyerSpent: String(buyerSpent),
    sellerReceived: String(sellerDelta),
    treasuryReceived: String(treasuryDelta),
    escrowRemaining: "0",
    routerRemaining: "0",
  };
  persist();
  const network = {
    id: "base-sepolia",
    chainId: CHAIN_ID,
    rpcUrl: rpc,
    token: USDC,
    symbol: "USDC",
    decimals: 6,
    escrow: manifest.escrow,
    treasury: accounts.treasury.address,
    arbiter: accounts.arbiter.address,
    feeBps: 500,
    deploymentBlock: manifest.deploymentBlock,
    confirmations: 3,
    codeHash: manifest.codeHash,
    live: false,
    enabled: true,
    explorer: "https://sepolia.basescan.org",
  };
  fs.writeFileSync(
    path.join(stateDir, "network.json"),
    JSON.stringify([network], null, 2),
    { mode: 0o600 },
  );
  const receipt = {
    ...manifest,
    operations: Object.fromEntries(
      Object.entries(manifest.operations).map(([k, { raw, ...v }]) => [k, v]),
    ),
  };
  fs.mkdirSync("docs/testnet", { recursive: true });
  fs.writeFileSync(
    "docs/testnet/base-sepolia-receipt.json",
    JSON.stringify(receipt, null, 2),
  );
  console.log("Base Sepolia test suite completed.");
}
main().catch((e) => {
  console.error(e.shortMessage || e.message);
  process.exitCode = 1;
});
