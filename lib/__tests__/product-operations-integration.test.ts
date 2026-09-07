import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import { createHash, randomUUID } from "node:crypto";
vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
const actor = vi.hoisted(() => ({ id: "", role: "user" }));
vi.mock("@/lib/auth", () => ({
  getCurrentUser: async () => null,
  requireUser: async () => actor,
  requireAdmin: async () => {
    if (actor.role !== "admin") throw new Error("Forbidden");
    return actor;
  },
}));
vi.mock("@/lib/api-auth", () => ({
  getAuthedUser: async () => ({ user: actor, response: null }),
}));
vi.mock("@/lib/ratelimit", () => ({
  strictRateLimit: async () => ({ ok: true }),
}));
import { prisma } from "@/lib/prisma";
import { generateApiKey, resolveApiKeyUser } from "@/lib/api-keys";
import { databaseRateLimit } from "@/lib/database-rate-limit";
import { runOperation } from "@/lib/operation-jobs";
import { PUT, DELETE } from "@/app/api/brief/route";
import { retryOutbox } from "@/lib/actions/operations";
import {
  submitServiceReport,
  resolveServiceReport,
} from "@/lib/actions/support";
const enabled = process.env.BIDS_PRODUCT_TEST === "1";
describe.skipIf(!enabled)("real database product recovery", () => {
  const prefix = `product-${randomUUID()}`;
  let userId = "",
    otherId = "";
  beforeAll(async () => {
    const u = new URL(process.env.DATABASE_URL!);
    if (
      !["127.0.0.1", "localhost"].includes(u.hostname) ||
      u.pathname !== "/bids_design"
    )
      throw new Error("Only isolated local bids_design is permitted");
    userId = (
      await prisma.user.create({
        data: { email: `${prefix}@example.test`, name: "Recovery fixture" },
      })
    ).id;
    otherId = (
      await prisma.user.create({
        data: { email: `${prefix}-other@example.test` },
      })
    ).id;
    actor.id = userId;
  });
  afterAll(async () => {
    await prisma.taskBrief.deleteMany({
      where: { userId: { in: [userId, otherId] } },
    });
    await prisma.serviceReport.deleteMany({ where: { userId } });
    await prisma.operationAudit.deleteMany({ where: { actorId: userId } });
    await prisma.taskOutbox.deleteMany({ where: { taskId: prefix } });
    await prisma.operationRun.deleteMany({ where: { jobId: "verify" } });
    await prisma.operationJob.deleteMany({ where: { id: "verify" } });
    await prisma.user.deleteMany({ where: { id: { in: [userId, otherId] } } });
  });
  it("shares a bounded token bucket across concurrent database callers", async () => {
    const key = `shared:${prefix}`;
    const results = await Promise.all(
      Array.from({ length: 30 }, () => databaseRateLimit(key, 1, 5, 0)),
    );
    expect(results.filter((r) => r.ok)).toHaveLength(5);
    const row = await prisma.rateLimitBucket.findUniqueOrThrow({
      where: { id: createHash("sha256").update(key).digest("hex") },
    });
    expect(row.tokens).toBe(0);
    await prisma.rateLimitBucket.delete({ where: { id: row.id } });
  });
  it("expires and scopes credentials without inheriting admin overrides", async () => {
    const key = generateApiKey();
    await prisma.apiKey.create({
      data: {
        userId,
        name: "worker",
        prefix: key.prefix,
        hashedKey: key.hashedKey,
        scopes: ["tasks:read", "tasks:execute"],
        expiresAt: new Date(Date.now() + 60000),
      },
    });
    expect((await resolveApiKeyUser(key.secret, "tasks:read"))?.id).toBe(
      userId,
    );
    expect(await resolveApiKeyUser(key.secret, "tasks:write")).toBeNull();
    expect(await resolveApiKeyUser(key.secret, "account")).toBeNull();
    await prisma.apiKey.update({
      where: { hashedKey: key.hashedKey },
      data: { expiresAt: new Date(0) },
    });
    expect(await resolveApiKeyUser(key.secret, "tasks:execute")).toBeNull();
  });
  it("allows one concurrent scheduler and recovers an interrupted lease", async () => {
    await prisma.operationRun.deleteMany({ where: { jobId: "verify" } });
    await prisma.operationJob.deleteMany({ where: { id: "verify" } });
    let release!: () => void;
    const gate = new Promise<void>((r) => (release = r));
    let started!: () => void;
    const ready = new Promise<void>((r) => (started = r));
    const first = runOperation("verify", async () => {
      started();
      await gate;
      return Response.json({ ok: true });
    });
    await ready;
    expect(
      (await runOperation("verify", async () => Response.json({}))).status,
    ).toBe(409);
    await prisma.operationJob.update({
      where: { id: "verify" },
      data: { leaseUntil: new Date(0) },
    });
    expect(
      (await runOperation("verify", async () => Response.json({}))).status,
    ).toBe(200);
    release();
    await first;
    const runs = await prisma.operationRun.findMany({
      where: { jobId: "verify" },
    });
    expect(runs.map((r) => r.state).sort()).toEqual([
      "interrupted",
      "succeeded",
    ]);
  });
  it("saves unfinished briefs, fences stale tabs, and forks fresh creation keys", async () => {
    const put = (revision: number, title: string, fork = false) =>
      PUT(
        new Request("https://bids.sh/api/brief", {
          method: "PUT",
          body: JSON.stringify({
            revision,
            values: { title, objective: "" },
            fork,
          }),
        }),
      );
    const first = await (await put(0, "a")).json();
    expect(first.revision).toBe(1);
    expect((await put(0, "stale")).status).toBe(409);
    const second = await (await put(1, "repeat", true)).json();
    expect(second.creationKey).not.toBe(first.creationKey);
    expect(
      (
        await DELETE(
          new Request("https://bids.sh/api/brief", {
            method: "DELETE",
            headers: { "if-match": "1" },
          }),
        )
      ).status,
    ).toBe(409);
    actor.id = otherId;
    expect((await put(0, "other")).status).toBe(200);
    actor.id = userId;
    expect(
      (await prisma.taskBrief.findUnique({ where: { userId } }))?.values,
    ).toEqual({ title: "repeat", objective: "" });
  });
  it("retries only exhausted notifications and records the administrative action", async () => {
    const event = await prisma.taskOutbox.create({
      data: {
        taskId: prefix,
        event: "funded",
        dedupeKey: prefix,
        payload: {},
        attempts: 8,
      },
    });
    const form = new FormData();
    form.set("id", event.id);
    actor.role = "user";
    await expect(retryOutbox(form)).rejects.toThrow("Forbidden");
    actor.role = "admin";
    await retryOutbox(form);
    expect(
      (await prisma.taskOutbox.findUnique({ where: { id: event.id } }))
        ?.attempts,
    ).toBe(0);
    await expect(retryOutbox(form)).rejects.toThrow("no longer eligible");
    expect(
      await prisma.operationAudit.count({
        where: { targetId: event.id, action: "retry_notification" },
      }),
    ).toBe(1);
    actor.role = "user";
  });
  it("keeps support reports private and records a real response transition", async () => {
    const form = new FormData();
    form.set("subject", "Worker stopped responding");
    form.set(
      "detail",
      "The agent did not return a result after accepting the task.",
    );
    form.set("taskId", prefix);
    await expect(submitServiceReport(form)).rejects.toThrow("Task not found");
    form.set("taskId", "");
    await submitServiceReport(form);
    const report = await prisma.serviceReport.findFirstOrThrow({
      where: { userId },
    });
    const response = new FormData();
    response.set("id", report.id);
    response.set("state", "resolved");
    response.set(
      "response",
      "The service was restored and the result is available.",
    );
    await expect(resolveServiceReport(response)).rejects.toThrow("Forbidden");
    actor.role = "admin";
    await resolveServiceReport(response);
    actor.role = "user";
    expect(
      (await prisma.serviceReport.findUnique({ where: { id: report.id } }))
        ?.state,
    ).toBe("resolved");
    expect(
      await prisma.operationAudit.count({ where: { targetId: report.id } }),
    ).toBe(2);
  });
});
