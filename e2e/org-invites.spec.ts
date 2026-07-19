import { test, expect } from "@playwright/test";

// ---------------------------------------------------------------------------
// Organization invites: sending/revoking from /settings/organization, and
// the accept page's (/invites/[token]) states.
//
// The seeded demo operator already belongs to an organization (Northwind
// Labs — see e2e/README.md), so /settings/organization renders the
// member/invite management UI directly, without the "create an
// organization" fallback.
//
// Coverage note: the accept page has several states (not found, revoked,
// already accepted, expired, wrong account, join) — see
// app/invites/[token]/page.tsx. Only "not found" is reachable end-to-end
// without either seeding an OrganizationInvite row (prisma/seed.ts creates
// none) or reading a token out of the database directly: the invite form
// here never surfaces the generated token/link in the UI (by design —
// email delivery isn't wired up yet, see organization-manager.tsx), and no
// API route exposes it either. This spec covers what's actually reachable
// through the UI and is explicit about the gap rather than faking the rest.
// ---------------------------------------------------------------------------

test.describe("organization invites", () => {
  test("sending an invite lists it as pending, then revoke removes it", async ({ page }) => {
    await page.goto("/settings/organization");
    await expect(
      page.getByRole("heading", { level: 2, name: "Invite someone" }),
    ).toBeVisible();

    const inviteEmail = `e2e-invite-${Date.now()}@example.com`;
    await page.getByLabel("Email address").fill(inviteEmail);
    await page.getByRole("button", { name: "Send invite" }).click();

    await expect(page.getByText(`Invite sent to ${inviteEmail}`)).toBeVisible();

    const inviteRow = page.getByRole("row", { name: new RegExp(inviteEmail) });
    await expect(inviteRow).toBeVisible();

    await inviteRow.getByRole("button", { name: "Revoke" }).click();
    await expect(page.getByText(`Invite to ${inviteEmail} revoked`)).toBeVisible();
    await expect(page.getByRole("row", { name: new RegExp(inviteEmail) })).toHaveCount(0);
  });
});

test.describe("invite accept page", () => {
  test("an unknown token shows the not-found state with a way home", async ({ page }) => {
    const response = await page.goto("/invites/e2e-nonexistent-token-does-not-exist");
    // Renders a state card for an unrecognized token — not a Next.js 404.
    expect(response?.status()).toBe(200);

    // The state card's title (components/ui/card.tsx CardTitle) renders a
    // plain <div>, not a heading element — text query, not role="heading".
    await expect(page.getByText("Invite not found", { exact: true })).toBeVisible();
    await expect(
      page.getByText("This invite link doesn't match any invitation we know about."),
    ).toBeVisible();

    const homeLink = page.getByRole("link", { name: "Go home" });
    await expect(homeLink).toHaveAttribute("href", "/");
    await homeLink.click();
    await expect(page).toHaveURL(/\/$/);
  });
});
