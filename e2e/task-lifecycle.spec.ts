import { test, expect } from "@playwright/test";

// ---------------------------------------------------------------------------
// The full task lifecycle, driven through the real lifecycle buttons (not
// the "Run demo" shortcut) so it actually exercises accept/start/submit/
// approve — hire, submit, approve, released.
//
// Keyless mode collapses buyer and seller-agent-owner into the same seeded
// admin operator (see e2e/README.md), and every gate in
// lib/actions/tasks.ts's actorAllowed()/approveTask() admits an admin
// regardless of actual ownership — so this one user can legitimately drive
// both sides without needing a second account.
//
// No output schema is generated for this task (the "Generate structured
// contract" step on /tasks/new is skipped), so the submitted artifact has
// nothing to conform to: validateArtifactAgainstSchema() treats an empty
// schema as `skipped: true, valid: true` (lib/validation.ts), which
// lib/actions/tasks.ts's submitArtifact() advances straight to
// "validating" — no need to hand-craft a schema-conforming payload here.
// ---------------------------------------------------------------------------

test.describe("task lifecycle", () => {
  test("hire an agent, submit work, approve, and release payment", async ({ page }) => {
    // ---- Hire: marketplace -> agent profile -> /tasks/new -> create ----
    await page.goto("/marketplace");

    // Whichever agent renders first — the lifecycle doesn't depend on which
    // one, so this stays valid regardless of seed ordering/content.
    const firstCardHeading = page.getByRole("heading", { level: 3 }).first();
    await expect(firstCardHeading).toBeVisible();
    const agentName = (await firstCardHeading.textContent())?.trim() ?? "";
    expect(agentName.length).toBeGreaterThan(0);

    await page.getByRole("link", { name: agentName }).first().click();
    await expect(page.getByRole("heading", { level: 1, name: agentName })).toBeVisible();

    await page.getByRole("link", { name: "Hire this agent", exact: true }).click();
    await expect(page).toHaveURL(/\/tasks\/new\?/);

    await page
      .getByLabel("Objective")
      .fill("E2E lifecycle coverage: deliver a short status report and confirm payment releases.");
    await page.getByRole("button", { name: "Create task" }).click();

    await expect(page).not.toHaveURL(/\/tasks\/new/, { timeout: 15_000 });
    await expect(page).toHaveURL(/\/tasks\/[\w-]+$/);

    const statusBadge = (label: string) => page.locator("span").filter({ hasText: new RegExp(`^${label}$`) });
    await expect(statusBadge("Pending")).toBeVisible();

    // ---- Accept ----
    await page.getByRole("button", { name: "Accept task" }).click();
    await expect(statusBadge("Accepted")).toBeVisible();

    // ---- Start ----
    await page.getByRole("button", { name: "Start task" }).click();
    await expect(statusBadge("Running")).toBeVisible();

    // ---- Submit ----
    await page.getByRole("button", { name: "Submit artifact", exact: true }).click();
    const submitDialog = page.getByRole("dialog", { name: "Submit artifact" });
    await expect(submitDialog).toBeVisible();
    await submitDialog.getByLabel("Title").fill("Status report");
    await submitDialog
      .getByLabel("Content")
      .fill(JSON.stringify({ summary: "E2E coverage complete", records: 1 }, null, 2));
    await submitDialog.getByRole("button", { name: "Submit artifact", exact: true }).click();
    await expect(submitDialog).not.toBeVisible();

    // No output schema on this task, so validation is skipped (auto-pass) —
    // lands straight in "validating", awaiting buyer approval.
    await expect(statusBadge("Validating")).toBeVisible();

    // ---- Approve & release payment ----
    await page.getByRole("button", { name: "Approve & release payment" }).click();
    await expect(statusBadge("Completed")).toBeVisible();

    // The payment sidebar card reflects the same release.
    await expect(page.getByText("Payment")).toBeVisible();
    await expect(statusBadge("Released")).toBeVisible();

    // A completed task swaps the lifecycle actions for a review prompt
    // (task-actions.tsx's showReview branch) rather than a terminal
    // "no further actions" message — that message is cancelled-only.
    await expect(page.getByRole("button", { name: "Leave a review" })).toBeVisible();
  });
});
