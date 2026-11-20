// Gateway paths share a browser origin with other publishers. These are the
// release address forms supported by the IPFS and ar.io wallet builds.
import { CID } from "multiformats/cid";
import { base32 } from "multiformats/bases/base32";
import { base64url } from "multiformats/bases/base64";

function cidLabel(value) {
  try { return CID.parse(value).toV1().toString(base32); } catch { return null; }
}
function arLabel(value) {
  if (!/^[A-Za-z0-9_-]{43}$/.test(value)) return null;
  try {
    const bytes = base64url.decode("u" + value);
    return bytes.length === 32 && base64url.encode(bytes).slice(1) === value
      ? base32.encode(bytes).slice(1) : null;
  } catch { return null; }
}

export function releaseOrigin(location) {
  const url = new URL(location.href);
  const host = url.hostname.toLowerCase();
  const labels = host.split(".");
  const loopback = ["localhost", "127.0.0.1", "[::1]"].includes(host) || host.endsWith(".localhost");
  if (url.username || url.password || (url.protocol !== "https:" && !(url.protocol === "http:" && loopback)))
    return { shared: true };
  let parts;
  try { parts = decodeURIComponent(url.pathname).split("/").filter(Boolean); }
  catch { return { shared: true }; }
  const [namespace, resource] = parts;
  const pathGateway = namespace === "ipfs" || namespace === "ipns";
  if (pathGateway) {
    // Only use a computed host when the whole content identifier validates.
    // Query strings and fragments can contain private data and stay on the old origin.
    const cid = namespace === "ipfs" && cidLabel(resource);
    if (!cid || url.pathname.includes("%")) return { shared: true };
    if (host === "ipfs.filebase.io")
      return { shared: true, snapshotDirectory: url.origin + "/ipfs/" + resource + "/" };
    const gateway = loopback ? "localhost" : ["ipfs","ipns"].includes(labels[1]) ? labels.slice(2).join(".") : host;
    const target = new URL(url.origin);
    const expected = cid + ".ipfs." + gateway;
    target.hostname = expected;
    if (target.hostname !== expected) return { shared: true };
    return { shared: true, switchTo: target.href };
  }
  if (labels[1] === "ipfs" && labels.length > 2) {
    return cidLabel(labels[0]) === labels[0]
      ? { shared: false, immutable: url.origin + "/" } : { shared: true };
  }
  const transaction = arLabel(namespace);
  if (transaction) {
    if (labels[0] === transaction && labels.length > 1)
      return { shared: false, immutable: url.origin + "/" + namespace + "/" };
    const target = new URL(url.origin);
    const gateway = /^[a-z2-7]{52}$/.test(labels[0]) ? labels.slice(1).join(".") : host;
    const expected = transaction + "." + (loopback ? "localhost" : gateway);
    target.hostname = expected;
    if (target.hostname !== expected) return { shared: true };
    target.pathname = "/" + namespace + "/";
    return { shared: true, switchTo: target.href };
  }
  if (/^v[a-z0-9]{50}\.nsite\.lol$/.test(host))
    return { shared: false, immutable: url.origin + "/" };
  if (["ipfs.filebase.io","nsite.lol","ipfs.io","dweb.link","w3s.link","ar-io.dev","arweave.net"].some(domain => host === domain || host.endsWith("." + domain)))
    return { shared: true };
  return { shared: false };
}

export function requireWalletOrigin(location = globalThis.location) {
  if (releaseOrigin(location).shared) throw Error("Open Relay on its own secure origin to use your wallet.");
}
