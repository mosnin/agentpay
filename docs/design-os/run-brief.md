# Bids product refinement — 2026-09-06

Mode: product_refinement. Authority: user requested whole-product improvements for humans and agents. Local implementation, testing, and review artifacts authorized. No production deployment, real charges, user messaging, or production database changes performed.

Scope: public discovery, sign-in recovery, human hiring and delivery review, seller integration setup, machine-readable workflow, truthful payment model, launch sequence. Base: PR #17 / 668a1d8. Preserve its actor authorization and schema validation improvements. Existing live main is 052749e.

## Evidence and uncertainty
- Direct: production browser audit 2026-09-06, desktop 1440×1000 and mobile 390×844; auth blocked by CSP; public catalog empty; health good. Artifacts retained at /tmp/bids-audit-20260906.
- Direct: main builds and 92 unit tests pass; isolated local reproduction of nonparticipant acceptance and validation bypass.
- Direct: Vercel PR #17 preview log fails for missing Agent.verificationStatus; GitHub CI passed on its head. PR claims beyond inspected source and CI remain unverified until our regression run.
- Inference: people need outcome/cost/next actor before protocol details. Agent clients need authenticated transitions, stable errors, discovery, validation feedback and truthful settlement status.
- Unknown: target customer demand, actual seller reliability, representative usability, legal/payment-provider operating model, production secrets/configuration. No fabricated personas, conversion rates or satisfaction scores.

## Critical journeys and acceptance
1. Human: discover → profile → brief/price → request → seller accepts → delivers → validation → buyer approval → simulated receipt. Terms before commitment; no false execution/charge claims.
2. Seller: list → configure key/runtime → accept/submit → correct invalid output → await buyer → receipt. Listing alone never implies an executing service.
3. Agent client: discover capabilities → authenticate → create/read → role-allowed action → validation feedback → buyer approval. Session and bearer API remain compatible.
4. Recovery: empty catalog has onboarding action; filters have reset; unavailable authentication has retry; invalid output cannot be approved; cancelled/disputed states remain clear.

## Priority and strategy
Blockers precede visual polish: authentication, permissions, truthful commitments, recoverable delivery, then cohesive hierarchy. Start a controlled pilot with a few working sellers; keep all settlement simulated until a provider-backed flow and refunds are verified. No theme rewrite, new billing provider, or pretend automated agent runner.

## Linear gates (initial; see verification.md for final evidence)
0 pass — scope and authority explicit.
1 pass — task failures directly observed.
2 conditional — behavioral hypotheses; no representative user study.
3 conditional — testable task success; commercial value unvalidated.
4 pass — trust and next-action clarity govern decisions.
5 pass — four critical vertical journeys above.
6 pass — distinct buyer/seller/runtime roles, recovery paths and deferred live funds.
7 pass — Marketplace, Tasks, Seller studio, Developer API; shared task object.
8 pass — progressive technical detail and actor-specific decisions planned.
9 pass — simulation and approval consequences before commitment.
10 pass — no urgency, fake earnings, fake activity, coercion or rewards.
11 conditional — visual-plan.md resolved; rendering must verify.
12 conditional — existing semantic tokens and accessible primitives reused.
13 conditional — keyboard/reflow/reduced-motion checks planned; screen-reader study unknown.
14 conditional — truthful capability contract; production provider not integrated.
15 conditional — empty/loading/error/recovery implementations to verify.
16 conditional — build, browser, lifecycle and regression evidence pending.
17 conditional — local review candidate only; deployment and user evidence outstanding.

Baseline verdict: not_ready. UI numerical baseline unavailable: no valid historical authorship/typography manifest and insufficient representative evidence; do not invent a rating. Product hard blockers are independently sufficient. Source system: /Users/preston/Documents/Codex/2026-09-06/dev-os-kernel-fixes/design-os.

## Final gate disposition
0–10: scope, roles, journey and trust decisions implemented locally; gates 2–3 remain conditional on representative behavioral/commercial evidence. 11–12: source and rendered self-review complete for listed surfaces. 13: bounded keyboard, responsive and reduced-motion evidence; full accessibility review open. 14: truthful machine capability and payment contracts implemented; external worker/provider acceptance open. 15–16: bounded functional recovery and regression evidence recorded in verification.md. 17: local review candidate only; production not_ready. No numerical rating or independent-review claim.
