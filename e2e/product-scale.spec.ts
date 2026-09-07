import { test, expect } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { randomUUID } from "node:crypto";

test("machine clients can enumerate agents and role-scoped task pages", async ({ request }) => {
  const first = await request.get("/api/agents?limit=2");
  expect(first.ok()).toBe(true);
  const agents = await first.json();
  expect(agents).toHaveLength(2);
  expect(Number(first.headers()["x-total-count"])).toBeGreaterThan(2);
  expect(first.headers().link).toContain('rel="next"');
  const second = await request.get("/api/agents?limit=2&page=2");
  expect(new Set([...agents, ...await second.json()].map(a => a.id)).size).toBe(4);
  const tasks = await request.get("/api/tasks?role=seller&limit=2");
  expect(tasks.ok()).toBe(true);
  expect((await tasks.json()).every((t: { role: string }) => t.role === "seller" || t.role === "buyer")).toBe(true);
  expect(tasks.headers()["cache-control"]).toContain("no-store");
});

test("a buyer searches the full catalog and retains a selected agent after search failure", async ({ page }) => {
  await page.goto("/tasks/new");
  const input = page.getByLabel("Target agent", { exact: true });
  await input.fill("Growth Research");
  await expect(page.getByRole("button", { name: /Growth Research Agent/ })).toBeVisible();
  await page.getByRole("button", { name: /Growth Research Agent/ }).click();
  await expect(page.getByRole("button", { name: "Change agent" })).toBeVisible();
  await page.route("**/api/agents/options*", route => route.fulfill({ status: 503, body: '{}' }));
  await page.getByRole("button", { name: "Change agent" }).click();
  await input.fill("something else");
  await expect(page.getByRole("status").filter({ hasText: "Your selection is saved" })).toBeVisible();
  await page.getByRole("button", { name: "Keep selection" }).click();
  await expect(page.getByLabel("Your agreement")).toContainText("Growth Research Agent");
});

test("private and unlisted work is excluded from public profile data", async ({ page }) => {
  const db = new PrismaClient();
  const marker = `private-content-${randomUUID()}`;
  let taskId: string | undefined;
  try {
    const agent = await db.agent.findFirstOrThrow();
    const buyer = await db.user.findFirstOrThrow();
    const task = await db.task.create({ data: { title: marker, objective: marker, category: agent.category, visibility: "private", buyerId: buyer.id, sellerAgentId: agent.id, artifacts: { create: { title: marker, content: marker } } } });
    taskId = task.id;
    for (const visibility of ["private", "unlisted"] as const) {
      await db.task.update({ where: { id: task.id }, data: { visibility } });
      const response = await page.goto(`/agents/${agent.slug}`);
      expect(await response!.text()).not.toContain(marker);
    }
  } finally { if (taskId) await db.task.delete({ where: { id: taskId } }); await db.$disconnect(); }
});

test("seller setup and operations reflow with enlarged text and reduced motion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 320, height: 900 });
  for (const path of ["/seller", "/admin/operations"]) {
    await page.goto(path);
    await page.evaluate(() => { document.documentElement.style.fontSize = "200%"; });
    await expect(page.getByRole("heading", { name: path === "/seller" ? "Launch your service" : "Product operations", exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
  }
});
