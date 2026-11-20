import {
  createPrivateKey,
  createPublicKey,
  createHash,
  randomBytes,
} from "node:crypto";
import http from "node:http";
import { DstackClient } from "@phala/dstack-sdk";
import { Wallet, hexlify, getAddress } from "ethers";
import { boundedBytes } from "../src/cid.js";
import {
  checkMeasuredDeployment,
  runtimeEventDigests,
  verifyIntelQuote,
} from "./hardware-evidence.mjs";
import { checkComposeApproval } from "./compose-approval.mjs";
const hex = (b) => Buffer.from(b).toString("hex");
export const challenge = () => hex(randomBytes(32));
export function binding(nonce, pub, signer) {
  if (!/^[0-9a-f]{64}$/.test(nonce) || !/^0x[0-9a-f]{64}$/.test(pub))
    throw Error("Malformed attestation binding.");
  return createHash("sha512")
    .update(["relay/tee/v1", nonce, pub, getAddress(signer)].join("/"))
    .digest();
}
export function checkPolicy(verified, policy, expected, events) {
  if (verified.status !== "UpToDate" || verified.advisory_ids?.length)
    throw Error("TEE platform status is outside the owner policy.");
  const sgx = verified.report.type === "sgx";
  const report = sgx ? verified.report.asSgx() : verified.report.asTd10();
  if (
    !report ||
    policy.type !== (sgx ? "sgx" : "tdx") ||
    hex(report.reportData) !== hex(expected)
  )
    throw Error("TEE type or recipient binding mismatch.");
  for (const field of sgx
    ? ["mrEnclave", "mrSigner"]
    : ["mrTd", "rtMr0", "rtMr1", "rtMr2", "rtMr3"]) {
    if (
      typeof policy[field] !== "string" ||
      !report[field] ||
      hex(report[field]) !== policy[field]
    )
      throw Error("Unexpected TEE measurement: " + field);
  }
  if (policy.dstack !== undefined) {
    if (sgx) throw Error("A dstack deployment measurement requires Intel TDX.");
    checkMeasuredDeployment(report, events, policy.dstack);
  }
}
export async function verifyRecipientEvidence(url, policy) {
  if (new URL(url).protocol !== "https:")
    throw Error("Attestation endpoint requires HTTPS.");
  const nonce = challenge(),
    r = await fetch(new URL("/attestation/" + nonce, url), {
      redirect: "error",
      signal: AbortSignal.timeout(15000),
    });
  if (!r.ok) throw Error("Attestation service unavailable.");
  const evidence = JSON.parse(
    new TextDecoder().decode(await boundedBytes(r, 192 * 1024)),
  );
  if (
    typeof evidence.quote !== "string" ||
    !/^([0-9a-f]{2}){512,32768}$/i.test(evidence.quote)
  )
    throw Error("Invalid Intel quote.");
  const { verified } = await verifyIntelQuote(
    Buffer.from(evidence.quote, "hex"),
    policy.collateralSources,
  );
  checkPolicy(
    verified,
    policy,
    binding(nonce, evidence.recipient, evidence.signer),
    evidence.rtmr3Events,
  );
  const approval = policy.dstack?.authorization === undefined
    ? undefined
    : await checkComposeApproval(policy.dstack);
  return {
    publicKey: evidence.recipient,
    signer: getAddress(evidence.signer),
    nonce,
    quote: evidence.quote,
    rtmr3Events: evidence.rtmr3Events,
    verifiedAt: new Date().toISOString(),
    approval,
  };
}

export async function verifyRecipient(url, policy) {
  const { publicKey, signer } = await verifyRecipientEvidence(url, policy);
  return { publicKey, signer };
}
async function settlementSigner(client,provider) {
  const key=(await client.getKey("relay/v1/settlement","settlement")).key;
  return new Wallet(hexlify(key),provider);
}
export function enclaveSettlementSigner(provider,socket) {
  if (!socket?.startsWith("/")) throw Error("A local dstack socket is required.");
  return settlementSigner(new DstackClient(socket),provider);
}
export async function enclaveIdentity(
  provider,
  socket = "/var/run/dstack.sock",
) {
  if (!socket.startsWith("/"))
    throw Error("TEE mode requires a local dstack Unix socket.");
  const client = new DstackClient(socket);
  const signer=await settlementSigner(client,provider);
  const seed = (await client.getKey("relay/v1/checkpoint", "checkpoint")).key;
  if (seed.length !== 32) throw Error("Unsupported dstack key length.");
  const der = Buffer.concat([
    Buffer.from("302e020100300506032b656e04220420", "hex"),
    seed,
  ]);
  const priv = createPrivateKey({ key: der, format: "der", type: "pkcs8" });
  const raw = createPublicKey(priv)
    .export({ type: "spki", format: "der" })
    .subarray(-32);
  const keys = { privateKey: hexlify(der), publicKey: hexlify(raw) };
  const server = http
    .createServer(async (req, res) => {
      const m = req.url?.match(/^\/attestation\/([0-9a-f]{64})$/);
      if (req.method !== "GET" || !m) {
        res.writeHead(404).end();
        return;
      }
      try {
        const q = await client.getQuote(
          binding(m[1], keys.publicKey, signer.address),
        );
        res.setHeader("content-type", "application/json");
        res.setHeader("cache-control", "no-store");
        res.end(
          JSON.stringify({
            quote: q.quote,
            ...(q.event_log
              ? { rtmr3Events: runtimeEventDigests(q.event_log) }
              : {}),
            recipient: keys.publicKey,
            signer: signer.address,
          }),
        );
      } catch {
        res.writeHead(503).end();
      }
    })
    .listen(8082, "0.0.0.0");
  return { keys, signer, server };
}
