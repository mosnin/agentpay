import { createHash } from "node:crypto";
import {
  getCollateral,
  verify,
  PHALA_PCCS_URL,
  INTEL_PCS_URL,
} from "@phala/dcap-qvl";

// Certificates and revocation lists are transportable. The library always verifies them at the current time against Intel's root.
export async function verifyIntelQuote(
  quote,
  sources = [PHALA_PCCS_URL, INTEL_PCS_URL],
) {
  if (!Array.isArray(sources) || !sources.length || sources.length > 3)
    throw Error("Supply one to three collateral services.");
  const urls = sources.map((source) => {
    const url = new URL(source);
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      url.search ||
      url.hash
    )
      throw Error("A collateral service needs a configured HTTPS URL.");
    return url.href.replace(/\/$/, "");
  });
  if (new Set(urls).size !== urls.length)
    throw Error("Duplicate collateral service.");
  const deadline = AbortSignal.timeout(30000);
  const failures = [];
  for (const source of urls) {
    let collateral;
    try {
      collateral = await getCollateral(source, quote, {
        signal: deadline,
        timeoutMs: urls.length === 1 ? 30000 : 10000,
      });
    } catch (err) {
      failures.push(err);
      if (deadline.aborted) break;
      continue;
    }
    // A failed signature, expiry or revocation check is terminal for this challenge.
    const verified = verify(quote, collateral, Math.floor(Date.now() / 1000));
    return { verified, source };
  }
  throw new AggregateError(
    failures,
    "Current Intel verification collateral is unavailable.",
  );
}

const measurement = /^[0-9a-f]{96}$/;
export function runtimeEventDigests(eventLog) {
  const events = JSON.parse(eventLog);
  if (!Array.isArray(events)) throw Error("Invalid dstack event log.");
  const digests = events.filter((e) => e.imr === 3).map((e) => e.digest);
  if (
    digests.length > 1024 ||
    digests.some((d) => typeof d !== "string" || !measurement.test(d))
  )
    throw Error("Invalid dstack runtime measurements.");
  return digests;
}

// dstack's two published boot event encodings use the same Intel extension register.
function eventDigests(name, payload = "") {
  const v1 = createHash("sha384")
    .update(Buffer.from("010000083a", "hex"))
    .update(name)
    .update(":")
    .update(Buffer.from(payload, "hex"))
    .digest("hex");
  const v2 = createHash("sha384")
    .update(JSON.stringify({ name, payload, type: 0x08000001 }))
    .digest("hex");
  return [v1, v2];
}

export function checkMeasuredDeployment(report, digests, deployment) {
  if (
    !deployment ||
    !/^[0-9a-f]{40}$/.test(deployment.appId) ||
    !/^[0-9a-f]{64}$/.test(deployment.composeHash) ||
    !Array.isArray(digests) ||
    digests.length > 1024 ||
    digests.some((d) => typeof d !== "string" || !measurement.test(d))
  )
    throw Error("Invalid dstack deployment evidence.");
  let register = Buffer.alloc(48);
  for (const digest of digests)
    register = createHash("sha384")
      .update(register)
      .update(Buffer.from(digest, "hex"))
      .digest();
  if (!register.equals(Buffer.from(report.rtMr3)))
    throw Error("Runtime event list does not match the signed TDX report.");
  const markers = eventDigests("boot-mr-done");
  const end = digests.findIndex((d) => markers.includes(d));
  if (end <= 0 || !eventDigests("system-preparing").includes(digests[0]))
    throw Error("Missing measured dstack boot boundaries.");
  const boot = digests.slice(1, end);
  for (const [name, expected] of [
    ["app-id", deployment.appId],
    ["compose-hash", deployment.composeHash],
  ]) {
    const encodings = eventDigests(name, expected);
    if (boot.filter((d) => encodings.includes(d)).length !== 1)
      throw Error(
        "Reviewed deployment differs from the measured " + name + ".",
      );
  }
}
