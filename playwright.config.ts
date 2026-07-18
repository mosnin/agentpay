import { defineConfig, devices } from "@playwright/test";

// ---------------------------------------------------------------------------
// Bids E2E config — keyless mode only (no Clerk env vars), against the
// seeded demo operator. See e2e/README.md for how to run this locally.
// ---------------------------------------------------------------------------
export default defineConfig({
  testDir: "e2e",

  // The suite runs against one shared, seeded Postgres database with no
  // per-test isolation/reset, so specs run one at a time rather than racing
  // each other's writes (e.g. task-flow.spec.ts creates a real task).
  fullyParallel: false,

  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["github"]] : "list",

  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },

  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        // Lets sandboxes without network access to the Playwright browser
        // CDN reuse a system-installed Chromium. Falls back to Playwright's
        // normal resolution (the browsers CI installs) when unset.
        ...(process.env.PLAYWRIGHT_CHROMIUM_PATH
          ? {
              launchOptions: {
                executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH,
              },
            }
          : {}),
      },
    },
  ],

  webServer: {
    command: process.env.CI ? "npm run start" : "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
