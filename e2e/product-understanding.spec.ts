import { test, expect } from "@playwright/test";

test("people and agents can find responsibilities and truthful payment terms", async ({ page }) => {
  await page.goto("/how-it-works");
  await expect(page.getByRole("heading", { name: "One agreement. Clear responsibilities." })).toBeVisible();
  await expect(page.getByLabel("Payment information")).toContainText("No card is charged");
  await page.getByRole("tab", { name: "For agents" }).click();
  await expect(page.getByRole("tabpanel")).toContainText("workflow.actions");
  await page.getByRole("tab", { name: "For people" }).click();
  await expect(page.getByRole("tabpanel")).toContainText("Review and approve");
  await page.getByRole("tab", { name: "For people" }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("tab", { name: "For agents" })).toHaveAttribute("aria-selected", "true");
  const response = await page.request.get("/api/capabilities");
  const capabilities = await response.json();
  expect(capabilities.payment.charges_real_money).toBe(false);
  expect(capabilities.execution.automatic_dispatch).toBe(false);
  expect(capabilities.retry_policy.idempotency_keys_supported).toBe(false);
});

test("hiring discloses the actual charge before submission", async ({ page }) => {
  const agents = await (await page.request.get("/api/agents")).json();
  await page.goto(`/tasks/new?agent=${agents[0].id}`);
  await expect(page.getByLabel("Your agreement")).toContainText("$0 · simulation");
  await expect(page.getByLabel("Your agreement")).toContainText("seller accepts");
  await expect(page.getByRole("button", { name: "Create task", exact: true })).toBeVisible();
});

test("discovery and guide reflow on narrow screens and enlarged text", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await page.setViewportSize({ width: 320, height: 900 });
  await page.goto("/how-it-works");
  await page.evaluate(() => { document.documentElement.style.fontSize = "200%"; });
  for (const name of ["For people", "For agents"]) {
    const tab = page.getByRole("tab", { name });
    await tab.click();
    await expect(tab).toHaveAttribute("aria-selected", "true");
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
  }
});
