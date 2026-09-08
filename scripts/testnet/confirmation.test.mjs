import test from "node:test";
import assert from "node:assert/strict";
import { confirmedReceipt } from "./confirmation.mjs";

function fixture(receipts, heads = [12n]) {
  let time = 0, reads = 0;
  const client = {
    getTransactionReceipt: async () => receipts[Math.min(reads++, receipts.length - 1)],
    getBlockNumber: async () => heads[Math.min(reads - 1, heads.length - 1)],
    getBlock: async () => ({ hash: "0xabc" }),
  };
  return { client, options: { now: () => time, sleep: async () => { time += 1; }, timeoutMs: 5, pollMs: 1 }, reads: () => reads };
}
const canonical = { blockHash: "0xabc", blockNumber: 10n, status: "success" };

test("waits through absent, provisional and reorganized receipts for three confirmations", async () => {
  const f = fixture([null, { ...canonical, blockHash: "0x0000" }, { ...canonical, blockHash: "0xdef" }, canonical]);
  assert.deepEqual(await confirmedReceipt(f.client, "0xtx", f.options), canonical);
  assert.equal(f.reads(), 4);
});
test("waits for confirmation depth even for a canonical block", async () => {
  const f = fixture([canonical], [10n, 11n, 12n]);
  assert.deepEqual(await confirmedReceipt(f.client, "0xtx", f.options), canonical);
  assert.equal(f.reads(), 3);
});
test("never accepts permanently provisional receipts", async () => {
  const f = fixture([{ ...canonical, blockHash: "0x0000" }]);
  await assert.rejects(confirmedReceipt(f.client, "0xtx", f.options), /preserved for retry/);
});
test("rejects a confirmed reverted transaction", async () => {
  const f = fixture([{ ...canonical, status: "reverted" }]);
  await assert.rejects(confirmedReceipt(f.client, "0xtx", f.options), /reverted/);
});
