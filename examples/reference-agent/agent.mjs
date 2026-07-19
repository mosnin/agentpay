#!/usr/bin/env node
// Bids reference agent — zero-dependency Node 20 script that proves the
// seller-agent developer loop end-to-end against the real Bids task API.
//
// Run:
//   export BIDS_API_KEY=bids_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx  # from /settings/api-keys
//   export BIDS_BASE_URL=http://localhost:3000   # optional — this is the default
//   node examples/reference-agent/agent.mjs        # optional: BIDS_AGENT_ID=agt_xxx to scope to one agent
//
// See ./README.md for the full endpoint sequence and a signature-verification snippet.

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const BASE_URL = (process.env.BIDS_BASE_URL || "http://localhost:3000").replace(/\/+$/, "");
const API_KEY = process.env.BIDS_API_KEY;
const AGENT_ID = process.env.BIDS_AGENT_ID || null;

if (!API_KEY) {
  console.error(
    "[agent] Missing BIDS_API_KEY. Create one at /settings/api-keys, then:\n" +
      "  export BIDS_API_KEY=bids_...",
  );
  process.exit(1);
}

const MIN_DELAY_MS = 10_000;
const MAX_DELAY_MS = 60_000;
const REQUEST_TIMEOUT_MS = 15_000;

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

let stopping = false;
function requestStop(signal) {
  if (stopping) {
    log(`Second ${signal} — exiting immediately.`);
    process.exit(1);
  }
  stopping = true;
  log(`Received ${signal} — finishing the current task, then exiting…`);
}
process.on("SIGINT", () => requestStop("SIGINT"));
process.on("SIGTERM", () => requestStop("SIGTERM"));

function log(message) {
  console.log(`[${new Date().toISOString()}] ${message}`);
}

/** Sleep for `ms`, waking early (without throwing) if a stop was requested. */
function sleep(ms) {
  return new Promise((resolve) => {
    const start = Date.now();
    const iv = setInterval(() => {
      if (stopping || Date.now() - start >= ms) {
        clearInterval(iv);
        resolve();
      }
    }, 250);
  });
}

/**
 * Bearer-authenticated JSON request against the Bids API. Never throws —
 * network errors and timeouts come back as { ok: false, status: 0 }. A 401
 * means the key is missing, malformed, or revoked; that can't be fixed by
 * retrying, so it ends the process instead of looping forever.
 */
async function api(method, path, body) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
    let data = null;
    try {
      data = await res.json();
    } catch {
      // No/invalid JSON body — leave data as null.
    }
    if (res.status === 401) {
      console.error(
        `[agent] 401 Unauthorized on ${method} ${path} — BIDS_API_KEY is missing, malformed, or ` +
          "revoked. Issue a fresh key at /settings/api-keys.",
      );
      process.exit(1);
    }
    return { ok: res.ok, status: res.status, data };
  } catch (err) {
    const reason =
      err.name === "AbortError" ? `timed out after ${REQUEST_TIMEOUT_MS / 1000}s` : err.message;
    log(`  request failed: ${method} ${path} — ${reason}`);
    return { ok: false, status: 0, data: null };
  } finally {
    clearTimeout(timer);
  }
}

// ---------------------------------------------------------------------------
// Artifact fabrication — tiny, deterministic, schema-aware when possible.
// ---------------------------------------------------------------------------

/** Small string hash for deterministic (not random) placeholder values. */
function hash(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (Math.imul(h, 31) + str.charCodeAt(i)) >>> 0;
  return h;
}

function fabricateValue(name, type) {
  if (type === "number" || type === "integer") return (hash(name) % 89) + 10;
  return `sample-${name}`; // string, boolean, array, object, or unknown type
}

/**
 * Walk an output schema and fabricate the minimum artifact that satisfies it.
 * Handles the two shapes seen in this codebase: proper JSON Schema
 * ({ properties, required }, as used by agent input/output schemas) and the
 * flat "field: typename" map shown in the create-task docs. Only string/
 * number props get typed values — anything else gets a labeled placeholder.
 * Falls back to a generic stub when no schema (or an empty one) is available.
 */
function fabricateArtifact(schema) {
  if (!schema || typeof schema !== "object" || Array.isArray(schema)) {
    return { result: "ok", note: "No output schema available — generic deliverable." };
  }
  const properties =
    schema.properties && typeof schema.properties === "object" ? schema.properties : null;
  const fields = properties
    ? Array.isArray(schema.required) && schema.required.length > 0
      ? schema.required
      : Object.keys(properties)
    : Object.keys(schema);

  if (fields.length === 0) {
    return { result: "ok", note: "Empty output schema — generic deliverable." };
  }
  const out = {};
  for (const name of fields) {
    const type = properties ? properties[name]?.type : schema[name];
    out[name] = fabricateValue(name, type);
  }
  return out;
}

/**
 * Find the best available output schema for a task. The task-specific one
 * (contract.outputSchema) is authoritative, and GET /api/tasks/{id} is
 * readable by the seller agent's owner — i.e. this key — as well as the
 * buyer. Still fall back to the agent's own advertised output_schema (a
 * public read) and finally to no schema at all, for tasks whose contract
 * doesn't carry one (or a key that doesn't own the assigned agent).
 */
async function findSchemaForTask(task) {
  const detail = await api("GET", `/api/tasks/${task.id}`);
  if (detail.ok && detail.data?.contract?.outputSchema) {
    log(`  using the task's contract output schema`);
    return detail.data.contract.outputSchema;
  }
  if (detail.status === 403) {
    log(
      `  task detail isn't visible with this key (403); trying the agent's listed schema`,
    );
  }

  const agentId = task.seller_agent?.id ?? AGENT_ID;
  if (agentId) {
    const card = await api("GET", `/api/agents/${agentId}`);
    const schema = card.data?.output_schema;
    if (card.ok && schema && Object.keys(schema).length > 0) {
      log(`  using agent ${agentId}'s listed output schema`);
      return schema;
    }
  }

  log(`  no output schema available — generating a generic deliverable`);
  return null;
}

// ---------------------------------------------------------------------------
// Task lifecycle
// ---------------------------------------------------------------------------

async function processTask(task) {
  log(`Task ${task.id} "${task.title}" — pending, budget ${task.budget} ${task.currency}`);

  const accept = await api("POST", `/api/tasks/${task.id}/accept`);
  if (!accept.ok) {
    log(`  accept failed (${accept.status}): ${accept.data?.error ?? "unknown error"} — skipping`);
    return;
  }
  log(`  accepted`);

  const schema = await findSchemaForTask(task);
  const artifact = fabricateArtifact(schema);
  const submit = await api("POST", `/api/tasks/${task.id}/artifacts`, {
    title: `Deliverable — ${task.title}`.slice(0, 180),
    type: "json",
    content: JSON.stringify(artifact, null, 2),
  });
  if (!submit.ok) {
    log(`  artifact submission failed (${submit.status}): ${submit.data?.error ?? "unknown error"}`);
    return;
  }
  log(`  artifact submitted`);

  const validate = await api("POST", `/api/tasks/${task.id}/validate`);
  if (!validate.ok) {
    log(
      `  validate failed (${validate.status}): ${validate.data?.error ?? "unknown error"} — artifact stays submitted`,
    );
    return;
  }
  log(`  validated — score ${validate.data.score}/100 (${validate.data.status})`);

  const complete = await api("POST", `/api/tasks/${task.id}/complete`);
  if (!complete.ok) {
    const message = complete.data?.error ?? "";
    if (complete.status === 403 || /buyer|approval/i.test(message)) {
      log(`  awaiting buyer approval — task ${task.id} stays submitted until the buyer completes it`);
    } else {
      log(`  complete failed (${complete.status}): ${message || "unknown error"}`);
    }
    return;
  }
  log(`  completed — payment released for task ${task.id}`);
}

// ---------------------------------------------------------------------------
// Poll loop
// ---------------------------------------------------------------------------

async function pollOnce() {
  const res = await api("GET", "/api/tasks");
  if (!res.ok) {
    log(`  failed to list tasks (${res.status}): ${res.data?.error ?? "unknown error"}`);
    return false;
  }

  const tasks = Array.isArray(res.data) ? res.data : [];
  // role === "seller" covers the normal case (someone else commissioned your
  // agent). A task you commissioned from your *own* agent — the usual way to
  // test one — reports role "buyer", so also take any pending task assigned
  // to the agent this script is scoped to.
  const mine = tasks
    .filter((t) => t.status === "pending")
    .filter(
      (t) =>
        (AGENT_ID && t.seller_agent?.id === AGENT_ID) ||
        (!AGENT_ID && t.role === "seller"),
    )
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

  if (mine.length === 0) {
    log(`No pending tasks for ${AGENT_ID ? `agent ${AGENT_ID}` : "your agents"} right now.`);
    return false;
  }

  for (const task of mine) {
    if (stopping) break;
    await processTask(task);
  }
  return true;
}

async function main() {
  log(
    `Reference agent starting — base=${BASE_URL} key=${API_KEY.slice(0, 12)}… agent=${AGENT_ID ?? "(any owned)"}`,
  );

  // emptyStreak counts consecutive polls that found nothing to do. Delay is
  // derived from it (rather than doubled in place) so the very first empty
  // poll waits MIN_DELAY_MS, not MIN_DELAY_MS * 2 — the streak resets to 0
  // the moment a task is found, so throughput recovers immediately.
  let emptyStreak = 0;
  while (!stopping) {
    let didWork = false;
    try {
      didWork = await pollOnce();
    } catch (err) {
      log(`  poll failed: ${err.message}`);
    }
    if (stopping) break;

    emptyStreak = didWork ? 0 : emptyStreak + 1;
    const delay = Math.min(MIN_DELAY_MS * 2 ** Math.max(emptyStreak - 1, 0), MAX_DELAY_MS);
    log(`Sleeping ${Math.round(delay / 1000)}s before the next poll…`);
    await sleep(delay);
  }

  log("Stopped.");
  process.exit(0);
}

main().catch((err) => {
  console.error(`[agent] Fatal: ${err.stack || err.message}`);
  process.exit(1);
});
