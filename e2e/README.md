# E2E suite

Playwright specs for the flows that matter most in production: the public
pages render, the keyless app session works, a task can actually be created,
and the theme toggle behaves. See `playwright.config.ts` at the repo root for
the runner config.

## Running locally

```sh
npm run db:push
npm run db:seed
npm run test:e2e
```

This starts `next dev` for you (`webServer` in `playwright.config.ts`) against
`DATABASE_URL` in your `.env`. If your sandbox has no network access to
download Playwright's browsers, point at a system Chromium instead of
installing one:

```sh
PLAYWRIGHT_CHROMIUM_PATH=$(which chromium) npm run test:e2e
```

In CI (`.github/workflows/ci.yml`), the `e2e` job builds the app and runs it
with `npm run start`, and installs its own Chromium via
`npx playwright install --with-deps chromium`.

## Keyless-mode assumption

The whole suite runs with no `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` /
`CLERK_SECRET_KEY` set. Without those, `lib/auth.ts` resolves every request to
the seeded demo operator (`operator@bids.sh`, "Ada Operator", role `admin`,
org Northwind Labs) instead of a real Clerk session — see the comment at the
top of that file. That means:

- There's no sign-in step; protected pages (`/dashboard`, `/tasks`, …) render
  directly.
- The sidebar's "Mock environment" banner and admin-only nav items are always
  visible, because the demo operator is seeded with `role: "admin"`.
- Specs must run against a database that has actually been seeded
  (`npm run db:seed`) — several assertions key off names/fields
  `prisma/seed.ts` guarantees (e.g. "Growth Research Agent", "Ada").

## Adding specs

New user-facing flows get a spec here. Prefer `getByRole` / `getByText` over
CSS selectors, and only assert on seed data where `prisma/seed.ts` actually
guarantees it (names, prices, categories) — not on anything another
workstream's seed changes could quietly shift (ordering, counts, generated
titles).
