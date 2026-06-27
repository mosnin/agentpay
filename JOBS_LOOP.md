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

**Step 47 — PR template.**
Add `.github/pull_request_template.md` with a concise structure (Summary, Changes, and a Testing
checklist for typecheck / lint / test / build) so contributions are described consistently and
reviewers can verify the gates. Bounded to one file. Verify (test + tsc/lint), commit, push.

> Note: remaining untested logic (`reputation.ts`, `payments.ts`, `auth.ts`) is DB-bound — it would
> need integration tests against Postgres rather than unit tests; deferred to keep the loop low-risk.

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
- **Iteration 20 (09:14 UTC) — Branded favicon (+ robust OG mark).**
  Replaced the default favicon with a CSS-drawn diamond in the brand tint via `app/icon.tsx`, and
  swapped the OG image's glyph mark for the same CSS diamond — eliminating a `next/og` dynamic-font
  fetch that failed for the ◆ glyph. `app/icon.tsx` + `opengraph-image.tsx`. tsc/build ✓ (no warning).
- **Iteration 21 (09:18 UTC) — Installable + themed mobile chrome.**
  Added `app/manifest.ts` (standalone, dark `#0a0a0b` theme, branded `/icon`) and a `viewport`
  themeColor in the root layout, so the app is installable and mobile browser chrome matches the dark
  theme. Build emits `/manifest.webmanifest`. tsc/lint/build ✓.
- **Iteration 22 (09:22 UTC) — Close the loop: "Hire again" on completed tasks.**
  Completed task pages now show a "What's next" sidebar card with "Hire <agent> again" (prefilled
  deep-link) and "Browse the marketplace", so finishing a task restarts the discover→hire loop.
  `app/tasks/[id]/page.tsx`. tsc/lint/build ✓.
- **Iteration 23 (09:26 UTC) — Recently viewed agents.**
  Added a localStorage-backed recents: an invisible recorder on the profile (`RecordRecentAgent`) and a
  hydration-safe "Recently viewed" rail on the marketplace (`RecentlyViewed`), so buyers can jump back
  to agents they were comparing. `components/agents/recently-viewed.tsx` + profile + marketplace. ✓.
- **Iteration 24 (09:30 UTC) — Active filter chips.**
  Below the marketplace filter bar, each active filter (search, category, pricing, rating, verified)
  now shows as a removable chip whose ✕ drops just that param (others + sort preserved) — per-filter
  control alongside "Clear filters". `app/marketplace/page.tsx`. tsc/lint/build ✓.
- **Iteration 25 (09:34 UTC) — Consistent entrance motion on similar-agents.**
  The profile's "Similar agents" rail now uses the same `motion-safe` staggered fade/rise as the
  marketplace grid (via AgentCard's `className`/`style`), so the two agent grids feel consistent.
  `app/agents/[id]/page.tsx`. tsc/lint/build ✓.
- **Iteration 26 (09:38 UTC) — Actionable dashboard metrics.**
  Added an optional `href` to the shared `MetricCard` (wraps in a Link with a hover border when set,
  backward-compatible) and linked the seller-side metrics — Total earnings, Agents owned, Average
  reputation — to `/seller`. `metric-card.tsx` + dashboard. tsc/lint/build ✓.
- **Iteration 27 (09:42 UTC) — Consistent, actionable dashboard empty states.**
  `recent-payments-card` ("Commission an agent") and `reputation-feed` ("List an agent") now have the
  same actionable empty-state CTA treatment as the recent-tasks card, so an empty dashboard guides the
  next move everywhere. tsc/lint/build ✓.
- **Iteration 28 (09:46 UTC) — Visible keyboard focus on list rows.**
  Added consistent `focus-visible:ring` to the interactive row links in the dashboard cards
  (recent-tasks, recent-payments, needs-attention), which previously relied on the browser default
  outline — so keyboard focus is clearly visible. tsc/lint/build ✓.
- **Iteration 29 (09:50 UTC) — Smooth hover on mobile nav links.**
  Added `transition-colors` to the mobile Sheet nav links in `top-nav` and `landing-nav`, so their
  hover eases like the desktop links instead of snapping. tsc/lint/build ✓.
- **Iteration 30 (09:54 UTC) — Completed the keyboard-focus pass.**
  Added `focus-visible:ring` to the remaining raw link rows — the agent profile's "Recent tasks" title
  and arrow links, and the artifact URL link — so keyboard focus is visible app-wide.
  `components/agents/recent-tasks.tsx` + `components/tasks/artifact-card.tsx`. tsc/lint/build ✓.
- **Iteration 31 (09:58 UTC) — Tokenized the code surface.**
  Added a `code` color to the Tailwind config and replaced the repeated magic hex `bg-[#0a0c11]`
  across `json-viewer`, `endpoint-metadata`, `artifact-card`, and the developers page with `bg-code` —
  one source of truth for the JSON/code surface. tsc/lint/build ✓.
- **Iteration 32 (10:02 UTC) — Badge consistency: warning variant.**
  Added a subtle `warning` variant to the shared `Badge` (using the `--warning` token) and replaced the
  hand-rolled amber "required" pill in `mcp-tools` with it, so parameter pills share one Badge
  shape/size. `components/ui/badge.tsx` + `components/agents/mcp-tools.tsx`. tsc/lint/build ✓.
- **Iteration 33 (10:06 UTC) — Badge consistency: payment-mode pill.**
  Replaced the hand-rolled payment-mode pill in `task-contract-preview` with `<Badge variant="secondary">`,
  matching the other badges' shape/size. tsc/lint/build ✓.
- **Iteration 34 (10:10 UTC) — Badge consistency: admin flag pill.**
  Switched the admin "flagged task" badge from raw amber overrides to the token-backed
  `<Badge variant="warning">`, completing the badge-consistency sweep (mcp required → payment mode →
  admin flag). `app/admin/admin-tabs.tsx`. tsc/lint/build ✓.
- **Iteration 35 (10:14 UTC) — Synced the README.**
  Added a "Highlights" section documenting the post-MVP enhancements (⌘K, frictionless hiring,
  run-demo, needs-attention, similar / recently-viewed, OG/sitemap/manifest, a11y/craft) and linked
  `JOBS_LOOP.md`, so the docs match the app. `README.md` (docs-only). tsc/lint ✓.
- **Iteration 36 (10:18 UTC) — Clarified NEXT_PUBLIC_APP_URL.**
  The var was present but documented only as "developer docs examples"; updated the comment to reflect
  its real role — metadataBase for OG/Twitter, sitemap, robots, manifest, and canonical URLs; set to
  the deployed origin in production. `.env.example`. tsc/lint ✓.
- **Iteration 37 (10:22 UTC) — docker-compose for local Postgres.**
  Added `docker-compose.yml` (postgres:16, db `agentmarket`, healthcheck, named volume) matching the
  default `DATABASE_URL`, and pointed the README at `docker compose up -d` — the docs referenced compose
  but no file existed. `docker-compose.yml` + `README.md`. yaml/tsc/lint ✓.
- **Iteration 38 (10:26 UTC) — Continuous integration.**
  Added `.github/workflows/ci.yml`: on push/PR, a `postgres:16` service + `npm ci` (postinstall prisma
  generate) → `db:push` → `db:seed` → `typecheck` → `lint` → `build`, mirroring the loop's local gates.
  Lockfile confirmed in sync, so `npm ci` is reliable. yaml/tsc/lint ✓.
- **Iteration 39 (10:30 UTC) — Pin Node + CI badge.**
  Added `.nvmrc` (node 20) so local/CI Node versions match, and a CI status badge atop the README
  linking to the workflow. `.nvmrc` + `README.md`. tsc/lint ✓.
- **Iteration 40 (10:34 UTC) — Editor consistency: .editorconfig.**
  Added a root `.editorconfig` (UTF-8, LF, 2-space indent, trim trailing whitespace, final newline;
  trailing whitespace preserved in Markdown) for consistent formatting across editors. tsc/lint ✓.
- **Iteration 41 (10:46 UTC) — Test suite (Vitest).**
  Added Vitest + a `test` script and 15 unit tests for the pure deterministic logic (`lib/utils`
  formatters/slug/hash/clamp/mockHash and `lib/mockValidation` scoring + verdict), and wired
  `npm run test` into CI. `vitest.config.ts` + `lib/__tests__/*` + `package.json` + `ci.yml`. 15/15
  pass; tsc/lint/build ✓.
- **Iteration 42 (10:50 UTC) — Expanded test coverage.**
  Added tests for the x402 adapter (requirement defaults + deterministic nonce/receipt, verify rules,
  isLive), the A2A adapter (getAgentCard mapping, parseArtifactMessage defaults, task envelope), and
  the contract generator (title, category schema, constraints, empty input). 29 tests / 5 files pass.
  tsc/lint/build ✓.
- **Iteration 43 (10:54 UTC) — MCP adapter tests.**
  Added tests for `lib/interop/mcpAdapter.ts`: `listToolsForAgent` (one snake_cased tool per
  capability, well-formed schema, deterministic) and `validateMcpServer` (missing / invalid / https /
  unsupported-protocol verdicts). 35 tests / 6 files pass. tsc/lint ✓.
- **Iteration 44 (10:58 UTC) — Zod schema tests.**
  Added tests for `lib/schemas.ts` (create-agent, create-task, review, submit-artifact, dispute, and
  the API create-task schema): valid payloads parse with defaults applied; invalid ones fail (short
  fields, empty capabilities, bad URL/enum, out-of-range/non-integer rating, coercion). 46 tests /
  7 files pass. tsc/lint ✓.
- **Iteration 45 (11:02 UTC) — Automated dependency updates.**
  Added `.github/dependabot.yml` (npm + github-actions, weekly, minor/patch grouped, PR limit 5) so
  dependencies and CI action versions stay current with minimal noise. yaml/tsc/lint ✓.
- **Iteration 46 (11:06 UTC) — Config integrity tests.**
  Added `lib/__tests__/config.test.ts`: option lists (categories/pricing/payment/visibility/sort) are
  unique + well-formed, `CATEGORY_VALUES` mirrors `CATEGORIES`, every status-config entry has
  label/class/dot, every lifecycle status has a config, `getStatusConfig` fallback works, and nav
  hrefs are rooted + unique. 54 tests / 8 files pass. tsc/lint ✓.

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
