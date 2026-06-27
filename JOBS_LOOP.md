# Agent Market — "Think Like Steve Jobs" Improvement Loop

**Cron job:** `8937b25b` · every 1 min (scheduler floor — sub-minute/15s isn't expressible) · **window** 2026-06-27 07:56 → **19:56 UTC** (epoch `1782590176`, 12h)

> Note: the in-session cron is reported `[session-only]` in this sandbox (the `durable` flag isn't
> honored), so it only advances while the session is awake. Iterations are therefore also run live.
> The state below is the source of truth and is committed each iteration.

This file is the running state of an autonomous self-improvement loop. Each iteration: read
**▶ Next step**, execute it, verify (`tsc` + `lint` + `build`), commit & push to
`claude/nifty-keller-7lmbih`, then log it and write the next step. The loop deletes its own cron at
the deadline. One bounded, verified improvement per iteration — never a broken build.

---

## The Jobs lens (how every step is judged)

1. **Focus.** Perfect the core loop — discover → hire → verify → pay → reputation. Say no to the rest.
2. **Ruthless simplicity.** Remove steps and decisions. One obvious primary action per screen.
3. **Sensible defaults — "it just works."** Answer questions the user shouldn't have to.
4. **Craft is the product.** Micro-interactions, motion, copy, empty states.
5. **Start from the experience.** Design the *feeling* of hiring an agent; work back to the tech.
6. **Integrated & seamless.** Flows connect; context carries through; ⌘K reaches everything.
7. **Delight / "one more thing."** A signature moment that makes it memorable.

---

## ▶ Next step

**Step 20 — Branded favicon.**
Replace the default favicon with a branded mark via `app/icon.tsx` (`next/og` `ImageResponse`) — the
◆ glyph in the indigo brand tint on the near-black background — so the browser tab matches the app's
identity. Bounded to one file. Verify (tsc/lint/build), commit, push.

---

## ✅ Log

- **Iteration 1 (06:33 UTC) — Frictionless hire: smart budget default.**
  Budget now prefills from the selected agent's starting price and re-syncs on agent change (without
  clobbering a typed value), with a "Suggested $X" hint. `create-task-form.tsx`. tsc/lint/build ✓.
- **Iteration 2 (07:56 UTC) — Obvious task lifecycle.**
  Added a status-aware "what happens next" line at the top of the task actions panel (pending →
  "Waiting for the agent to accept…", submitted → "Run validation… then complete", etc.) so the next
  move is never ambiguous. `components/tasks/task-actions.tsx`. tsc/lint/build ✓.
- **Iteration 3 (07:56 UTC) — Sensible default deadline.**
  The new-task form now defaults the deadline to a week out (editable, with a hint) instead of empty,
  so a hired task lands ready to submit. `create-task-form.tsx`. tsc/lint/build ✓.
- **Iteration 4 (08:05 UTC) — ⌘K jumps to agents.**
  The command palette now lazily fetches `/api/agents` on first open and lists every agent (search by
  name / category / capability); Enter jumps straight to its profile, alongside Pages and Categories.
  Delivers on the "Search agents…" promise. `components/layout/search-command.tsx`. tsc/lint/build ✓.
- **Iteration 5 (08:10 UTC) — Dashboard "Needs your attention".**
  Pinned a section atop `/dashboard` surfacing tasks awaiting the operator's own move — submitted →
  run validation, validating → complete & release, completed-unreviewed → leave a review — each
  linking through with the next action named. `getDashboardData` slice + `needs-attention.tsx`.
  tsc/lint/build ✓.
- **Iteration 6 (08:16 UTC) — "Similar agents" rail.**
  (The planned marketplace empty-state already existed — verified, so shipped the next item.) Added a
  "More <category> agents" rail at the bottom of the profile — top same-category peers by reputation,
  reusing the marketplace card — so discovery keeps flowing instead of dead-ending. `getSimilarAgents`
  + profile section. tsc/lint/build ✓.
- **Iteration 7 (08:20 UTC) — Hire pre-fills a starter brief.**
  Arriving via "Hire this agent" now seeds a capability-based starter title and a tailored objective
  prompt (e.g. "Describe what you want Growth Research Agent to deliver for lead research…"), so the
  brief is ~80% there. Enriched `getAgentSelectOptions` with the primary capability.
  `queries.ts` + `create-task-form.tsx`. tsc/lint/build ✓.
- **Iteration 8 (08:24 UTC) — "Run demo" auto-completes a task.**
  Added a `simulateTask` server action that advances an active task through the full happy path
  (accept → start → submit artifact → validate → complete → release payment) by reusing the real
  transitions, surfaced as a dashed "Run demo — auto-complete" button on the task page — so new users
  watch the core loop resolve in seconds. `lib/actions/tasks.ts` + `task-actions.tsx`. tsc/lint/build ✓
  (verify caught a control-flow type error first; fixed before commit).
- **Iteration 9 (08:28 UTC) — Trust at a glance.**
  The marketplace card already showed reputation, rating, completion, latency, and verified; added the
  two missing signals — dispute rate and schema compliance — as an accessible breakdown on the
  reputation score (title + aria-label), keeping the card uncluttered. `agent-card.tsx`. tsc/lint/build ✓.
- **Iteration 10 (08:33 UTC) — Frictionless-hire finish: autofocus the brief.**
  Copy across empty states/CTAs was already confident (per audits), so instead of churning it, shipped
  a higher-value "it just works" touch: the new-task form autofocuses the objective field — the one
  thing left to write after Hire pre-fills the rest — so you can start typing immediately.
  `create-task-form.tsx`. tsc/lint/build ✓.
- **Iteration 11 (08:38 UTC) — Motion & life on the marketplace.**
  Marketplace cards now enter with a subtle staggered fade + rise (tailwindcss-animate, `motion-safe`
  so reduced-motion users opt out; per-card delay capped). Animates the inner card only, so the Link
  grid items keep equal heights. `agent-card.tsx` (+ optional `style` prop) + `marketplace/page.tsx`.
  tsc/lint/build ✓.
- **Iteration 12 (08:42 UTC) — First-run onboarding nudge.**
  A brand-new operator (no tasks, no owned agents) now sees a "Welcome to Agent Market" get-started
  card atop the dashboard with the two first moves — hire an agent / list your own — instead of a wall
  of empty cards. Detected from existing stats; disappears once active. `get-started.tsx` + dashboard.
  tsc/lint/build ✓.
- **Iteration 13 (08:46 UTC) — Keyboard polish on create-agent.**
  The create-agent form now autofocuses the agent-name field, matching the new-task form, so listing
  an agent starts immediately on arrival. `create-agent-form.tsx`. tsc/lint/build ✓.
- **Iteration 14 (08:50 UTC) — Sticky Hire bar on mobile profiles.**
  Added a floating "Hire" pill (sticky bottom, `lg:hidden`) on the agent profile with the agent's name
  + starting price, so on long profiles the primary action stays one tap away. Reuses the hire
  deep-link and scrolls away cleanly at the page end. `app/agents/[id]/page.tsx`. tsc/lint/build ✓.
- **Iteration 15 (08:54 UTC) — Clear filters anytime.**
  The marketplace now shows a "Clear filters" link beside the results count whenever any
  search/filter/non-default sort is active (previously only on the zero-results state), so buyers can
  reset without hunting. `app/marketplace/page.tsx`. tsc/lint/build ✓.
- **Iteration 16 (08:58 UTC) — Accessibility: skip-to-content.**
  Both shells now render a "Skip to content" link (hidden until focused) that jumps to a focusable
  `#main` landmark, so keyboard/screen-reader users can bypass the nav. `app-shell.tsx` +
  `site-shell.tsx`. tsc/lint/build ✓.
- **Iteration 17 (09:02 UTC) — Shareable agent listings (OpenGraph).**
  Added site-wide OpenGraph + Twitter-card defaults in the root layout, and agent-specific OG/Twitter
  (title, description, canonical URL) on the profile, so shared links render rich previews. Also fixed
  a double "— Agent Market" in the profile title. `app/layout.tsx` + `app/agents/[id]/page.tsx`. ✓.
- **Iteration 18 (09:06 UTC) — SEO: sitemap + robots.**
  Added `app/sitemap.ts` (home, marketplace, developers + every live agent profile from the DB) and
  `app/robots.ts` (allow public pages; disallow admin/dashboard/seller/api; reference the sitemap), so
  the marketplace is crawlable. Build emits `/sitemap.xml` + `/robots.txt`. tsc/lint/build ✓.
- **Iteration 19 (09:10 UTC) — Branded OG image for agent profiles.**
  Added `app/agents/[id]/opengraph-image.tsx` (`next/og`) rendering a dark 1200×630 branded card with
  the agent's name, description, category, reputation, and a Verified chip — so shared profile links
  show a premium preview image. tsc/lint/build ✓ (route emitted).

---

## 🗂 Backlog (prioritized — pull from here or generate better)

1. **⌘K command palette** that actually jumps — agents, categories, key actions (Create task, Dashboard, List an agent).
2. **Hire scaffolds the brief** — seed a smart starter title/objective from the agent's specialty so the form is ~80% done on arrival.
3. **One-click "Run demo" on a pending task** that auto-advances the lifecycle (accept → start → submit → validate → complete) so agent execution is *visible* in seconds.
4. **Marketplace "Best match" default ordering** + instant sort/filter feedback; empty state that suggests a category (with "Clear filters") instead of dead-ending.
5. **Motion on state transitions** (Framer Motion) — status changes, payment release — so progress feels alive.
6. **Agent profile "Similar agents" rail** to keep discovery flowing after a profile view.
7. **Dashboard "Needs your attention"** pinned to the top: tasks awaiting *your* action (accept, validate, review).
8. **Optimistic UI** on task actions — instant response, reconcile on server confirm.
9. **Copy pass** — tighten every CTA/hint/empty state into confident, human, Jobs-voice language.
10. **Keyboard & focus polish** across dialogs/forms (Enter to submit, Esc to close, autofocus first field).
11. **Reduce.** Audit every screen; cut anything that doesn't earn its place in the core loop.
12. **Trust at a glance** — surface verification, dispute rate, schema-compliance where hiring decisions happen.
