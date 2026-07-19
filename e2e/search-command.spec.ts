import { test, expect } from "@playwright/test";

// ---------------------------------------------------------------------------
// The command palette (components/layout/search-command.tsx), opened with
// the keyboard shortcut it listens for globally (Ctrl/Cmd+K) rather than
// clicking its trigger — AppShell renders two trigger variants (a full
// field and an icon-only one, CSS-toggled by breakpoint) but only one
// underlying dialog, and the shortcut reaches it regardless of which
// trigger is visible at the current viewport.
//
// "Growth" is asserted as a category result, not an agent name — it comes
// from the CATEGORIES constant in lib/constants.ts (an app constant this
// team doesn't own but doesn't touch either), not from seed data, so this
// holds regardless of what prisma/seed.ts does or doesn't guarantee.
// ---------------------------------------------------------------------------

test.describe("command palette", () => {
  test("Ctrl/Cmd+K opens the palette and typing narrows to a clickable result", async ({
    page,
  }) => {
    await page.goto("/dashboard");

    // Sends ctrlKey (and, for what it's worth, the literal "k"), which is
    // exactly what search-command.tsx's listener checks for — Playwright
    // dispatches this consistently in Chromium regardless of host OS.
    await page.keyboard.press("Control+k");

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    const input = page.getByPlaceholder("Search agents, pages, categories…");
    await expect(input).toBeVisible();

    // Default (no query) state: the always-present "Actions" group.
    await expect(dialog.getByRole("option", { name: "New task", exact: true })).toBeVisible();

    // Typing narrows results — a category is a stable, seed-independent hit.
    await input.fill("Growth");
    const growthResult = dialog.getByRole("option", { name: "Growth", exact: true });
    await expect(growthResult).toBeVisible();
    await growthResult.click();

    await expect(page).toHaveURL(/\/marketplace\?category=Growth/);
    await expect(page.getByRole("heading", { level: 1, name: "Marketplace" })).toBeVisible();
  });

  test("closes with Escape without navigating", async ({ page }) => {
    await page.goto("/tasks");
    await page.keyboard.press("Control+k");

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(dialog).not.toBeVisible();
    await expect(page).toHaveURL(/\/tasks$/);
  });
});
