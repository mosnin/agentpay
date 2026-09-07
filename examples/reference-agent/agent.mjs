#!/usr/bin/env node
// Real worker runner. The handler receives the buyer's task and must execute
// its advertised service. No fabricated output or automatic buyer approval.
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { createHash } from "node:crypto";
const base = (process.env.BIDS_BASE_URL || "http://localhost:3000").replace(
  /\/+$/,
  "",
);
const key = process.env.BIDS_API_KEY;
const agentId = process.env.BIDS_AGENT_ID;
const handlerPath = process.env.BIDS_HANDLER_PATH;
if (!key || !agentId || !handlerPath)
  throw new Error(
    "Set BIDS_API_KEY, BIDS_AGENT_ID and BIDS_HANDLER_PATH to your real service module.",
  );
const { execute } = await import(pathToFileURL(resolve(handlerPath)).href);
if (typeof execute !== "function")
  throw new Error("Handler must export async execute(task, { signal }).");
let stopping = false;
process.on("SIGINT", () => {
  stopping = true;
});
process.on("SIGTERM", () => {
  stopping = true;
});
async function api(path, method = "GET", body, extra = {}) {
  const response = await fetch(base + path, {
    method,
    headers: {
      authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      ...extra,
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(15000),
  });
  const data = await response.json();
  if (!response.ok)
    throw new Error(`${response.status}: ${data.error || "Request failed"}`);
  return data;
}
async function processTask(row) {
  const path = `/api/tasks/${row.id}`;
  if (row.status === "validating") {
    if (process.env.BIDS_WALLET_SIGNER_PATH) {
      const { commitDelivery } = await import(
        pathToFileURL(resolve(process.env.BIDS_WALLET_SIGNER_PATH)).href
      );
      await commitDelivery({ task: row, api });
    }
    return;
  }
  if (row.status === "pending") await api(path + "/accept", "POST");
  const claim = await api(path + "/claim", "POST");
  const signal = AbortSignal.timeout(60000);
  const output = await Promise.race([
    execute(claim.task, { signal }),
    new Promise((_, reject) =>
      signal.addEventListener(
        "abort",
        () =>
          reject(new Error("Handler exceeded its 60 second execution window")),
        { once: true },
      ),
    ),
  ]);
  if (output === undefined) throw new Error("Handler returned no deliverable.");
  const content = JSON.stringify(output);
  const submissionKey = createHash("sha256")
    .update(row.id + content)
    .digest("hex");
  const payload = {
    title: `Delivery: ${row.title}`.slice(0, 180),
    type: "json",
    content,
  };
  let result;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      result = await api(path + "/artifacts", "POST", payload, {
        "x-bids-lease-token": claim.token,
        "idempotency-key": submissionKey,
      });
      break;
    } catch (error) {
      if (/^4\d\d:/.test(error.message) || attempt === 2) throw error;
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
  console.log(
    JSON.stringify({
      taskId: row.id,
      status: result.status,
      valid: result.valid,
      errors: result.errors,
    }),
  );
}
// Read a bounded batch and rotate through history before repeating. Filtering
// seller work avoids burying assignments under this operator's buyer history.
let pollPage = 1;
do {
  const tasks = await api(`/api/tasks?status=active&role=seller&limit=100&page=${pollPage}`);
  pollPage = tasks.length === 100 && pollPage < 10000 ? pollPage + 1 : 1;
  for (const task of tasks.filter(
    (t) =>
      t.seller_agent?.id === agentId &&
      [
        "pending",
        "accepted",
        "running",
        ...(process.env.BIDS_WALLET_SIGNER_PATH ? ["validating"] : []),
      ].includes(t.status),
  )) {
    if (stopping) break;
    try {
      await processTask(task);
    } catch (error) {
      console.error(`Task ${task.id}: ${error.message}`);
    }
  }
  if (process.env.BIDS_RUN_ONCE === "true" || stopping) break;
  await new Promise((r) => setTimeout(r, 10000));
} while (!stopping);
