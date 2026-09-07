import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

test("testnet keys persist privately; public addresses contain no signing secrets", async () => {
  const directory = fs.mkdtempSync(
    path.join(os.tmpdir(), "bids-testnet-state-"),
  );
  const prior = process.env.BIDS_TESTNET_STATE_DIR;
  process.env.BIDS_TESTNET_STATE_DIR = directory;
  try {
    const state = await import("./state.mjs");
    const first = state.wallets(),
      second = state.wallets();
    assert.deepEqual(first, second);
    assert.equal(first.chainId, 84532);
    assert.equal(
      new Set(Object.values(first.roles).map((r) => r.address)).size,
      5,
    );
    assert.equal(fs.statSync(state.walletFile).mode & 0o777, 0o600);
    const publicJson = JSON.stringify(state.publicWallets());
    assert(!publicJson.includes("privateKey"));
    for (const role of Object.values(first.roles))
      assert(!publicJson.includes(role.privateKey));
    fs.chmodSync(state.walletFile, 0o644);
    assert.throws(() => state.wallets(), /0600/);
    fs.chmodSync(state.walletFile, 0o600);
    fs.writeFileSync(
      state.walletFile,
      JSON.stringify({ ...first, chainId: 8453 }),
    );
    assert.throws(() => state.wallets(), /non-testnet/);
  } finally {
    fs.rmSync(directory, { recursive: true });
    if (prior === undefined) delete process.env.BIDS_TESTNET_STATE_DIR;
    else process.env.BIDS_TESTNET_STATE_DIR = prior;
  }
});
