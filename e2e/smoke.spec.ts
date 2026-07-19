import { test, expect } from "@playwright/test";

// ---------------------------------------------------------------------------
// Smoke suite — the app's public surfaces render, top to bottom, without a
// 500. This is the baseline that makes a broken build structurally
// unshippable: if any of these fail, CI is red.
// ---------------------------------------------------------------------------

test.describe("smoke", () => {
  test("home page renders the logo and hero heading", async ({ page }) => {
    await page.goto("/");

    // Brand renders two <img alt="Bids"> (light/dark variants); only one is
    // ever visible at a time via Tailwind's dark: classes, and .first() picks
    // the header's (it precedes the footer's in DOM order).
    await expect(page.getByRole("img", { name: "Bids" }).first()).toBeVisible();

    await expect(
      page.getByRole("heading", {
        level: 1,
        name: "The marketplace for autonomous agent labor",
      }),
    ).toBeVisible();
  });

  test("footer Terms and Privacy links navigate to 200 pages", async ({ page }) => {
    const footer = page.getByRole("contentinfo");

    // The landing footer is a scroll-reveal: page content (z-10, opaque) sits
    // over a footer pinned behind it (sticky, z-0), uncovered only once you
    // reach the very bottom. Scroll to the end first — exactly what a visitor
    // does to reach these links — so they're actually on top and clickable.
    const revealFooter = async (linkName: string) => {
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      const link = footer.getByRole("link", { name: linkName, exact: true });
      await expect(link).toBeVisible();
      return link;
    };

    await page.goto("/");
    const termsLink = await revealFooter("Terms");
    await expect(termsLink).toHaveAttribute("href", "/terms");
    await termsLink.click();
    await expect(page).toHaveURL(/\/terms$/);
    await expect(
      page.getByRole("heading", { level: 1, name: "Terms of Service" }),
    ).toBeVisible();
    expect((await page.request.get("/terms")).status()).toBe(200);

    await page.goto("/");
    const privacyLink = await revealFooter("Privacy");
    await expect(privacyLink).toHaveAttribute("href", "/privacy");
    await privacyLink.click();
    await expect(page).toHaveURL(/\/privacy$/);
    await expect(
      page.getByRole("heading", { level: 1, name: "Privacy Policy" }),
    ).toBeVisible();
    expect((await page.request.get("/privacy")).status()).toBe(200);
  });

  test("marketplace lists a seeded agent and its card opens a profile", async ({
    page,
  }) => {
    await page.goto("/marketplace");

    // Don't hardcode a name here (smoke should hold regardless of seed
    // ordering/content) — read whichever agent renders first, then confirm
    // its card link opens a profile whose <h1> is that same name.
    const firstCardHeading = page.getByRole("heading", { level: 3 }).first();
    await expect(firstCardHeading).toBeVisible();
    const agentName = (await firstCardHeading.textContent())?.trim() ?? "";
    expect(agentName.length).toBeGreaterThan(0);

    await page.getByRole("link", { name: agentName }).first().click();
    await expect(
      page.getByRole("heading", { level: 1, name: agentName }),
    ).toBeVisible();
  });

  test("developers page renders", async ({ page }) => {
    await page.goto("/developers");
    await expect(
      page.getByRole("heading", { level: 1, name: /Programmable marketplace/i }),
    ).toBeVisible();
  });

  test("unknown URL shows the 404 page with a link home", async ({ page }) => {
    const response = await page.goto("/this-page-does-not-exist-xyz");
    expect(response?.status()).toBe(404);

    await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();

    // "Links home": the persistent site chrome's brand mark, present on
    // every SiteShell page including this one, always points at "/".
    await expect(page.getByRole("link", { name: "Bids" }).first()).toHaveAttribute(
      "href",
      "/",
    );
  });
});
