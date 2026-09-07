# Product growth implementation — September 7, 2026

Mode: product_refinement. Baseline: 3815610, mosnin/agentpay. User authorizes implementation, tests and review preview updates. Objective: usable human and agent journeys with 10,000 registered accounts. This does not mean 10,000 concurrent requests or prove acquisition.

## Findings and planned repairs

Observed in source: unbounded public API/catalog selectors and seller reads; dashboard chart reads global task activity; seller review statistics use only the last ten reviews; onboarding can create duplicate organizations and detach existing membership; recurring verification can repeatedly select failed agents and starve the remainder. These cause privacy, latency, continuity and operational failures.

Repair scope: bounded listing contracts and deterministic sorting; remote agent picker; aggregate user-scoped dashboard/seller statistics; persisted buyer/seller setup evidence; atomic retry-safe onboarding; fair verification batches; admin operations/activation metrics with actionable queues. Preserve payment state machines and trust methodology.

## Visual plan v1 — resolved before implementation, self-review

Hierarchy: dashboard first shows the next useful setup action until a first delivery, then attention/work. Seller setup puts completed and remaining steps above its performance lists. Operations prioritizes overdue/stuck work, then measured adoption. Search places query and current selection above results. Other metrics remain quiet.

Composition: keep existing AppShell, navigation, content edges and spacing. Use a compact ordered setup list with status text and anchored links; no additional equal-weight metric card grid. Operations uses a definition list plus a bounded exception table. Search replaces the long select inside the current form and keeps its label and error anchor. Alternative: another modal wizard; rejected because returning users need persistent progress without an interruption.

Material: existing opaque neutral background and semantic borders. No blur, gradients, new graphics or ornamental containers. Dividers separate work and evidence.

Details: inherited upright sans; section title 20px/600, body 14px/normal with relaxed leading, secondary 12–14px; 24px vertical sections, 12–16px row spacing; current fully rounded 44px-minimum buttons. Completed steps say what was saved; a stored key or wallet never implies a live worker or payout. Focus remains visible; pending search announced with role=status; errors preserve selection/query and offer retry. Result buttons include name, category and price.

Responsive: at 320/390px setup rows stack copy and action, operations rows wrap within viewport; desktop rows align copy and actions. No new horizontal scrolling. At 200% text no fixed-height text containers. Search results bounded in count, natural height. Keyboard uses input then standard buttons (no incomplete combobox ARIA). Reduced motion uses existing button tokens; state changes are immediate, with no entrance animation or celebratory effect.

## Acceptance and gates

0 scope pass; 1 observed defects pass; 2 user-outcome hypotheses conditional (no user study); 3 measurable privacy/bounds/completion pass; 4 existing trust/product strategy pass; 5 scope pass; 6 lifecycle continuity pass; 7 existing IA pass; 8 progressive detail pass; 9 consequences pass; 10 no fabricated progress pass; 11–13 visual/responsive/feedback plan resolved, rendered verification pending; 14 API contract tests pending; 15 errors/recovery tests pending; 16 regression and 10,000-account query exercise pending; 17 release candidate pending evidence. No numerical premium score asserted without representative user evidence.

## Verified outcome

11–13: rendered self-review and mobile/enlarged-text/reduced-motion regressions pass; no premium score or representative-user claim. 14–16: API pagination, interruption/error recovery, privacy and concurrency checks pass; 299 unit, 7 explicit scale and 27 browser cases pass. 17: release candidate only; production/provider acceptance remains open. See `../architecture/product-to-10000.md` for the owned continuation queue and exact evidence boundaries.

Additional observed privacy repair: public agent profiles previously included every task regardless of visibility and full owner/reviewer user fields. Public data projections now exclude private/unlisted work and identity/contact fields, new form/API requests default to private, and a streamed-HTML regression verifies secrets from both private and unlisted fixtures are absent. The existing profile composition is retained.


Trust repair extension: removed the seller's self-verification switch from the existing listing form and replaced it with a factual sentence in the same settings area. Existing typography, surfaces, spacing and responsive form columns are retained; the removed toggle needs no animation. Organization selection now contains only the current membership. These are trust/authorization corrections; public verification must be backed by the verification program, including when an admin initiates it.
