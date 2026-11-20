import { CID } from "multiformats/cid";
import { create } from "multiformats/hashes/digest";
import { getBytes, hexlify, sha256 } from "ethers";
export const rawCID = (root) =>
  CID.createV1(0x55, create(0x12, getBytes(root))).toString();
export function rawBlockDigest(value) {
  const cid = CID.parse(value.trim());
  if (cid.version !== 1 || cid.code !== 0x55 || cid.multihash.code !== 0x12 || cid.multihash.size !== 32)
    throw Error("Enter a raw SHA256 chat CID.");
  return hexlify(cid.multihash.digest);
}
export const contextFor = (chain, registry, id, sequence) =>
  ["relay/v1", chain, registry.toLowerCase(), id, sequence].join("/");
export async function boundedBytes(response, max = 65536) {
  if (Number(response.headers.get("content-length") ?? 0) > max)
    throw Error("Published block exceeds the size limit.");
  const reader = response.body.getReader(),
    parts = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > max) {
        await reader.cancel();
        throw Error("Published block exceeds the size limit.");
      }
      parts.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const out = new Uint8Array(size);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}
export async function readBlock(gateway, root, max = 65536) {
  const res = await fetch(
    gateway.replace(/\/$/, "") + "/ipfs/" + rawCID(root),
    { signal: AbortSignal.timeout(10000) },
  );
  if (!res.ok)
    throw Error("Checkpoint unavailable from the configured gateway.");
  const bytes = await boundedBytes(res, max);
  if (sha256(bytes) !== root)
    throw Error("Checkpoint integrity check failed.");
  return bytes;
}
// Keep the last gateway that actually returned bytes matching the requested CID.
// The next chunk of a large directory can use it immediately after a failover.
const workingGateways = new WeakMap();
export async function readReplicatedBlock(network, root, max = 65536) {
  const configured = [...new Set([network.gateway,...(network.gatewayBackups ?? [])].filter(Boolean))];
  const previous = workingGateways.get(network);
  const order = configured.includes(previous) ? [previous,...configured.filter(url => url !== previous)] : configured;
  let last;
  for (const url of order) {
    try {
      const bytes = await readBlock(url,root,max);
      workingGateways.set(network,url);
      return bytes;
    } catch (error) { last = error; }
  }
  throw last ?? Error("No IPFS gateway is configured for this network.");
}
export const privateContext = (chain, registry, owner, worker) =>
  [
    "relay/private/v1",
    chain,
    registry.toLowerCase(),
    owner.toLowerCase(),
    worker.toLowerCase(),
  ].join("/");
export async function readArchive(transaction, root) {
  if (!/^[a-zA-Z0-9_-]{43}$/.test(transaction))
    throw Error("Invalid Arweave transaction reference.");
  const r = await fetch("https://arweave.net/" + transaction, {
    signal: AbortSignal.timeout(10000),
  });
  if (!r.ok) throw Error("Archive is unavailable.");
  const bytes = await boundedBytes(r);
  if (bytes.length > 65536 || sha256(bytes) !== root)
    throw Error("Archive integrity mismatch.");
  return bytes;
}
export async function profileBlock(network, passport, owner, root) {
  try {
    return await readReplicatedBlock(network, root);
  } catch (err) {
    const tx = await passport.archives(owner);
    if (!tx) throw err;
    return readArchive(tx, root);
  }
}
