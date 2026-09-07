import { test, expect } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { randomBytes, createHash } from "node:crypto";
test("worker credential cannot purchase, approve payment or edit account briefs", async ({
  request,
}) => {
  const db = new PrismaClient();
  const user = await db.user.findUniqueOrThrow({
    where: { email: "operator@bids.sh" },
  });
  const secret = `bids_${randomBytes(20).toString("hex")}`;
  const key = await db.apiKey.create({
    data: {
      name: "Scoped HTTP fixture",
      userId: user.id,
      prefix: secret.slice(0, 12),
      hashedKey: createHash("sha256").update(secret).digest("hex"),
      scopes: ["tasks:read", "tasks:execute", "agents:write"],
      expiresAt: new Date(Date.now() + 60000),
    },
  });
  const headers = { authorization: `Bearer ${secret}` };
  try {
    expect((await request.get("/api/tasks", { headers })).status()).toBe(200);
    expect(
      (await request.post("/api/tasks", { headers, data: {} })).status(),
    ).toBe(401);
    expect(
      (
        await request.post("/api/tasks/nonexistent/complete", { headers })
      ).status(),
    ).toBe(401);
    expect(
      (
        await request.post("/api/payments/checkout", { headers, data: {} })
      ).status(),
    ).toBe(401);
    expect(
      (
        await request.put("/api/brief", {
          headers,
          data: { revision: 0, values: { title: "x" } },
        })
      ).status(),
    ).toBe(401);
    const agent = await db.agent.findFirstOrThrow({
      where: { ownerId: user.id, status: "active" },
    });
    expect(
      (
        await request.post(`/api/agents/${agent.id}/heartbeat`, {
          headers,
          data: { capacity: 2 },
        })
      ).status(),
    ).toBe(200);
    await db.apiKey.update({
      where: { id: key.id },
      data: { expiresAt: new Date(0) },
    });
    expect((await request.get("/api/tasks", { headers })).status()).toBe(401);
  } finally {
    await db.apiKey.delete({ where: { id: key.id } });
    await db.$disconnect();
  }
});
test("an unfinished brief survives reload and an unavailable save retains text", async ({
  page,
}) => {
  const db = new PrismaClient();
  const user = await db.user.findUniqueOrThrow({
    where: { email: "operator@bids.sh" },
  });
  await db.taskBrief.deleteMany({ where: { userId: user.id } });
  try {
    await page.goto("/tasks/new");
    await page.getByLabel("Title", { exact: true }).fill("A recoverable brief");
    await expect(
      page
        .getByRole("status")
        .filter({ hasText: "Brief saved to your account." }),
    ).toBeVisible();
    await page.reload();
    await expect(page.getByLabel("Title", { exact: true })).toHaveValue(
      "A recoverable brief",
    );
    await page.route("**/api/brief", (route) =>
      route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({ error: "Save unavailable; text preserved." }),
      }),
    );
    await page
      .getByLabel("Title", { exact: true })
      .fill("Keep this unsaved change");
    await expect(
      page.getByText("Save unavailable; text preserved."),
    ).toBeVisible();
    await expect(page.getByLabel("Title", { exact: true })).toHaveValue(
      "Keep this unsaved change",
    );
  } finally {
    await db.taskBrief.deleteMany({ where: { userId: user.id } });
    await db.$disconnect();
  }
});
test("support, saved agents and scheduler history reflow on a small screen", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 900 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const [path, title] of [
    ["/support", "Support operations"],
    ["/settings/saved-agents", "Saved agents"],
    ["/settings/api-keys", "API keys"],
    ["/admin/operations", "Product operations"],
  ]) {
    await page.goto(path);
    await expect(
      page.getByRole("heading", { level: 1, name: title, exact: true }),
    ).toBeVisible();
    await page.evaluate(() => {
      document.documentElement.style.fontSize = "200%";
    });
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(320);
  }
  await page.goto("/support");
  await page
    .getByLabel("Subject", { exact: true })
    .fill(`Service issue ${Date.now()}`);
  await page
    .getByLabel("What happened?", { exact: true })
    .fill("My service is unavailable and I need help restoring access.");
  await page
    .getByRole("button", { name: "Submit report", exact: true })
    .click();
  await expect(
    page.getByText("Report saved. You can track its status below."),
  ).toBeVisible();
});
