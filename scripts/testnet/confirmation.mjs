import { setTimeout as delay } from "node:timers/promises";

// Some RPCs expose provisional receipts before their block hash is canonical.
// Poll the same transaction; never replace or rebroadcast it here.
export async function confirmedReceipt(client, hash, {
  timeoutMs = 120000,
  pollMs = 1500,
  now = Date.now,
  sleep = delay,
} = {}) {
  const deadline = now() + timeoutMs;
  while (now() < deadline) {
    const receipt = await client.getTransactionReceipt({ hash }).catch(() => null);
    if (receipt?.blockHash && !/^0x0+$/.test(receipt.blockHash)) {
      const head = await client.getBlockNumber({ cacheTime: 0 });
      if (head >= receipt.blockNumber + 2n) {
        const block = await client.getBlock({ blockNumber: receipt.blockNumber });
        if (block.hash === receipt.blockHash) {
          if (receipt.status !== "success") throw Error("Transaction reverted");
          return receipt;
        }
      }
    }
    await sleep(pollMs);
  }
  throw Error("Canonical receipt not confirmed; persisted transaction preserved for retry");
}
