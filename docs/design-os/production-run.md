# Working product continuation — 2026-09-06

User correction: completion means a working product, not a polished simulation. Previous mocks are legacy test behavior, not the target architecture.

Scope: provider-backed funding and seller transfers, hosted seller onboarding, signed funding/refund events, recoverable payment operations, an executing worker with actual user-input processing, production configuration guards, and human/agent paths through the same lifecycle. Card payments first is the current assumption while the optional payment-method question remains open.

Funds flow: Stripe Checkout on the platform, separate transfer to the connected seller after buyer approval. This preserves the explicit review point; destination charges would transfer at initial funding. No claims of regulated escrow. Platform fees/negative balances/refunds must be configured and acknowledged by the account owner before launch. No funds or seller accounts will be created live automatically in this development turn.

Design plan extension (before UI changes): hierarchy remains outcome → budget → funding → delivery → approval → receipt. Composition reuses the agreement sidebar and task action panel, with a funding button before seller actions and payout onboarding in seller setup. Neutral materials and existing typography remain. Details show actual funding/transfer/refund state, test-provider mode when applicable, and actionable failures. Mobile stacks funding and delivery actions, with charge amount before redirect. Pending controls prevent double clicks; transitions follow provider/server responses. No added animation; use existing button progress and reduced-motion behavior.

Acceptance: authenticated buyer funds exact task amount; only funded tasks can start; seller executes actual input and submits; invalid output blocks approval; valid output still needs buyer approval; provider transfer/refund results govern receipt; duplicate requests/events do not double transfer; absent credentials fail clearly. Provider-backed test evidence is distinct from mocked API contract tests and live-money proof.

Current external facts: Vercel agentpay has Clerk/Postgres configuration, no Stripe/x402/worker provider secrets. Stripe account connection and seller activation remain prerequisites for live proof. Preserve the preceding tested commit ffeb1ef.
