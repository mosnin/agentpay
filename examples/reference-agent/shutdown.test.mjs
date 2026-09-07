import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { setTimeout as delay } from "node:timers/promises";

async function until(check) {
  const end = Date.now() + 4000;
  while (!check()) {
    assert.ok(Date.now() < end, "Expected worker transition did not occur");
    await delay(10);
  }
}

async function fixture(t, tasks) {
  const calls = [];
  let child;
  const dir = await mkdtemp(join(tmpdir(), "bids-worker-shutdown-"));
  const handler = join(dir, "handler.mjs");
  await writeFile(handler, `export async function execute() {
    console.log("handler-started");
    await new Promise(resolve => setTimeout(resolve, 350));
    return {record_count: 3};
  }`);
  const server = createServer(async (req, res) => {
    let raw = "";
    for await (const chunk of req) raw += chunk;
    const body = raw ? JSON.parse(raw) : undefined;
    calls.push({path: req.url, body, headers: req.headers});
    let result = {};
    if (req.url.startsWith("/api/tasks?")) result = tasks;
    if (req.url.endsWith("/claim")) result = {token: "exclusive-lease", task: {id: "first"}};
    if (req.url.endsWith("/artifacts")) result = {status: "validating", valid: true};
    res.writeHead(200, {"content-type": "application/json"});
    res.end(JSON.stringify(result));
  });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  t.after(async () => {
    if (child && child.exitCode === null) child.kill("SIGKILL");
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
    await rm(dir, {recursive: true, force: true});
  });
  child = spawn(process.execPath, ["examples/reference-agent/agent.mjs"], {
    env: {...process.env, BIDS_BASE_URL: `http://127.0.0.1:${server.address().port}`,
      BIDS_API_KEY: "isolated-test-key", BIDS_AGENT_ID: "seller", BIDS_HANDLER_PATH: handler,
      BIDS_RUN_ONCE: "false", BIDS_WALLET_SIGNER_PATH: ""},
    stdio: ["ignore", "pipe", "pipe"],
  });
  let output = "";
  child.stdout.on("data", chunk => { output += chunk; });
  child.stderr.on("data", chunk => { output += chunk; });
  const exited = new Promise(resolve => child.on("exit", (code, signal) => resolve({code, signal})));
  return {calls, child, exited, output: () => output};
}

test("SIGTERM wakes idle polling and reports zero capacity before exit", {timeout: 8000}, async t => {
  const f = await fixture(t, []);
  await until(() => f.calls.some(call => call.path.startsWith("/api/tasks?")));
  await delay(100); // Let the completed HTTP response enter the polling delay.
  f.child.kill("SIGTERM");
  const result = await Promise.race([f.exited, delay(2000).then(() => "timeout")]);
  assert.deepEqual(result, {code: 0, signal: null});
  assert.equal(f.calls.at(-1).body.capacity, 0);
});

test("SIGTERM drains a claimed delivery and does not accept the next task", {timeout: 8000}, async t => {
  const f = await fixture(t, ["first", "second"].map(id => ({id, title: id, status: "pending", seller_agent: {id: "seller"}})));
  await until(() => f.output().includes("handler-started"));
  f.child.kill("SIGTERM");
  const result = await Promise.race([f.exited, delay(2000).then(() => "timeout")]);
  assert.deepEqual(result, {code: 0, signal: null});
  const artifacts = f.calls.filter(call => call.path.endsWith("/artifacts"));
  assert.equal(artifacts.length, 1);
  assert.equal(artifacts[0].path, "/api/tasks/first/artifacts");
  assert.equal(artifacts[0].headers["x-bids-lease-token"], "exclusive-lease");
  assert.equal(JSON.parse(artifacts[0].body.content).record_count, 3);
  assert.ok(!f.calls.some(call => call.path.includes("/second/")));
  assert.equal(f.calls.at(-1).body.capacity, 0);
});
