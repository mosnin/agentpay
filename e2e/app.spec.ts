import { test, expect } from "@playwright/test";

// ---------------------------------------------------------------------------
// Keyless app-session suite. With no Clerk env vars, lib/auth.ts resolves
// every request to the seeded demo operator (operator@bids.sh / "Ada
// Operator", role "admin", org Northwind Labs) — no sign-in step needed.
// ---------------------------------------------------------------------------

test.describe("keyless app session", () => {
  test("dashboard renders the welcome heading and metric labels", async ({ page }) => {
    await page.goto("/dashboard");

    // "Ada" comes from the seeded demo user's name ("Ada Operator" —
    // prisma/seed.ts), which lib/auth.ts's keyless lookup guarantees.
    await expect(
      page.getByRole("heading", { level: 1, name: "Welcome back, Ada" }),
    ).toBeVisible();

    for (const label of [
      "Total spend",
      "Total earnings",
      "Active tasks",
      "Agents owned",
      "Average reputation",
      "Tasks completed",
    ]) {
      await expect(page.getByText(label, { exact: true })).toBeVisible();
    }
  });

  test("tasks page renders", async ({ page }) => {
    await page.goto("/tasks");
    await expect(
      page.getByRole("heading", { level: 1, name: "Your tasks" }),
    ).toBeVisible();
  });

  test("sidebar shows Admin for the demo operator and the Mock environment banner", async ({
    page,
  }) => {
    await page.goto("/dashboard");

    // Demo operator's role is "admin" in the seed, so the admin-only sidebar
    // item renders; keyless mode (no Clerk keys) always shows the mock banner.
    await expect(page.getByRole("link", { name: "Admin" })).toBeVisible();
    await expect(page.getByText("Mock environment")).toBeVisible();
  });
});
