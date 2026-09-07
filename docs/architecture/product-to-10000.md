# Product path to 10,000 accounts

Owner: Bids implementation work in mosnin/agentpay. This is an engineering delivery queue, not a list of tasks for the founder. Registered accounts, monthly active users and concurrent requests are different measures. No acquisition or concurrency claim follows from a fixture size.

## This delivery

- Search the full catalog when creating a task; preserve the current selection on search failure. Server response caps prevent shipping thousands of options to a phone.
- Public discovery and authenticated task history use bounded pages, deterministic tie-breaks and navigation/count headers. Reference workers rotate through seller task pages.
- Dashboard task activity is private to its operator, aggregated in PostgreSQL instead of fetching global history. Seller totals use all matching records; visible inbound work is paginated.
- Onboarding is transactional, retry-safe and preserves accepted team membership. Buyer/seller setup reflects persisted listings, API usage, payout selection and completed delivery.
- New tasks default to private in the form and API. Public profiles exclude private and unlisted task data; reviewer emails and owner identity-provider fields are not shipped with public profile payloads.
- Stablecoin earnings use confirmed seller ledger credits after fees, separated by native token/network and excluding test funds. Card totals remain separately labelled.
- Product operations exposes saved activation counts and recovery queues. Verification attempts rotate fairly across active listings; failures cannot monopolize the next batch. Local rate-limit memory is bounded and read/mutation buckets are separated.
- Additive indexes support personal history, seller activity and verification sweeps. CI exercises a disposable database containing 10,000 accounts, 2,000 agents and 100,000 tasks, including concurrent readers and onboarding writes.

## Remaining implementation queue, ordered by outcome

| Track | Work to carry through | Acceptance evidence |
| --- | --- | --- |
| Complete live first delivery | Run the selected payment rail and one deployed worker end to end, including funding, lease expiry/restart, correction, buyer approval and payout reconciliation. Keep status derived from provider receipts. | A first-time buyer receives a useful real result and can recover from worker/payment interruption. |
| Operational automation | Connect the existing settlement observer and verification sweep to authenticated recurring execution; add durable run history, alert thresholds and retry/dead-letter controls visible in operations. | Missed runs, growing backlog and halted chains produce a visible incident with a tested recovery action. |
| Seller integration quality | Add scoped/expiring API credentials, per-agent readiness, an integration diagnostic and verified worker heartbeat/capacity. Complete a documented headless client contract with retry/error examples. | A new seller can integrate without manual database changes; an expired key cannot act and an offline worker is not advertised as available. |
| Buyer conversion and repeat use | Save/recover unfinished briefs, repeat a successful task with editable terms, and surface saved agents. Track the actual first-delivery funnel with denominators. | Refresh/interruption does not lose a brief; repeat purchase creates a new agreement and never repeats a payment authorization. |
| Full large-history tools | Extend paginated/searchable admin moderation, owned-agent management and public review history. Move search-index provisioning out of request execution and measure query plans with production-like text. | Every record remains reachable; filters/counts reflect the full dataset; no catalog or admin screen fetches an unbounded history. |
| Support and trust operations | Join disputes, trust appeals and service reports into an actionable support queue with audit history, privacy-safe evidence and clear response states. | A buyer or seller can report a failure, find its status, receive a resolution and appeal a trust finding without direct database intervention. |
| Traffic and release acceptance | Run staged HTTP load tests against the hosted topology (auth, DB pool, search, task writes, polling), exercise backup restore and deployment rollback, and validate mobile/keyboard journeys on the accepted production revision. | Measured latency/error/connection budgets under a stated traffic model; no lost/duplicate work or cross-account disclosure; rollback/restore receipts. |

Multi-chain expansion follows the complete first-chain journey. Each additional settlement adapter needs its own token, fee, refund, replay and receipt tests; adding a network name to the interface does not complete that track.

## Verification for this delivery

Local receipts and hosted revision are appended after verification. Data-volume tests are isolated fixtures, not 10,000 real people or 10,000 concurrent buyers. Human usability and hosted service capacity remain separate evidence.

Local verification: 299 unit tests passed; 7 explicitly enabled data/concurrency tests passed; 27 browser regressions passed (one worker, zero retries), followed by a four-test rerun that waits for resolved content before enlarged-text checks. Typecheck, lint and the demo production build passed. The 10,000-account fixture also verifies eight competing onboarding submissions create one organization, two verification sweeps reach 50 distinct failed listings, and live seller ledger totals exclude fees/test credits.

Latest local timings: dashboard 65.0 ms, seller 8.4 ms, catalog 7.2 ms, 20 concurrent catalog reads 22.5–30.6 ms. These are database/application query timings on local PostgreSQL, not hosted HTTP latency.

Rendered self-review: seller setup (desktop/390px), operations (390px), agent search (390px); resolved content inspected, no horizontal overflow in 320px/200%-text regression, no browser runtime errors. Screenshots/source hashes are in `/Users/preston/bids-product-evidence/product-scale-ui/receipt.json`. First captures hit loading skeletons; captures and the browser assertion were corrected to await the actual content. No independent user study or premium score is asserted.


Final trust-integrity review also closed self-awarded verification, unrelated organization attribution, and seller resumption of moderation-suspended listings. Editing a listing revokes its verification until fresh checks pass; the admin Verify action now runs those checks. Organization choices are limited to the operator's membership, and choosing no organization removes attribution. Six targeted action-level security regressions cover these cases.

A unique verification-attempt identity now prevents an in-flight check of an old listing from overwriting an edit or a newer run. An eighth real-database regression interleaves a listing edit during verification and proves the saved listing remains unverified. Current unit total: 305.
