import { test, expect } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { randomBytes, createHash } from "node:crypto";

// Requires the isolated, seeded E2E database. Three distinct non-admin users
// exercise the real HTTP routes and persisted records; no provider funds move.
test("agent API enforces actors, corrected delivery, approval and terminal states", async ({ request }) => {
  const db = new PrismaClient();
  const suffix = randomBytes(6).toString("hex");
  const keyIds: string[] = [];
  let agentId: string | undefined;
  async function actor(label: string) {
    const user = await db.user.create({ data: { email: `${label}-${suffix}@example.test`, name: `E2E ${label}` } });
    const secret = `bids_${randomBytes(20).toString("hex")}`;
    const key = await db.apiKey.create({ data: { userId: user.id, name: "E2E", prefix: secret.slice(0, 12), hashedKey: createHash("sha256").update(secret).digest("hex") } });
    keyIds.push(key.id);
    return { user, headers: { authorization: `Bearer ${secret}`, "x-forwarded-for": `e2e-${label}-${suffix}` } };
  }
  try {
    const buyer = await actor("buyer"), seller = await actor("seller"), stranger = await actor("stranger");
    const agent = await db.agent.create({ data: { ownerId: seller.user.id, name: "API delivery test", slug: `api-test-${suffix}`, shortDescription: "Isolated lifecycle fixture", longDescription: "Isolated lifecycle fixture for real multi-actor HTTP checks.", category: "Growth" } });
    agentId = agent.id;
    const created = await request.post("/api/tasks", { headers: buyer.headers, data: { seller_agent_id: agent.id, objective: "Return a summary of the supplied research", budget: 12, output_schema: { type: "object", required: ["summary"], properties: { summary: { type: "string" } } } } });
    expect(created.status()).toBe(201);
    const body = await created.json();
    expect(body.payment.real_funds_moved).toBe(false);
    const path = `/api/tasks/${body.task_id}`;
    expect((await request.get(path, { headers: stranger.headers })).status()).toBe(403);
    expect((await request.post(`${path}/accept`, { headers: stranger.headers })).status()).toBe(400);
    const sellerTask = await (await request.get(path, { headers: seller.headers })).json();
    expect(sellerTask.workflow.actions.map((a: { name: string }) => a.name)).toEqual(["accept"]);
    expect((await request.post(`${path}/accept`, { headers: seller.headers })).ok()).toBe(true);
    const invalid = await (await request.post(`${path}/artifacts`, { headers: seller.headers, data: { title: "Invalid report", content: JSON.stringify({ summary: 12 }) } })).json();
    expect(invalid).toMatchObject({ ok: true, valid: false, status: "submitted" });
    expect(invalid.errors.length).toBeGreaterThan(0);
    expect((await request.post(`${path}/complete`, { headers: buyer.headers })).status()).toBe(400);
    // A stale/legacy state label must not bypass actual artifact validation.
    await db.task.update({ where: { id: body.task_id }, data: { status: "validating" } });
    expect((await request.post(`${path}/complete`, { headers: buyer.headers })).status()).toBe(400);
    expect((await db.task.findUniqueOrThrow({ where: { id: body.task_id } })).status).toBe("submitted");
    expect((await db.payment.findUniqueOrThrow({ where: { taskId: body.task_id } })).status).toBe("escrowed");
    const valid = await (await request.post(`${path}/artifacts`, { headers: seller.headers, data: { title: "Corrected report", content: JSON.stringify({ summary: "Evidence collected" }) } })).json();
    expect(valid).toMatchObject({ ok: true, valid: true, skipped: false, status: "validating" });
    expect((await request.post(`${path}/complete`, { headers: seller.headers })).status()).toBe(400);
    const ready = await (await request.get(path, { headers: buyer.headers })).json();
    expect(ready.workflow.actions[0].name).toBe("approve_delivery");
    const approved = await (await request.post(`${path}/complete`, { headers: buyer.headers })).json();
    expect(approved).toMatchObject({ ok: true, status: "completed", payment: { real_funds_moved: false } });
    expect((await request.post(`${path}/validate`, { headers: buyer.headers })).status()).toBe(400);
    expect((await request.post(`${path}/complete`, { headers: buyer.headers })).status()).toBe(400);
    const final = await db.task.findUniqueOrThrow({ where: { id: body.task_id }, include: { payment: true } });
    expect(final.status).toBe("completed");
    expect(final.payment?.status).toBe("released");
    // A task with no deliverable must also recover to a seller-actionable state.
    const empty = await db.task.create({ data: { title: "Missing deliverable", objective: "Return a report", category: "Growth", status: "validating", buyerId: buyer.user.id, sellerAgentId: agent.id } });
    expect((await request.post(`/api/tasks/${empty.id}/complete`, { headers: buyer.headers })).status()).toBe(400);
    expect((await db.task.findUniqueOrThrow({ where: { id: empty.id } })).status).toBe("submitted");
  } finally {
    if (agentId) await db.agent.update({ where: { id: agentId }, data: { status: "paused" } });
    await db.apiKey.updateMany({ where: { id: { in: keyIds } }, data: { revokedAt: new Date() } });
    await db.$disconnect();
  }
});
