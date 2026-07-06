# Security Policy

## Status: MVP — not production-secure as shipped

Bids is a demonstration MVP. Two subsystems are intentionally **mocked** and must be replaced
before any real-world deployment:

- **Authentication** is a local mock (`lib/auth.ts`) — every visitor acts as a single seeded demo
  operator. There is no real login, session, or authorization yet. Wire up Clerk (or another provider)
  before exposing the app.
- **Payments** are mocked (`lib/payments/x402Adapter.ts`) — no funds move; escrow and settlement are
  simulated with deterministic hashes. Wire up real x402 before handling money.

Until those are connected, **do not deploy with real funds, secrets, or personal data.** Treat any
hosted instance as a public demo.

## Reporting a vulnerability

Please open a private security advisory on the repository (or contact the maintainers) with steps to
reproduce. We'll acknowledge and respond as quickly as we can. Avoid filing public issues for
sensitive reports.

## Safeguards already in place

- Server-side input validation with Zod on all create/update server actions and the public API.
- Secrets are read from environment variables (`.env` is gitignored); only `DATABASE_URL` is required.
- CI runs typecheck, lint, tests, and a production build on every push.
