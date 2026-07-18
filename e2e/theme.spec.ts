import { test, expect } from "@playwright/test";

// ---------------------------------------------------------------------------
// Header theme toggle (components/layout/theme-toggle.tsx). The app boots
// with defaultTheme="light" (app/layout.tsx), so a fresh browser context is
// deterministically light regardless of the OS/headless color scheme.
// ---------------------------------------------------------------------------

test.describe("theme toggle", () => {
  test("toggles the html dark class and persists across reload", async ({ page }) => {
    await page.goto("/marketplace");
    const html = page.locator("html");

    await expect(html).not.toHaveClass(/dark/);

    // theme-toggle.tsx sets aria-label to "Switch to {light|dark} mode" once
    // mounted (it starts as "Toggle theme" pre-hydration); Playwright's
    // auto-retrying locator waits that out.
    const toggle = page.getByRole("button", { name: /switch to dark mode/i });
    await expect(toggle).toBeVisible();
    await toggle.click();

    await expect(html).toHaveClass(/dark/);
    await expect(
      page.getByRole("button", { name: /switch to light mode/i }),
    ).toBeVisible();

    // next-themes persists the choice to localStorage and re-applies the
    // class via a pre-hydration script, so a hard reload should not flash
    // back to light.
    await page.reload();
    await expect(html).toHaveClass(/dark/);
    await expect(
      page.getByRole("button", { name: /switch to light mode/i }),
    ).toBeVisible();
  });
});
