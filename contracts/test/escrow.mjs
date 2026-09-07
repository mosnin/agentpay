import { spawn } from "node:child_process";
import fs from "node:fs";
import assert from "node:assert/strict";
import solc from "solc";
import {
  createPublicClient,
  createWalletClient,
  http,
  keccak256,
  encodeAbiParameters,
  parseAbiParameters,
  toHex,
} from "viem";
const port = 18546;
const server = spawn(
  process.execPath,
  [
    "node_modules/@foundry-rs/anvil/bin.mjs",
    "--port",
    String(port),
    "--silent",
  ],
  { stdio: "ignore" },
);
const transport = http(`http://127.0.0.1:${port}`);
const client = createPublicClient({ transport });
try {
  let accounts;
  for (let i = 0; i < 60; i++) {
    try {
      accounts = await client.request({ method: "eth_accounts" });
      break;
    } catch {
      await new Promise((r) => setTimeout(r, 100));
    }
  }
  assert(accounts, "Anvil did not start");
  const [buyer, seller, treasury, arbiter, attacker] = accounts;
  const wallets = Object.fromEntries(
    accounts.map((a) => [a, createWalletClient({ account: a, transport })]),
  );
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
  async function deploy(abi, bytecode, args = []) {
    const hash = await wallets[buyer].deployContract({
      abi,
      bytecode,
      args,
      chain: null,
    });
    return (await client.waitForTransactionReceipt({ hash })).contractAddress;
  }
  const token = await deploy(compiled.abi, `0x${compiled.evm.bytecode.object}`);
  const artifact = JSON.parse(
    fs.readFileSync("contracts/artifacts/BidsEscrow.json", "utf8"),
  );
  const escrow = await deploy(artifact.abi, artifact.bytecode, [
    token,
    treasury,
    arbiter,
    500,
  ]);
  async function write(account, address, abi, functionName, args) {
    const hash = await wallets[account].writeContract({
      address,
      abi,
      functionName,
      args,
      chain: null,
    });
    const receipt = await client.waitForTransactionReceipt({ hash });
    assert.equal(receipt.status, "success");
    return receipt;
  }
  const call = (who, fn, args) => write(who, escrow, artifact.abi, fn, args);
  const balance = (a) =>
    client.readContract({
      address: token,
      abi: compiled.abi,
      functionName: "balanceOf",
      args: [a],
    });
  async function reject(who, fn, args) {
    let failed = false;
    try {
      await call(who, fn, args);
    } catch {
      failed = true;
    }
    assert(failed, `${fn} must reject`);
  }
  await write(buyer, token, compiled.abi, "mint", [buyer, 1000000000000n]);
  await write(buyer, token, compiled.abi, "approve", [escrow, 1000000000000n]);
  let counter = 0;
  async function fund() {
    const block = await client.getBlock();
    const terms = keccak256(toHex(`terms-${counter++}`));
    const id = keccak256(
      encodeAbiParameters(parseAbiParameters("address,bytes32"), [
        buyer,
        terms,
      ]),
    );
    const deadline = block.timestamp + 86400n;
    await call(buyer, "fund", [
      id,
      seller,
      100000000n,
      deadline,
      86400n,
      terms,
    ]);
    return { id, deadline, terms };
  }
  const output = keccak256(toHex("actual artifact bytes"));
  const a = await fund();
  await reject(attacker, "submit", [a.id, output]);
  await reject(buyer, "approve", [a.id]);
  await reject(attacker, "fund", [
    a.id,
    seller,
    1n,
    a.deadline,
    86400n,
    a.terms,
  ]);
  await call(seller, "submit", [a.id, output]);
  await reject(attacker, "approve", [a.id]);
  const sb = await balance(seller),
    tb = await balance(treasury);
  await call(buyer, "approve", [a.id]);
  assert.equal((await balance(seller)) - sb, 95000000n);
  assert.equal((await balance(treasury)) - tb, 5000000n);
  await reject(buyer, "approve", [a.id]);
  console.log(
    "PASS atomic 95/5 settlement, funding namespace, roles, approval gate, replay rejection",
  );
  const b = await fund();
  await reject(buyer, "refundExpired", [b.id]);
  await client.request({ method: "evm_increaseTime", params: [86402] });
  await client.request({ method: "evm_mine", params: [] });
  const bb = await balance(buyer);
  await call(buyer, "refundExpired", [b.id]);
  assert.equal((await balance(buyer)) - bb, 100000000n);
  console.log("PASS deadline refund, no platform fee on refund");
  const c = await fund();
  await call(seller, "submit", [c.id, output]);
  await call(buyer, "dispute", [c.id]);
  await reject(buyer, "approve", [c.id]);
  await reject(attacker, "resolve", [c.id, 100000000n]);
  const before = [
    await balance(buyer),
    await balance(seller),
    await balance(treasury),
  ];
  await call(arbiter, "resolve", [c.id, 40000000n]);
  assert.equal((await balance(buyer)) - before[0], 60000000n);
  assert.equal((await balance(seller)) - before[1], 38000000n);
  assert.equal((await balance(treasury)) - before[2], 2000000n);
  console.log(
    "PASS dispute freezes settlement and arbiter split conserves funds",
  );
  const d = await fund();
  await call(seller, "submit", [d.id, output]);
  await call(buyer, "dispute", [d.id]);
  await reject(buyer, "refundUnresolved", [d.id]);
  await client.request({
    method: "evm_increaseTime",
    params: [14 * 86400 + 1],
  });
  await client.request({ method: "evm_mine", params: [] });
  await reject(arbiter, "resolve", [d.id, 100000000n]);
  await call(buyer, "refundUnresolved", [d.id]);
  console.log("PASS arbitration timeout refund and expired arbiter authority");
  const e = await fund();
  await call(seller, "submit", [e.id, output]);
  await reject(seller, "claimAfterReview", [e.id]);
  await client.request({ method: "evm_increaseTime", params: [86402] });
  await client.request({ method: "evm_mine", params: [] });
  await reject(buyer, "dispute", [e.id]);
  await call(seller, "claimAfterReview", [e.id]);
  const f = await fund();
  await call(seller, "sellerRefund", [f.id]);
  assert.equal(await balance(escrow), 0n);
  console.log(
    "PASS review timeout claim, voluntary refund, zero stranded funds",
  );
} finally {
  server.kill("SIGTERM");
}
