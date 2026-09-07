# Working product implementation and provider gate

This continuation supersedes the earlier simulation-only delivery target. The code now implements actual Stripe API calls and an executing service worker. It is not yet provider-verified or deployed; do not call live payments complete until the connection and evidence below exist.

## Included behavior

- Stripe SDK 22.6.1, API version 2026-08-26.dahlia. Hosted Checkout funds the exact USD amount; seller onboarding uses Accounts v2 recipient capabilities.
- Separate charges and transfers retain buyer review before seller settlement. The initial implementation transfers the full agreed amount; no platform commission is deducted. The platform bears Stripe processing fees and the responsibilities configured on its Connect account. These settings need owner review during account activation.
- Only signed, amount/currency/task-matched provider confirmation makes funding available. Seller work is blocked before funding. Buyer approval validates actual delivery, performs the idempotent provider transfer, then completes the task. Transfer confirmation is not a bank payout confirmation.
- Cancellation closes open Checkout or requests a refund; pending refunds stay pending until signed provider confirmation. Source refunds/disputes block further settlement. Refunded charges after seller transfer require administrative reconciliation; automatic seller recovery is not implemented.
- Payment operation claims prevent conflicting transfer/refund operations. Retry keys are stable. Uncertain operations older than 23 hours require provider reconciliation rather than blindly reusing an expired provider idempotency window. No claim of distributed exactly-once behavior across arbitrary provider outages.
- Task creation and artifact submission support Idempotency-Key; different payloads cannot reuse the same key. Worker leases expire after 120 seconds, handlers run within a 60-second window, and artifact validation/state persistence are transactional.
- The reference worker calls an actual service module. The included data-quality service derives counts, duplicates, types and missing values from buyer records. Custom AI services can call their provider from the module. The runner does not fabricate output or approve its own work.
- Demo behavior requires explicit NEXT_PUBLIC_BIDS_PAYMENT_MODE=demo. Missing production payment configuration disables checkout; missing Clerk no longer grants the seeded admin identity. Invalid bearer credentials fail closed.

## Connection needed

The Vercel project agentpay has Postgres/Clerk variables but no payment-provider credentials. The available Chrome session reached Stripe's sign-in page; no authenticated Stripe account or test credentials were available. No live funding, connected seller, transfer, refund, or bank payout was performed.

1. Sign in to the intended Stripe platform account and enable Connect. Review its platform responsibilities. Use Stripe test mode for initial verification.
2. Configure STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET privately in the deployment environment; do not paste secrets into chat. Set NEXT_PUBLIC_BIDS_PAYMENT_MODE=stripe and the correct NEXT_PUBLIC_APP_URL, then rebuild.
3. Register /api/webhooks/stripe for checkout.session.completed, checkout.session.async_payment_succeeded, refund.created, refund.updated, charge.refunded and charge.dispute.created. Keep test/live event destinations and secrets separate.
4. In an isolated preview database, apply the reviewed SQL for the exact baseline. db/upgrade-from-052749e.sql includes the previously undeployed PR #17 fields and this continuation. Back up and check actual database drift before using it anywhere else. It is not a blindly rerunnable migration and must not be applied to a database that already has those columns.
5. Sign in as two real test users. Finish seller payout onboarding; list one real service and deploy its worker under a supervisor. Buyer creates and funds the task; worker produces useful output; buyer approves; confirm the transfer in Stripe. Exercise decline, cancelled checkout, failed handler, duplicate event, lost response and refund.
6. Enable live credentials only after provider test evidence, account activation, production schema/auth checks and explicit live-payment authorization. Bank payout eligibility/timing is confirmed by Stripe, not by our transfer response.

## Local verification

- 258 unit tests across 22 files pass; typecheck and lint pass.
- 23 browser/HTTP tests pass against isolated PostgreSQL, including multi-actor permissions and the executing worker with artifact replay protection. Funding in this suite is explicitly local demo funding.
- The Stripe-mode production build passes without demo identity or provider credentials. A valid local bearer identity renders the real funding and seller onboarding controls; an unauthenticated task API request returns 401. Missing Stripe configuration leaves funding pending and creates no checkout session.
- Desktop 1440x1000 and mobile 390x844 funding/error states were rendered and reviewed. No page errors or horizontal overflow were observed on those captures. Funding moves before empty delivery panels on mobile; financial labels wrap instead of truncating. Seller payout setup was checked at mobile width. These are local fixtures, not Stripe-account evidence.
- The additive SQL upgrade from production-main schema was applied to a separate disposable local PostgreSQL database; Prisma schema diff reported no difference afterward. No production migration ran.
- Evidence lives in /Users/preston/bids-product-evidence: working-unit.log, working-e2e.log, working-lint.log, working-typecheck.log, working-build.log, stripe-mode-build.log, stripe-ui-verification.json, stripe-*.png and migration-check.log. working-evidence-manifest.json binds the final source commit and file hashes.

Inspection caught and fixed a lost POST route during editing, onboarding prerender depending on a demo identity, misleading pending-task guidance and mobile funding placement. Provider test transactions, live authentication and production deployment remain unverified.

## Evidence boundaries

Unit tests exercise monetary validation, provider call contracts, pending/failure outcomes, and real Stripe SDK signature verification with local test signatures. They mock provider network calls, and are not Stripe test-account transactions. Browser tests use isolated PostgreSQL and explicit demo funding to test actual UI/HTTP/worker execution without charges. The real worker result is computed from supplied input and asserted in e2e/worker-execution.spec.ts.

Remaining operational work: provider activation/verification, actual deployment and real-domain Clerk checks, supervised seller runtime, broader abuse/authorization testing, reconciliation operations for disputes and expired uncertain provider operations, representative buyer/seller usability. The product's simulation fallback is removed by default; account connection remains the concrete external blocker to proving paid operation.

Sources: https://docs.stripe.com/connect/separate-charges-and-transfers, https://docs.stripe.com/connect/marketplace/tasks/create, https://docs.stripe.com/webhooks. Decisions preserve explicit buyer approval and distinguish provider transfers from bank payouts.
