import { id, keccak256 } from "ethers";
import { setTimeout as delay } from "node:timers/promises";
import { boundedBytes } from "../src/cid.js";

// The reviewed digest and the app address come from operator policy. Chain governance can withdraw approval.
export async function checkComposeApproval({
  appId,
  composeHash,
  authorization,
}) {
  const { chainId, rpcs, codeHash } = authorization;
  if (
    !/^[0-9a-f]{40}$/.test(appId) ||
    !/^[0-9a-f]{64}$/.test(composeHash) ||
    !Number.isSafeInteger(chainId) ||
    chainId <= 0 ||
    !/^0x[0-9a-f]{64}$/.test(codeHash) ||
    !Array.isArray(rpcs) ||
    rpcs.length < 1 ||
    rpcs.length > 3
  )
    throw Error("Invalid dstack chain approval policy.");
  const endpoints = rpcs.map((value) => {
    const u = new URL(value);
    const local = ["localhost", "127.0.0.1", "[::1]"].includes(u.hostname);
    if (
      u.username ||
      u.password ||
      u.hash ||
      (u.protocol !== "https:" && !(local && u.protocol === "http:"))
    )
      throw Error("Configure HTTPS or a local chain RPC.");
    return u;
  });
  if (new Set(endpoints.map((u) => u.origin)).size !== endpoints.length)
    throw Error("Chain observers must have distinct origins.");
  const signal = AbortSignal.timeout(12000);
  async function rpc(url, method, params) {
    for (let attempt = 0; ; attempt++) {
      const res = await fetch(url, {
        method: "POST",
        redirect: "error",
        signal,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
      });
      let transient, reason;
      if (res.ok) {
        const reply = JSON.parse(
          new TextDecoder().decode(await boundedBytes(res, 2 * 1024 * 1024)),
        );
        if (reply.jsonrpc !== "2.0" || reply.id !== 1)
          throw Error("Mismatched deployment approval RPC response.");
        if (!reply.error && reply.result != null) return reply.result;
        transient =
          [-32005, -32016].includes(reply.error?.code) ||
          (!reply.error &&
            method === "eth_getBlockByNumber" &&
            reply.result === null);
        reason = reply.error?.code ?? "missing result";
      } else {
        await res.body?.cancel();
        transient = [429, 502, 503, 504].includes(res.status);
        reason = "HTTP " + res.status;
      }
      if (!transient || attempt >= 2)
        throw Error(
          url.hostname + " rejected " + method + " (" + reason + ").",
        );
      await delay(250 * (attempt + 1), undefined, { signal });
    }
  }
  const heads = await Promise.all(
    endpoints.map(async (url) => {
      const [chain, head] = await Promise.all([
        rpc(url, "eth_chainId", []),
        rpc(url, "eth_getBlockByNumber", ["latest", false]),
      ]);
      if (BigInt(chain) !== BigInt(chainId))
        throw Error("Deployment approval chain mismatch.");
      return head;
    }),
  );
  const height = heads
    .map((b) => BigInt(b.number))
    .reduce((a, b) => (a < b ? a : b));
  const number = "0x" + height.toString(16);
  const blockAt = (url) => rpc(url, "eth_getBlockByNumber", [number, false]);
  const blocks = await Promise.all(
    endpoints.map((url, i) =>
      heads[i].number === number ? heads[i] : blockAt(url),
    ),
  );
  const first = blocks[0],
    now = Math.floor(Date.now() / 1000);
  if (
    !/^0x[0-9a-f]{64}$/.test(first.hash) ||
    blocks.some(
      (b) =>
        b.hash !== first.hash ||
        b.number !== number ||
        b.timestamp !== first.timestamp,
    ) ||
    !/^0x[0-9a-f]+$/.test(first.timestamp) ||
    BigInt(first.timestamp) < BigInt(now - 120) ||
    BigInt(first.timestamp) > BigInt(now + 30)
  )
    throw Error("Chain observers could not agree on a recent canonical block.");
  const to = "0x" + appId;
  const data = id("allowedComposeHashes(bytes32)").slice(0, 10) + composeHash;
  async function requireApproval(url, hash) {
    const at = { blockHash: hash, requireCanonical: true };
    const [code, result] = await Promise.all([
      rpc(url, "eth_getCode", [to, at]),
      rpc(url, "eth_call", [{ to, data }, at]),
    ]);
    if (
      code === "0x" ||
      keccak256(code) !== codeHash ||
      result !== "0x" + "0".repeat(63) + "1"
    )
      throw Error("The reviewed contract does not approve this deployment.");
  }
  const observedHeads = await Promise.all(
    endpoints.map(async (url) => {
      await requireApproval(url, first.hash);
      // A slower observer must not hide a withdrawal already visible to a faster one.
      const latest = await rpc(url, "eth_getBlockByNumber", ["latest", false]);
      if (
        !/^0x[0-9a-f]{64}$/.test(latest.hash) ||
        BigInt(latest.number) < height ||
        (BigInt(latest.number) === height && latest.hash !== first.hash)
      )
        throw Error("Deployment approval block changed.");
      if (latest.hash !== first.hash) await requireApproval(url, latest.hash);
      if ((await blockAt(url)).hash !== first.hash)
        throw Error("Deployment approval block changed.");
      return { block: latest.number, hash: latest.hash };
    }),
  );
  return {
    chainId,
    block: number,
    blockHash: first.hash,
    contract: to,
    codeHash,
    observers: endpoints.length,
    observedHeads,
  };
}
