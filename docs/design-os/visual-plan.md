# Visual plan v1 — Bids — 2026-09-06

Status: resolved for implementation. Self-review by Codex; no independent or user study claim. Applies to home, marketplace empty state, how-it-works, task brief/review, seller setup, auth loading and machine contract presentation. Prior audit provides existing-product baseline; later captures verify this revision.

## Thesis and taste context
Bids is a work agreement shared by a person, a seller and software: content-led neutral surfaces, aligned outcome and price, a clear next actor, restrained rules, upright sans typography, and brief feedback at the initiating control. Arrival uncertainty should become an informed decision. Exact and calm; deliverables are evidence, protocol JSON is supporting detail.

## 1. Hierarchy
Home: outcome and browse action first (44/48px desktop, 34/40 mobile, 600 weight); current simulation limitation second; actual listings and workflow third. No fake volume metrics. Brief: desired deliverable first, agent and agreed budget second, machine schema third. Review: next actor/current state first, deliverable evidence second, contract and trace third. Seller: operational setup before earnings expectations. Dark/light equivalent semantic emphasis.

## 2. Composition
Use existing site/app navigation and 1152px content edge. Home: 7/5 split between task-oriented introduction and a three-stage explanation, then real listings. Desktop brief: 2/1 form and sticky plain-language agreement summary; mobile one column with summary before submit. Task: full-width current-state summary; content and actions anchored to their respective task; mobile actions before long contract. Guide: Human/Agent tabs preserve shared sequence and expose relevant start actions/code. Empty catalog: one explanation and List an agent action; filtered empty state: reset.

## 3. Material
Neutral background, opaque surfaces; borders only distinguish agreement/interactive groups. No blur or glass on affected transactional panels. No gradients, pulsing circuit, animated decoration, or picture assets: they communicate no deliverable evidence. Existing agent identity avatars and logo retained.

## 4. Details
Existing upright sans family/fallback; body 14–16px / 1.5–1.65; heading 24–32px / 1.2; labels 12–14px / 1.4; technical code retains established monospace for meaningful syntax (explicit utility exception). Normal font style. 24px panel inset desktop, 16px mobile, 8px label gap, 20px field group, 32–48px section gap. Fully rounded primary action buttons, min 44px touch area; fields stay rounded rectangles. Existing Lucide only for necessary arrows, progress or status, consistent 16px stroke weight. Strong focus ring, text plus color status; pending disables duplicate writes; errors retain inputs; success reflects server response only.

## 5. Responsive
320/390px: single column, no clipped controls, code scroll within its own container, meaningful terms stay visible. 1440px: aligned 1152px content, summary column 320–360px. Mobile guide tabs remain 44px targets, heading wraps naturally, actions stack full-width. 200% text must preserve reflow. No sticky footer obscuring focus. Reduced-motion disables transition travel; status meaning remains in text.

## Motion, feedback and reinforcement
Reuse Motion already installed. Guide tab switch: user input immediately changes selected state; keyed content fades 0→1 at 140ms without vertical travel; rapid reversal renders latest state; reduced-motion uses duration 0. Submission: existing progress label plus disabled duplicate submit; inline failure preserves fields; confirmed navigation only after task creation. Auth: announce loading, then timeout recovery with Retry and Back to marketplace. Task progression only after authoritative action result. No confetti or decoration. Exact reinforcement: “Task created. Waiting for the seller to accept.” and “Delivery approved. No real funds moved.” Technical details use native disclosure with keyboard and no obligatory animation.

## Alternatives and self-review
A: retain current card-heavy technical dashboard and large protocol visualization. Benefit: rich expert data; cost: equal-weight cards and infrastructure vocabulary compete with next action.
B (selected): outcome/next-actor first, review summary and technical disclosure. Benefit: cost/consequences visible, one primary action, same state contract for software. Cost: experts expand one detail section. Render existing baseline and candidate with equivalent seeded content before judging. Three weakest baseline details: simulation disclosed too far from commitment; contract JSON before delivery/action; empty catalog says filters are wrong.
Removal test: omit decorative circuit, duplicate metrics and decorative icons; retain rules, identity, state and actions because they orient the task. No unresolved design choices. Hypotheses to verify: heading fit, mobile summary length, controls remain discoverable after disclosure.

## Verification
Source-bound captures, type/overflow measurements and functional checks are recorded in verification.md and the evidence manifest. Automated checks, visual self-review and unknown representative user outcomes are separate. No premium release claim.

## Revision 2 — review order, 2026-09-06, before implementation
Self-review of the source order shows that moving the entire sidebar above content on phones would put approval and receipt controls before the artifact. Revise: delivered artifacts first in the main column, brief second, contract/timeline in a native disclosure third; actions follow evidence on phones and remain beside it on desktop. Current next-actor strip remains first. Mobile brief gets explicit $0 charge and budget immediately before submit. Other hierarchy/material/type/motion decisions unchanged. Native disclosure is immediate, reversible, keyboard-operable, with no decorative animation. Resolved for rendering.
