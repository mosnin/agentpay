import { test, expect } from "@playwright/test";

// ---------------------------------------------------------------------------
// One canonical hire-to-task-creation flow. "Growth Research Agent" is a
// seed-guaranteed name (prisma/seed.ts) — active, verified, startingPrice 25,
// category "Growth" — so the hire link and the form's agent preset are both
// stable. Payment/validation depth beyond creation belongs to other
// workstreams; this spec stops at "task created, status visible".
// ---------------------------------------------------------------------------

const AGENT_NAME = "Growth Research Agent";

test.describe("task flow", () => {
  test("hire the seeded Growth Research Agent and create a task", async ({ page }) => {
    await page.goto("/marketplace");

    // Marketplace card -> agent profile.
    await page.getByRole("link", { name: AGENT_NAME }).first().click();
    await expect(
      page.getByRole("heading", { level: 1, name: AGENT_NAME }),
    ).toBeVisible();

    // Profile's "Hire this agent" -> /tasks/new?agent=<id>&category=Growth
    // (components/agents/agent-profile-header.tsx). The mobile sticky "Hire"
    // bar is lg:hidden, so it's not in play at the default desktop viewport.
    await page
      .getByRole("link", { name: "Hire this agent", exact: true })
      .click();
    await expect(page).toHaveURL(/\/tasks\/new\?/);

    // create-task-form.tsx preselects the agent from the `agent` query param
    // (id) and `category` param, so this confirmation banner renders without
    // any interaction — proving the hire link wired the form correctly.
    await expect(page.getByText(`Hiring ${AGENT_NAME}`)).toBeVisible();

    // Every other required field (createTaskSchema in lib/schemas.ts) is
    // already satisfied by the form's defaults once an agent+category are
    // preset: title (from the agent's primary capability), category,
    // sellerAgentId, budget (agent's startingPrice), deadline (+7 days),
    // paymentMode ("mock_escrow"), visibility ("public"). Objective is the
    // only field left blank (min 10 chars) — fill exactly that.
    await page
      .getByLabel("Objective")
      .fill(
        "Research 20 target accounts and return a prioritized shortlist with sources.",
      );

    await page.getByRole("button", { name: "Create task" }).click();

    // lib/actions/tasks.ts creates the task with status "pending" and
    // redirects to /tasks/<id> on success.
    await expect(page).not.toHaveURL(/\/tasks\/new/, { timeout: 15_000 });
    await expect(page).toHaveURL(/\/tasks\/[\w-]+$/);

    // The "Pending" text is ambiguous on this page: TaskTimeline
    // (components/tasks/task-timeline.tsx) always renders every lifecycle
    // step's label, including a "Pending" step, regardless of the task's
    // current status — but that label lives in a <div>, while the actual
    // status badge (components/shared/status-badge.tsx) is a <span>. Scope
    // to the span to assert the real status pill, not the timeline step.
    await expect(
      page.locator("span").filter({ hasText: /^Pending$/ }),
    ).toBeVisible();
  });
});
