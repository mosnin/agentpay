# Bids: next steps and payment experience

2026-09-06. Production main: 052749e. This local branch builds on unmerged PR #17, 668a1d8.

## What paying does today

No actual payment happens. Creating a task saves its budget in a Payment record. Mock escrow sets that record to escrowed. A seller must run the work in its own environment and submit an artifact. In the improved branch, applicable JSON Schema checks validate structure, then the buyer explicitly approves completion. Approval records a simulated release and a mock transaction identifier. Cancellation records a simulated refund. None of these entries represents a charge, money held in custody, a transfer, a withdrawable balance or a seller payout.

A listing is a service profile, not hosted compute. An endpoint URL alone does not launch an agent. A worker needs code, a runtime and credentials. It can poll assigned tasks, accept and submit using a Bids API key. Current signed webhooks dispatch on acceptance, not initial task creation. The reference worker under examples/reference-agent is an integration starting point, not a verified production worker fleet.

Production main differs: validation is mocked and its completion path bypasses validation. PR #17 adds actor permissions, schema checks and buyer approval. This branch adds consequence clarity and machine workflow metadata, fixes the Clerk CSP, and stops representing shape hints as completed schema checks.

## UX/UI assessment

The existing UI has coherent neutral styling, responsive discovery filters and real persisted objects. Its main weakness is the transaction: infrastructure vocabulary and contract JSON arrive before people understand who does the work, what they pay and who acts next. An empty marketplace looks like a filter error. Simulated earnings look like money. Sign-in has no failure recovery.

The redesigned human journey is outcome → scope/budget → seller acceptance → delivered evidence → buyer approval → receipt. The agent journey is capability discovery → owner authentication → assignments → allowed action → validation feedback → buyer decision. Both use the same task state; neither can treat a schema result as a quality guarantee.

## Ordered launch plan

### 1. Restore access and stage the complete branch
- Deploy the exact Clerk-host CSP correction, then test real-domain sign-in/sign-up, return navigation and auth-service failure with test accounts.
- Back up production and inspect schema drift. Review and apply PR #17's additive database changes before deploying it. Do not blindly push a schema or seed production.
- Use an isolated preview database and two distinct users. Preserve a rollback and forward-compatible database plan.
- Exit evidence: entry works, authorized actors succeed, unrelated actors fail, invalid deliverables cannot be approved.

### 2. Make a few services actually deliver
- Start with a small group of real operators and narrow services with explicit inputs, deliverables, limitations and delivery expectations. Do not present seeded demo listings as real supply.
- Configure a worker for each service and prove buyer request → seller acceptance → real execution → correction if invalid → buyer approval.
- Add request-created notifications, queued dispatch and idempotent worker claiming before promising automatic execution. Show availability only when actually measured.
- Exit evidence: a new buyer receives a useful result without developer intervention; interruption does not lose work.

### 3. Harden automation before expanding
- Add idempotency keys for writes, atomic state transitions, concurrency protection, a durable event/outbox queue, retries and dead-letter handling.
- Define deadlines, execution limits, cancellation after acceptance, revisions and disputes in both the human agreement and API contract.
- Review keyless production behavior, key scopes/expiry, cross-organization authorization, sensitive input visibility and abuse controls.
- Add a validated OpenAPI document, stable error codes, pagination and Retry-After. The new /api/capabilities and workflow.actions are useful foundations, not a complete SDK.
- Exit evidence: duplicate/concurrent requests and crashes cannot duplicate tasks or settlements; repeated validation cannot reopen a closed task.

### 4. Implement real payments as a separate launch gate
- Choose the initial buyer payment method and seller payout method. Card and crypto/x402 need different integration choices; this redesign does not select a provider.
- Define provider-supported funds flow, fees, funding confirmation, payout eligibility, refunds and disputes before describing anything as live escrow.
- Save provider IDs, reconcile signed events and use provider idempotency. A button click or database status does not prove settlement.
- Intended UX: show total/terms → authorize funding → confirm funding → seller accepts → deliver → validate → buyer approves → provider confirms settlement → receipt/payout status.
- Agent clients need those same authoritative states and spending limits.
- Exit evidence: provider test-mode charge, decline, delayed/duplicate events, refund, payout failure and reconciliation; explicit authorization before live charging.

### 5. Validate the experience with people and operators
- Observe first-time buyers finding a service, explaining the charge, writing a usable brief, finding the artifact, distinguishing structure from accuracy and approving/cancelling.
- Observe sellers connecting workers and correcting output; test an agent integration without UI assistance.
- Measure task success, comprehension errors, time to useful delivery and recovery. Establish a baseline before setting numerical growth targets.
- Include keyboard, screen reader, enlarged text, phone layouts, light/dark and reduced motion. Automation is not a substitute for a representative user study.

### 6. Operate a controlled pilot
Assign owners and recovery actions for auth, worker uptime, queue backlog, schema changes and payment reconciliation. Roll out to a small cohort, examine useful deliveries and support failures, and expand only when the entire critical journey is reliable.

## Release boundary

Production remains not_ready: the auth fix is not deployed, the PR schema is not applied, public supply is empty and payments remain simulated. Local changes are a review candidate, not a premium or production-ready claim. Whole-product numerical scores are withheld: historical authorship evidence, representative usability and full accessibility validation are unavailable. See verification.md for actual checks and residual risks.
