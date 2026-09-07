import { test, expect } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { createHash, randomBytes } from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
const run = promisify(execFile);
test("a real worker profiles buyer data and waits for buyer approval", async ({ request, baseURL }) => {
  const db = new PrismaClient(); const suffix = randomBytes(6).toString("hex");
  let agentId: string | undefined; let keyId: string | undefined;
  try {
    const seller = await db.user.create({ data: { email: `worker-${suffix}@example.test`, name: "Worker operator" } });
    const secret = `bids_${randomBytes(20).toString("hex")}`;
    const key = await db.apiKey.create({ data: { userId: seller.id, name: "Worker execution test", prefix: secret.slice(0, 12), hashedKey: createHash("sha256").update(secret).digest("hex") } }); keyId = key.id;
    const agent = await db.agent.create({ data: { ownerId: seller.id, name: "Data quality service", slug: `data-quality-${suffix}`, category: "Growth", shortDescription: "Profiles actual supplied records", longDescription: "Computes record counts, duplicates and missing field counts from buyer input." } }); agentId = agent.id;
    const body = { seller_agent_id: agent.id, objective: "Profile these records and report duplicates and missing values", budget: 12, input_payload: { records: [{ id: 1, email: "one@example.test" }, { id: 1, email: "one@example.test" }, { id: 2, email: null }] }, output_schema: { type: "object", required: ["record_count", "duplicate_count", "fields"], properties: { record_count: { type: "integer" }, duplicate_count: { type: "integer" }, fields: { type: "array" } } } };
    const headers = { "idempotency-key": `create-${suffix}` };
    const created = await (await request.post("/api/tasks", { headers, data: body })).json();
    const repeated = await (await request.post("/api/tasks", { headers, data: body })).json();
    expect(repeated.task_id).toBe(created.task_id);
    const changed = await request.post("/api/tasks", { headers, data: { ...body, budget: 13 } }); expect(changed.status()).toBe(400);
    await run(process.execPath, ["examples/reference-agent/agent.mjs"], { cwd: process.cwd(), timeout: 20000, env: { ...process.env, BIDS_API_KEY: secret, BIDS_AGENT_ID: agent.id, BIDS_BASE_URL: baseURL!, BIDS_HANDLER_PATH: "examples/reference-agent/data-quality.mjs", BIDS_RUN_ONCE: "true" } });
    const task = await db.task.findUniqueOrThrow({ where: { id: created.task_id }, include: { artifacts: true, payment: true } });
    expect(task.status).toBe("validating"); expect(task.artifacts).toHaveLength(1);
    const report = JSON.parse(task.artifacts[0].content!);
    expect(report.record_count).toBe(3); expect(report.duplicate_count).toBe(1);
    expect(report.fields.find((f: { name: string }) => f.name === "email").missing_count).toBe(1);
    expect(task.payment?.status).toBe("escrowed");
    // Retrying the same artifact uses the saved outcome, including after lease release.
    const content = task.artifacts[0].content!;
    const replay = await request.post(`/api/tasks/${task.id}/artifacts`, { headers: { authorization: `Bearer ${secret}`, "idempotency-key": createHash("sha256").update(task.id + content).digest("hex") }, data: { title: task.artifacts[0].title, content } });
    expect(replay.ok()).toBe(true); expect(await db.artifact.count({ where: { taskId: task.id } })).toBe(1);
    const conflictingReplay = await request.post(`/api/tasks/${task.id}/artifacts`, { headers: { authorization: `Bearer ${secret}`, "idempotency-key": createHash("sha256").update(task.id + content).digest("hex") }, data: { title: task.artifacts[0].title, content, url: "https://example.com/changed-delivery" } });
    expect(conflictingReplay.status()).toBe(400);
    expect((await request.post(`/api/tasks/${task.id}/complete`, { headers: { authorization: `Bearer ${secret}` } })).status()).toBe(400);
    const completed = await request.post(`/api/tasks/${task.id}/complete`); expect(completed.ok()).toBe(true);
  } finally {
    if (agentId) await db.agent.update({ where: { id: agentId }, data: { status: "paused" } });
    if (keyId) await db.apiKey.update({ where: { id: keyId }, data: { revokedAt: new Date() } });
    await db.$disconnect();
  }
});
