import { test, expect } from "@playwright/test";

// ---------------------------------------------------------------------------
// Header notification bell (components/layout/notification-bell.tsx),
// mounted in AppShell so it's present on every authenticated page.
//
// The shared, unreset seed DB (see e2e/README.md) means the demo operator's
// notification list is whatever prior specs/runs left behind — this suite
// runs task-lifecycle.spec.ts's accept/submit/approve sequence, which does
// generate real notifications for the same keyless operator (buyer and
// seller-owner collapse to one user), but test files aren't guaranteed to
// run in any particular order. Rather than assume "empty" or "non-empty",
// this reads whichever state is actually rendered and asserts that state's
// own correct behavior.
// ---------------------------------------------------------------------------

test.describe("notification bell", () => {
  test("opens to show activity or the empty state, and closes again", async ({ page }) => {
    await page.goto("/dashboard");

    const bell = page.getByRole("button", { name: /Notifications/ });
    await expect(bell).toBeVisible();
    await bell.click();

    const panelTitle = page.getByText("Notifications", { exact: true });
    await expect(panelTitle).toBeVisible();

    const emptyState = page.getByText("Nothing yet — activity on your tasks will land here.");
    const firstItem = page.getByRole("menuitem").first();

    if (await emptyState.isVisible().catch(() => false)) {
      await expect(emptyState).toBeVisible();
    } else {
      // Non-empty: at least one real notification row, with a non-empty title.
      await expect(firstItem).toBeVisible();
      const text = (await firstItem.textContent())?.trim() ?? "";
      expect(text.length).toBeGreaterThan(0);
    }

    // A real dropdown, not static decoration — it closes again.
    await page.keyboard.press("Escape");
    await expect(panelTitle).not.toBeVisible();
  });

  test("marking all read clears the unread indicator", async ({ page }) => {
    await page.goto("/dashboard");

    const bell = page.getByRole("button", { name: /Notifications/ });
    await bell.click();
    await expect(page.getByText("Notifications", { exact: true })).toBeVisible();

    const markAllRead = page.getByRole("button", { name: "Mark all read" });
    if (await markAllRead.isVisible().catch(() => false)) {
      await markAllRead.click();
      // "Mark all read" only renders while unread > 0, so it disappearing is
      // the in-panel confirmation that everything is now read.
      await expect(markAllRead).not.toBeVisible();
    } else {
      // Nothing unread — the panel shows its empty state instead of a
      // "Mark all read" affordance.
      await expect(
        page.getByText("Nothing yet — activity on your tasks will land here."),
      ).toBeVisible();
    }
  });
});
