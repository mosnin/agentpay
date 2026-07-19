import { test, expect } from "@playwright/test";

// ---------------------------------------------------------------------------
// /settings/api-keys — create a key (secret shown exactly once, in the
// `bids_<40 hex chars>` format lib/api-keys.ts documents), confirm it's
// never shown again, then revoke it.
//
// Runs against the shared, unreset seed DB (see e2e/README.md) — no keys
// are seeded (prisma/seed.ts has none), but previous runs of this very spec
// may have left some behind. A timestamped key name keeps this run's
// assertions scoped to the row it created rather than assuming a
// zero-keys starting state.
// ---------------------------------------------------------------------------

test.describe("API keys", () => {
  test("create a key, see the secret exactly once, then revoke it", async ({ page }) => {
    await page.goto("/settings/api-keys");
    await expect(page.getByRole("heading", { level: 1, name: "API keys" })).toBeVisible();

    const keyName = `E2E key ${Date.now()}`;

    // Either the empty-state or the header hosts the trigger, never both.
    await page.getByRole("button", { name: "Create key" }).first().click();

    const createDialog = page.getByRole("dialog", { name: "Create API key" });
    await expect(createDialog).toBeVisible();
    await createDialog.getByLabel("Name").fill(keyName);
    await createDialog.getByRole("button", { name: "Create key" }).click();

    // Reveal dialog — the secret is shown exactly once, right after creation.
    const revealDialog = page.getByRole("dialog", { name: "API key created" });
    await expect(revealDialog).toBeVisible();
    await expect(revealDialog.getByText(keyName)).toBeVisible();

    const secret = (await revealDialog.locator("code").textContent())?.trim() ?? "";
    // lib/api-keys.ts: `bids_<40 hex chars>` — the full, real secret format.
    expect(secret).toMatch(/^bids_[0-9a-f]{40}$/);

    await revealDialog.getByRole("button", { name: "Done" }).click();
    await expect(revealDialog).not.toBeVisible();

    // The new key is listed by name, but the full secret never appears
    // again anywhere on the page — only a redacted prefix does. (The manager
    // renders the name in both a desktop table row and a mobile card, so scope
    // to the first match rather than asserting a single element.)
    await expect(page.getByText(keyName).first()).toBeVisible();
    await expect(page.getByText(secret)).toHaveCount(0);

    // Revoke it (act on the desktop table row).
    const row = page.getByRole("row", { name: new RegExp(keyName) });
    await row.getByRole("button", { name: "Revoke" }).click();

    const revokeDialog = page.getByRole("dialog", { name: "Revoke this key?" });
    await expect(revokeDialog).toBeVisible();
    await expect(revokeDialog.getByText(keyName)).toBeVisible();
    await revokeDialog.getByRole("button", { name: "Revoke key" }).click();
    await expect(revokeDialog).not.toBeVisible();

    await expect(row.getByText("Revoked", { exact: true })).toBeVisible();
  });
});
