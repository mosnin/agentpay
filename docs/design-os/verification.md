# Bids refinement verification

Historical audit and first refinement at ffeb1ef. The working-payment continuation is documented in [working-product-handoff.md](working-product-handoff.md); its implementation and verification supersede this earlier local scope. Production findings remain separate until deployment.

2026-09-06. Repository: mosnin/agentpay. Local branch: codex/design-os-product-improvements, based on PR #17 at 668a1d8b153f329e733f7a0dc875a65e8b11ab73. Production main reviewed at 052749e9d650fc75b7d0a560270bb55f389e520a. This is a local review candidate; nothing was pushed, merged, migrated in production, or deployed.

## Implemented scope

- Outcome-led home, accurate empty marketplace, human/agent guide, agreement budget and actual $0 charge before commitment, artifact-first task review with next actor and disclosed technical details, seller setup, truthful simulated balances and receipts.
- Exact Clerk frontend host in CSP and delayed sign-in recovery. Actual Clerk authentication still requires a deployed test.
- Public capabilities contract, authenticated role-conditioned action links, accurate submission state and validation feedback, explicit simulation metadata on create/complete responses.
- Approval revalidates the latest artifact and rejects missing or invalid delivery, returning the task to a seller-actionable state. Validation cannot reopen completed/cancelled tasks. Shape hints and prose are reported as skipped checks. Old mock scores are cleared when real checks run. Payment adapter never claims live implementation merely because credentials exist.
- Existing PR #17 permissions, API keys, buyer approval, notifications and other integrated routes preserved. This branch adds no payment provider or hosted worker.

## Local evidence

Evidence directory: /Users/preston/bids-product-evidence. The final evidence-manifest.json binds source and screenshots with SHA-256 hashes.

- Production build, typecheck and lint pass. Build requires DATABASE_URL; an initial invocation without it failed during sitemap generation, then the configured build passed.
- 231 unit tests across 19 files pass, including schema behavior, exact Clerk-origin CSP and false live-payment mode regression checks.
- 22 browser/HTTP tests pass in the final run (e2e.log). Covers discovery, hiring, task progression, approval, keys, search, navigation, notifications, organization invite records, theme, guide keyboard tabs and narrow/enlarged-text reflow.
- Multi-actor HTTP test uses three separate non-admin users with hashed bearer credentials against real local PostgreSQL. Verifies unrelated read/accept rejection, seller action discovery, invalid submission errors, stale-state and missing-artifact approval rejection, correction, seller approval rejection, buyer approval, simulated release, duplicate approval rejection and terminal validation rejection. Test keys are revoked afterward; fixture agent is paused. No real provider is involved.
- All browser sessions use a seeded, keyless local app; the UI lifecycle uses the demo administrator. Distinct bearer actors test API authorization separately. Passing UI tests do not establish real Clerk sign-in or external execution.

## Rendered self-review

Baseline: locally rendered production-main UI with seeded data. Candidate: this local branch with corresponding seeded services and the same dependency-audit task. Baseline includes main's older schema, so this is a comparable journey review, not a controlled experiment. Screenshots are local fixtures, never evidence of live supply.

Reviewed desktop 1440x1000 and mobile 390x844 home, hiring, task, seller and guide; light/dark guide, reduced-motion tab state, and guide at 320px with 200% root text size. All five mobile captures have scroll width 390px; the enlarged-text guide has scroll width 320px. No page errors were recorded on captured routes. Captures record headings, computed font family/size/weight/style and page errors. Self-review only; no independent acceptance or user study.

Observed improvements: consequences precede commitment; the task exposes deliverables before contract JSON; empty supply has a seller onboarding action; human and machine instructions name actual responsibilities. Existing neutral type and service identity remain. Inspection caught and corrected long-card overflow, navigation at enlarged text, unbroken long guide text, misleading approval copy and a stale-state approval bypass. Native contract disclosure and guide tabs keep technical detail accessible.

Limits: representative buyer/seller comprehension is unmeasured. Full screen-reader, contrast, touch-target and all-route text-zoom audits remain open. No numerical design score or premium/production-ready verdict is justified. The final captures and checks support only their listed routes/states.

## Residual release gates

1. Review production database drift and a backed-up additive migration before staging PR #17; this repo has no versioned migration history. Never seed production. Verify real-domain authentication after deploying the CSP correction.
2. Prove a real seller worker delivers useful work. Current listing URLs do not launch compute; current webhooks dispatch on acceptance, not request creation.
3. Introduce idempotency, atomic transitions and a durable queue/outbox. Current sequential tests do not prove concurrent/crash safety; task completion, payment recording and reputation writes are not one atomic provider-backed operation.
4. Audit auth/key scopes and keyless production behavior. JSON Schema checks are structural; existing dialect handling and free-form validation rules are not semantic quality guarantees.
5. Select and integrate a payment/payout provider, then verify funding, declines, duplicate events, refunds, settlement and reconciliation before live money.
6. Run representative user and operator studies plus broader accessibility review before a controlled pilot.

Production verdict: not_ready. Local implementation: reviewable, subject to the exact checks above. See next-steps.md for the ordered rollout and payment explanation.
