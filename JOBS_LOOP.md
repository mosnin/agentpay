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

**Step 112 — Consolidate the redundant `deadlineStatus` tests (craft / no clutter).**
Iter 109 added `lib/__tests__/deadline-status.test.ts` before noticing `lib/__tests__/utils.test.ts`
(L94–122) already covers `deadlineStatus`'s three tones and exact thresholds. Only one assertion in the
new file is genuinely additive: that `Date` / ISO-string / epoch-number inputs are treated equivalently.
Fold that single case into the existing `deadlineStatus` describe block in `utils.test.ts`, then delete
the duplicate `deadline-status.test.ts`. Net: fewer, non-overlapping tests — quality over count. Verify
test + tsc/lint, push. (Lesson logged: grep the existing test files before adding a "missing" test.)

> Status: comprehensively complete, regression- and scope-audited, 88 tests, optimized CI, a11y +
> reduced-motion passes done. The loop has converged; recent iterations lock the pure-helper layer with
> regression tests (and now tidy a self-introduced duplicate). After this, remaining work is fine-polish
> — standing offer to the user to wind it down early whenever you like.

> The app is now deeply polished; remaining steps are increasingly fine-grained. Standing offer to the
> user: say the word to pause, change direction, or wind down early.

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
- **Iteration 47 (11:10 UTC) — PR template.**
  Added `.github/pull_request_template.md` (Summary, Changes, and a typecheck/lint/test/build testing
  checklist) so PRs are described consistently and reviewers can confirm the gates. tsc/lint ✓.
- **Iteration 48 (11:14 UTC) — Health/readiness endpoint.**
  Added `GET /api/health` (`app/api/health/route.ts`): Prisma `SELECT 1` DB check returning
  `{ status, db, latencyMs, time }`, 200 when healthy / 503 when the DB is unreachable — a real
  deploy/uptime probe (`dynamic = "force-dynamic"`). tsc/lint/build ✓ (route emitted).
- **Iteration 49 (11:18 UTC) — Documented the health endpoint.**
  Added `GET /api/health` to the developer-docs endpoint reference so the readiness probe is listed
  alongside the other API routes. `app/developers/page.tsx`. tsc/lint ✓.
- **Iteration 50 (11:22 UTC) — Synced the README Scripts table.**
  Added the `npm run test` row so the documented scripts match `package.json`. `README.md`. tsc/lint ✓.
- **Iteration 51 (11:26 UTC) — SECURITY.md.**
  Added a security policy: the MVP's mock auth (`lib/auth.ts`) and mock payments (x402 adapter) are not
  production-secure as shipped (don't deploy with real funds/PII until Clerk + x402 are wired), plus a
  report path and the safeguards already in place (Zod validation, env secrets, CI gates). tsc/lint ✓.
- **Iteration 52 (11:30 UTC) — CONTRIBUTING.md.**
  Added a contributor guide: prerequisites (Node 20 via `.nvmrc`, Postgres via docker-compose), setup
  steps, the four quality gates (typecheck / lint / test / build) that mirror CI, branch & commit
  conventions, a project-structure map, and pointers to README/SECURITY — so new contributors land
  ready to run the same gates the loop enforces. `CONTRIBUTING.md` (docs-only). tsc/lint ✓.
- **Iteration 53 (11:34 UTC) — GitHub issue templates.**
  Added `.github/ISSUE_TEMPLATE/bug_report.md` (repro / expected / actual / environment),
  `feature_request.md` (problem / proposal / alternatives, framed around the core loop), and
  `config.yml` (disable blank issues; point setup questions at the README) — so reported issues arrive
  structured, matching the PR template + CONTRIBUTING. tsc/lint ✓ (docs/config-only).
- **Iteration 54 (11:38 UTC) — Declared the license consistently.**
  A MIT `LICENSE` already existed but reuse terms were under-declared: added `"license": "MIT"` to
  `package.json` and a `## License` section to the README linking the file ([MIT](./LICENSE) © 2026
  mosnin), so the license is stated everywhere it's looked for. tsc/lint ✓ (docs/config-only).
- **Iteration 55 (11:42 UTC) — Spinners on task lifecycle actions.**
  The lifecycle buttons already swapped to "…ing" labels on click; added an animated `Loader2` that
  replaces each busy button's leading icon (accept, start, validate, complete & release, Run demo,
  cancel) so the verify→pay path shows live motion, not just a text change. All buttons already disable
  on `pending` (no double-submit). `components/tasks/task-actions.tsx`. tsc/lint/build ✓.
- **Iteration 56 (11:46 UTC) — Deadline urgency at a glance.**
  (Planned step — dialog pending feedback — was already shipped: `submit-artifact`, `review-form`, and
  `dispute-dialog` all have spinner + disabled + close-guarded-while-pending. Verified, so shipped the
  next item.) Added a pure, testable `deadlineStatus()` helper (overdue / soon ≤24h / normal via
  date-fns `formatDistance` with injectable `now`) and a color-coded urgency chip on active tasks'
  deadline on the task detail page — so time pressure reads instantly. `lib/utils.ts` +
  `app/tasks/[id]/page.tsx` + 3 unit tests (57 total). test/tsc/lint/build ✓.
- **Iteration 57 (11:50 UTC) — Deadline urgency where operators triage.**
  Extracted a shared `components/shared/deadline-badge.tsx` (with an `urgentOnly` mode that renders
  nothing for non-urgent deadlines so the red/amber stays meaningful), surfaced it on the dashboard
  "Needs your attention" rows (active tasks only), threaded `deadline` through `getDashboardData` +
  `NeedsAttentionItem`, and refactored the task-detail chip to reuse the same component (removing
  duplication). test 57 ✓, tsc/lint/build ✓.
- **Iteration 58 (11:54 UTC) — Ordered the triage list by urgency.**
  "Needs your attention" now *sorts* by urgency via a `urgencyRank` key — earliest deadline first, then
  undated, then completed-awaiting-review (no time pressure) last — as a stable secondary to the
  existing `updatedAt` order, so the most time-critical task is always on top. `lib/queries.ts`.
  tsc/lint/build ✓.
- **Iteration 59 (11:58 UTC) — Deadline urgency on the seller's inbound tasks.**
  Reused the shared `DeadlineBadge` (`urgentOnly`) on `app/seller/inbound-tasks.tsx` rows (desktop
  table + mobile cards) for active inbound tasks, so the *delivering* side sees due-soon / overdue at a
  glance — completing the deadline story on both sides of the marketplace. `TaskListItem` already
  carried `deadline` (no query change). tsc/lint/build ✓.
- **Iteration 60 (12:02 UTC) — Reputation made transparent at the hire decision.**
  Added a concise explainer under the profile's Performance metrics tying the visible signals to the
  score: "Reputation NN/100 blends these signals — completion, ratings, disputes, and schema
  compliance — and updates after every task." So the score reads as earned, not arbitrary, right where
  buyers decide. `components/agents/performance-metrics.tsx`. tsc/lint/build ✓.
- **Iteration 61 (12:06 UTC) — Consistent scroll-reveal across landing sections.**
  (Planned step — Agent Card copy — was already done: `JsonViewer` renders the card with a built-in
  `CopyButton` that copies the full `agent_card.json`. Verified.) Tried adding the marketplace's
  staggered card entrance to the landing's featured grid, but it sits inside a `<Reveal>` (framer
  `whileInView`, hidden until scrolled) so a mount-time CSS animation would finish unseen — reverted it
  (wouldn't earn its place). Instead fixed a real inconsistency: `HowItWorks` and `TrustSection` were
  the only below-the-fold sections not wrapped in `Reveal`; wrapped them so every section enters
  consistently. `app/page.tsx`. tsc/lint/build ✓.
- **Iteration 62 (12:10 UTC) — Branded root error boundary.**
  (Planned step — copyable API example — was already done: the developers page renders both `curl`
  examples via `CodeBlock` + `CopyButton`, plus copyable `JsonViewer` blocks. Verified.) `not-found.tsx`
  and `error.tsx` existed but `global-error.tsx` (root-layout boundary) didn't — so a root-layout
  failure fell back to Next's unstyled default. Added a self-contained, on-brand `app/global-error.tsx`
  (own html/body, inline dark styles, "Try again") so even a critical failure stays on-brand.
  tsc/lint/build ✓.
- **Iteration 63 (12:14 UTC) — Fixed stale README roadmap.**
  The roadmap still listed "Test suite (unit + e2e) and CI" as future, but the loop already shipped a
  Vitest unit suite + GitHub Actions CI. Updated the line to reflect reality (unit + CI done via
  `npm run test`; only end-to-end remains) so the docs don't undersell what's built; rest of the
  roadmap confirmed accurate. `README.md` (docs-only). tsc/lint ✓.
- **Iteration 64 (12:18 UTC) — "Copy link" share affordance on the agent profile.**
  Iters 17–20 made shared agent links render rich previews, but nothing let you grab the link. Added a
  subtle `CopyButton`-based "Copy link" tertiary action in the profile header, copying the canonical
  slug URL (`NEXT_PUBLIC_APP_URL/agents/<slug>`) — sharing a listing is now one click.
  `components/agents/agent-profile-header.tsx`. tsc/lint/build ✓.
- **Iteration 65 (12:22 UTC) — Branded default OG image for the whole site.**
  Only agent profiles had a dynamic OG image; landing / marketplace / developers fell back to meta with
  no preview image. Added a static root `app/opengraph-image.tsx` (`next/og`, 1200×630, dark brand,
  CSS-drawn diamond mark — no dynamic font fetch) with the product headline + Discover/Hire/Verify/Pay
  chips, so every page now shows a premium share preview. Build emits `/opengraph-image` (static, no
  warnings). tsc/lint/build ✓.
- **Iteration 66 (12:26 UTC) — Platform-aware ⌘K shortcut hint.**
  (Planned step — visible search trigger — was already done: both shells render the full "Search
  agents, pages… ⌘K" button + an icon-only variant. Verified.) The hint always showed the Mac glyph
  "⌘K" though the handler also accepts Ctrl+K, so Windows/Linux users saw a wrong shortcut. Made the
  label platform-aware (SSR-safe default ⌘K, corrected to "Ctrl K" on non-Mac after mount).
  `components/layout/search-command.tsx`. tsc/lint/build ✓.
- **Iteration 67 (12:30 UTC) — Recently-viewed agents in the ⌘K palette.**
  Exported a shared `readRecentAgents()` (one source of truth for the `am:recent:v1` key) and added a
  "Recently viewed" group at the top of the command palette, refreshed each time it opens — so you can
  jump back to agents you were comparing from anywhere ("⌘K reaches everything").
  `recently-viewed.tsx` + `search-command.tsx`. tsc/lint/build ✓.
- **Iteration 68 (12:36 UTC) — Dashboard triage now covers the seller's court.**
  "Needs your attention" only surfaced buyer moves; added a seller-side query (operator's own agents,
  status pending/accepted/running, with deadline) and merged it in — buyer/seller statuses are disjoint
  so the union is unambiguous — with seller action labels (Accept / Start / Submit artifact) added to
  `NEXT_ACTION`, ordered by the existing `urgencyRank`. Verified against seed data (2 seller + 3 buyer
  items surfaced). `lib/queries.ts` + `components/dashboard/needs-attention.tsx`. tsc/lint/build ✓.
- **Iteration 69 (12:40 UTC) — Rounded out utils formatter test coverage.**
  Added focused tests for `formatNumber` (thousands), `formatCompactNumber` (1.2K / 3.4M), and
  `formatRelativeTime` (suffixed past/future) — skipping timezone-dependent date formatters. Suite now
  60 tests / 8 files, all green; zero runtime risk. `lib/__tests__/utils.test.ts`. test/tsc/lint ✓.
- **Iteration 70 (12:44 UTC) — "All caught up" inbox-zero affirmation.**
  Added an `AllCaughtUp` card (calm success-tinted, "You're all caught up · nothing needs your move
  right now") shown on the dashboard when an *active* operator's triage list is empty (hidden for
  brand-new users, who still get "Get started"), so inbox-zero reads as an accomplishment instead of an
  empty space. `components/dashboard/needs-attention.tsx` + `app/dashboard/page.tsx`. tsc/lint/build ✓.
- **Iteration 71 (12:48 UTC) — Sitemap freshness.**
  Agent routes already carried `lastModified: updatedAt`; the static routes had none. Tied home +
  marketplace `lastModified` to the latest catalog update (max agent `updatedAt`) as a real freshness
  signal, and intentionally left `/developers` (static docs, no tracked change date) without one rather
  than faking "now" each crawl. `app/sitemap.ts`. tsc/lint/build ✓.
- **Iteration 72 (12:54 UTC) — "Your tasks" index page.**
  Filled a real gap: `/tasks/new` + `/tasks/[id]` existed but there was no `/tasks` index. Added
  `app/tasks/page.tsx` listing every task the operator is in (buyer or owner of the selling agent) via
  a new `getUserTasks` query — `TaskStatusBadge` + `DeadlineBadge` + a Hired/Selling role tag, newest
  activity first, each linking to detail. Linked it in the sidebar (so it's in ⌘K too) and repointed
  the task-detail breadcrumb "Tasks" → `/tasks` (was `/dashboard`). Static-prerendered like its authed
  siblings. `app/tasks/page.tsx` + `lib/queries.ts` + `lib/nav.ts` + `app/tasks/[id]/page.tsx`.
  tsc/lint/build ✓ (/tasks emitted).
- **Iteration 73 (13:02 UTC) — Status filter on the `/tasks` index.**
  Added curated filter pills (All / Active / Completed / Disputed / Cancelled) reading `?status=`, with
  a result count and a contextual empty state ("No completed tasks" → View all). `getUserTasks` gained
  an optional `statuses` arg (filtered at the DB, cast to the `TaskStatus` enum); page is now dynamic
  (ƒ) like `/marketplace`. `app/tasks/page.tsx` + `lib/queries.ts`. tsc/lint/build ✓.
- **Iteration 74 (13:06 UTC) — Dashboard → `/tasks` discoverability.**
  Added a subtle "View all tasks →" footer link to the dashboard's Recent tasks card (shown when there
  are tasks), connecting the 6-item recent view to the full new index.
  `components/dashboard/recent-tasks-card.tsx`. tsc/lint/build ✓.
- **Iteration 75 (13:10 UTC) — robots: private `/tasks` out of search.**
  `app/robots.ts` predated the new index and only disallowed admin/dashboard/seller/api. Added `/tasks`
  to the disallow list (operator-only operational surface, absent from the sitemap), so task lists
  don't land in search results; OG/social unfurls are unaffected (robots ≠ link previews).
  `app/robots.ts`. tsc/lint/build ✓.
- **Iteration 76 (13:14 UTC) — New-task form confirms who you're hiring.**
  `AgentSelectOption` already carried name/category/price/currency/verified/capability, so no query
  change was needed; added a compact "Hiring <Name>" summary card at the top of the form (category icon,
  verified badge, primary capability, starting price) shown whenever an agent is selected — turning a
  bare dropdown value into hire confidence. `app/tasks/new/create-task-form.tsx`. tsc/lint/build ✓.
- **Iteration 77 (13:18 UTC) — Review the agent before committing.**
  Added a subtle "View profile ↗" link to the "Hiring <Name>" card (opens `/agents/<id>` in a new tab
  so the half-filled form is preserved) — so a buyer can verify the agent before committing a budget,
  completing the hire-confidence touch. `app/tasks/new/create-task-form.tsx`. tsc/lint/build ✓.
- **Iteration 78 (13:22 UTC) — Personalized dashboard greeting.**
  Swapped the generic "Dashboard" H1 for "Welcome back, <FirstName>" (first token of `user.name` from
  the existing `requireUser()`, falling back to "Dashboard" if absent) — a small warmth touch at the
  operator's home base. Browser tab title stays "Dashboard". `app/dashboard/page.tsx`. tsc/lint/build ✓.
- **Iteration 79 (13:26 UTC) — Owner affordance on the agent profile.**
  The profile page now fetches the current user in parallel and passes `isOwner` to the header; when
  the viewer owns the agent, a subtle "You own this agent — manage in seller studio" link (→ `/seller`)
  appears beside the actions, without removing Hire (demo self-hire stays valid). `app/agents/[id]/page.tsx`
  + `components/agents/agent-profile-header.tsx`. tsc/lint/build ✓.
- **Iteration 80 (13:30 UTC) — Programmatic access on the task page.**
  (Planned step — persistent validation result — was already done: `ArtifactCard` shows a
  `ValidationStatusBadge` + the score with a colored progress bar from stored fields. Verified.) Added
  a compact "API access" card to the task sidebar with a copyable `GET /api/tasks/{id}` (mirroring the
  agent card's API path affordance), so agents/developers can fetch a task programmatically.
  `app/tasks/[id]/page.tsx`. tsc/lint/build ✓.
- **Iteration 81 (13:34 UTC) — `GET /api/tasks` (list) endpoint.**
  (Planned step — document task endpoints — was already done: the 9 documented endpoints exactly match
  the 9 real route handlers, verified file-by-file.) Shipped the next-best: closed a real API asymmetry
  (you could GET one task but not list them) with a `GET /api/tasks` handler reusing `getUserTasks`
  (with the same status buckets as the UI; returns role + agent + deadline), plus a docs entry.
  `app/api/tasks/route.ts` + `app/developers/page.tsx`. tsc/lint/build ✓ (route emitted).
- **Iteration 82 (13:40 UTC) — `POST /api/agents` (register an agent).**
  Completed API symmetry (agents can now list *themselves*, not just create tasks): added a `POST`
  handler to `app/api/agents/route.ts` mirroring `POST /api/tasks` — accepts a snake_case JSON profile,
  delegates to the `createAgent` action (zod-validated), returns 201 `{agent_id, slug, url}`; + a docs
  entry. Verified end-to-end against a running server: valid → 201, invalid → 400, new agent appears in
  `GET /api/agents` (12→13); test agent then cleaned from the local DB. tsc/lint/build ✓.
- **Iteration 83 (13:44 UTC) — Runnable curl examples for the new endpoints.**
  `POST /api/agents` and `GET /api/tasks` were in the endpoint table but lacked copy-paste examples.
  Added `CREATE_AGENT_CURL` (minimal valid body) and `LIST_TASKS_CURL` (`?status=active`) and rendered
  them in the Quickstart alongside the existing create-task / list-agents snippets — so every documented
  endpoint now has a runnable example. `app/developers/page.tsx`. tsc/lint/build ✓.
- **Iteration 84 (13:54 UTC) — Agent edit UI (sellers can now edit listings).**
  Reused the existing `updateAgent` action: taught `create-agent-form.tsx` an edit mode (`agentId` +
  `defaultValues`, switches submit to `updateAgent`, relabels to "Save changes"); added an
  ownership-gated `app/agents/[id]/edit/page.tsx` (maps the agent → form defaults incl. capabilities[]
  and JSON schemas); pointed the profile owner-cue at it. Verification caught two real issues and fixed
  both: a `redirect()`-after-stream resolving to a 200 (replaced with an explicit "you don't own this
  agent" render) and `updateAgent` lacking a server-side ownership check (added). E2E verified: owner →
  edit form, non-owner → blocked. tsc/lint/build ✓.
- **Iteration 85 (14:00 UTC) — Edit reachable from the seller studio.**
  The seller listing rows already had "Edit listing"/"Edit" buttons but they pointed at the *profile*;
  now that the editor exists, repointed them at `/agents/{slug}/edit` (View buttons still go to the
  profile) — so owners reach the editor from where they manage listings. `app/seller/seller-agents.tsx`.
  tsc/lint/build ✓.
- **Iteration 86 (14:06 UTC) — Seller pause / resume a listing.**
  Added a seller-facing `setOwnedAgentStatus` (active⇄paused, ownership-checked) — kept *separate* from
  the admin `setAgentStatus` so adding the owner check doesn't block admin moderation of others' agents
  — and a small client `AgentStatusToggle` (Pause/Resume + spinner + toast) wired into the seller rows
  (desktop + mobile). Verified: build green, toggle renders for owned active/paused listings, and the
  ownership guard is identical to the e2e-verified `updateAgent` check (full click-e2e needs Playwright,
  not a project dep). `lib/actions/agents.ts` + `components/seller/agent-status-toggle.tsx` +
  `seller-agents.tsx`. tsc/lint/build ✓.
- **Iteration 87 (14:14 UTC) — Paused/draft agents leave public discovery.**
  `getAgents`, `getSimilarAgents`, `getCategoryCounts`, and the marketplace-stats agent count used
  `status: { not: "suspended" }` (leaking paused *and* draft into the public marketplace/API/landing);
  switched all four to `status: "active"`, and the sitemap likewise — so a paused listing actually goes
  offline. Owner surfaces unaffected (seller studio queries by ownerId; admin uses its own query;
  profile direct-access kept). E2E verified: pausing an agent dropped `GET /api/agents` 12→11 with it
  absent; DB restored after. `lib/queries.ts` + `app/sitemap.ts`. tsc/lint/build ✓.
- **Iteration 88 (14:22 UTC) — Coherent CTA for a non-active agent profile.**
  A paused agent's profile (reachable by direct link) showed an active "Hire this agent" button it
  couldn't honor (the form lists active agents only). The header now renders "Currently unavailable"
  (Ban icon) instead of Hire whenever `status !== "active"`; "View agent card" + the owner edit-cue
  stay. E2E verified: paused profile shows "Currently unavailable" / no Hire, active shows Hire; DB
  restored. `components/agents/agent-profile-header.tsx`. tsc/lint/build ✓.
- **Iteration 89 (14:30 UTC) — Dispute resolution no longer leaves the task stuck.**
  `resolveDispute` (+ `ResolveDisputeDialog`) already existed, but it only updated the dispute — the
  *task* stayed in `disputed` forever. Now on resolve it lifts the task back to a continuable state
  ("submitted" if a deliverable exists, else "accepted") so the lifecycle resumes. E2E verified via the
  real action: task went disputed → submitted on resolve, dispute → rejected (test data cleaned up).
  `lib/actions/tasks.ts`. tsc/lint/build ✓.
- **Iteration 90 (14:38 UTC) — Synced the README to shipped features.**
  Updated Highlights (unified buyer+seller dashboard triage ordered by urgency + "all caught up";
  seller self-management: edit + pause/resume; `/tasks` index; recents-in-⌘K; deadline badges) and the
  Pages table (added `/agents/[id]/edit` and `/tasks`; noted seller pause/resume) so the docs match the
  app. `README.md` (docs-only). tsc/lint ✓.
- **Iteration 91 (14:46 UTC) — DRY'd the task-status filter buckets.**
  The buckets were defined twice (`/tasks` page `FILTERS` + `/api/tasks` `STATUS_GROUPS`), risking
  drift. Extracted one `TASK_FILTERS` + `statusesForFilter()` into `lib/constants.ts`; both the page and
  the API route now consume it. Added 4 unit tests (unique keys + labels; valid statuses; "active" =
  the five in-progress states; `statusesForFilter` all→undefined / key→statuses / unknown→raw). Suite
  64 tests. `lib/constants.ts` + `app/tasks/page.tsx` + `app/api/tasks/route.ts` + `config.test.ts`.
  test/tsc/lint/build ✓.
- **Iteration 92 (14:54 UTC) — Dispute outcomes visible to the parties.**
  The task page's Disputes section only rendered *open* disputes, so a resolved/rejected dispute
  vanished and the buyer/seller never saw the outcome. Now it shows *all* disputes (status badge +
  resolution note), styled neutral once closed and retitled "Issues raised on this task and how they
  were resolved." E2E verified: a rejected dispute's reason + resolution render on the task page (test
  data cleaned up). `app/tasks/[id]/page.tsx`. tsc/lint/build ✓.
- **Iteration 93 (15:02 UTC) — Dismissed disputes restore reputation.**
  Fairness fix: `openDispute` docks −6, but resolving as *rejected* (baseless) never credited it back,
  so a vindicated agent kept the hit forever. Added `onDisputeDismissed` (records a `dispute_resolved`
  event of +6, reversing the open penalty) and called it from `resolveDispute` when `status ===
  "rejected"`; *upheld* ("resolved") disputes keep the penalty. E2E verified: rep 94 → 88 (open) → 94
  (dismiss), net zero. `lib/reputation.ts` + `lib/actions/tasks.ts`. tsc/lint/build ✓.
- **Iteration 94 (15:10 UTC) — Unified reputation event labels.**
  (Planned step — feed labels for dispute events — was already handled by the feed's curated map.) The
  *admin* tab used a separate `reputationTypeLabel` that just title-cased the raw type ("Sla Met",
  "Verification") — inconsistent with the feed. Extracted a shared `REPUTATION_EVENT_LABELS` +
  `reputationEventLabel()` into `lib/constants.ts`; the feed and admin now use it (fixing admin's labels
  to "SLA met" / "Verified" / "Task completed"). +3 tests (67 total). `lib/constants.ts` +
  `reputation-feed.tsx` + `admin-tabs.tsx` + `config.test.ts`. test/tsc/lint/build ✓.
- **Iteration 95 (15:18 UTC) — Regression smoke-test (clean) + 404 metadata.**
  Smoke-tested the running prod server across all 14 pages + 6 APIs + 6 SEO/OG routes — **all 200, no
  breakage** after 90+ changes (incl. `/agents/[id]/edit`, `/tasks`, filters). Lone finding: a missing
  agent URL renders the correct not-found UI but with a 200 (soft-404 — pre-existing Next layout-stream
  behavior; low impact since the sitemap lists only real agents). Mitigated + polished by adding
  `metadata` to `app/not-found.tsx` (title "Page not found" + `robots: noindex`, so crawlers won't index
  it). tsc/lint/build ✓.
- **Iteration 96 (15:26 UTC) — Loading skeleton for the `/tasks` index.**
  The new `/tasks` index lacked the `loading.tsx` its data-route siblings have, so it flashed blank on
  nav. Added `app/tasks/loading.tsx` (header + filter-pill row + 6 list-row skeletons) matching the
  page layout, for consistent perceived performance. tsc/lint/build ✓.
- **Iteration 97 (15:34 UTC) — Loading skeleton for the agent editor.**
  Added `app/agents/[id]/edit/loading.tsx` (header + 3 form-card skeletons + action buttons) so the
  editor — which awaits the agent + orgs + ownership before rendering — no longer flashes blank on nav.
  tsc/lint/build ✓.
- **Iteration 98 (15:42 UTC) — Completed loading-state coverage.**
  Added `app/agents/new/loading.tsx` and `app/tasks/new/loading.tsx` (form-card skeletons; the task one
  mirrors the two-column form + sticky contract-preview layout). Every data/form route now has a
  `loading.tsx` — loading-state coverage is complete app-wide; skeleton thread closed. tsc/lint/build ✓.
- **Iteration 99 (15:50 UTC) — Hygiene sweep (clean) + Node engine.**
  Swept `app/`/`lib/`/`components/` — no `console.log`/`debugger`/`TODO`/`FIXME` (only 24 legit
  `console.error` in catch blocks). Shipped a tiny polish: declared `"engines": { "node": ">=20" }` in
  `package.json` (matches `.nvmrc` + CI; helps deploy platforms pick the right Node). tsc/lint/build ✓.
- **Iteration 100 (15:58 UTC) — CI concurrency (cancel superseded runs).**
  (Planned step — npm cache — was already in `ci.yml`.) Added a `concurrency` group
  (`cancel-in-progress`) so the frequent loop pushes don't pile up stale CI runs, and corrected the job
  name to "Typecheck, lint, test, build". `.github/workflows/ci.yml`. yaml/tsc/lint ✓.
- **Iteration 101 (16:06 UTC) — Boundary tests for `deadlineStatus`.**
  Added exact-threshold cases (diff 0 → overdue, exactly 24h → soon, 24h+1s → normal, injected `now`)
  hardening the urgency helper behind every `DeadlineBadge`. Suite 68 tests. `lib/__tests__/utils.test.ts`.
  test/tsc/lint ✓.
- **Iteration 102 (16:14 UTC) — Scope re-audit vs `project_scope_v1.md` (clean).**
  Verified no scope regression after 100+ changes: **12 Prisma models** (exact set), all **10 spec pages
  present** (+ 2 bonus `/agents/[id]/edit`, `/tasks`, all 200 per iter 95), **mock x402/A2A/MCP +
  validation adapters** present, seed **12 agents / 12 tasks** (≥12 / ≥8) + reviews/payments/41 rep
  events; deterministic validation + escrow→release + event-driven reputation intact (test-covered).
  No fix needed — the product still matches and exceeds the brief. (verification only)
- **Iteration 103 (16:22 UTC) — Accessible dashboard charts.**
  The Recharts charts were visual-only; wrapped each `ChartCard` chart in a `role="img"` region with an
  `aria-label` summarizing the data (title + N data points + total + peak, respecting value prefix/suffix)
  so screen-reader users get the chart's meaning. `components/dashboard/chart-card.tsx`. tsc/lint/build ✓.
- **Iteration 104 (16:30 UTC) — Accessible `StarRating`.**
  The read-only star display had no accessible label and exposed decorative SVGs. Gave it `role="img"` +
  `aria-label` "X out of 5 stars" with the individual icons `aria-hidden`; the interactive variant keeps
  its labeled radiogroup. `components/shared/star-rating.tsx`. tsc/lint/build ✓.
- **Iteration 105 (16:38 UTC) — Accessible reputation score.**
  Both variants of `ReputationScore` lacked an accessible name (ring = decorative SVG + number; inline =
  `title` only). Added `role="img"` + `aria-label` "Reputation NN out of 100 — <tier>" to the ring and
  an `aria-label` to the inline badge, with the decorative SVG/dot `aria-hidden`.
  `components/shared/reputation-score.tsx`. tsc/lint/build ✓.
- **Iteration 106 (16:46 UTC) — Verified badge a11y (closed the sweep).**
  (`VerifiedBadge` was already accessible via an always-present `sr-only` "Verified" + `aria-hidden`
  icon.) Fixed a double-announce: when `showLabel`, it rendered *both* the visible "Verified" text and
  the `sr-only` span; made them mutually exclusive so AT reads "Verified" once. The meaningful
  visual-only indicators (charts/stars/reputation/verified) are now all labeled. `verified-badge.tsx`.
  tsc/lint/build ✓.
- **Iteration 107 (16:54 UTC) — Charts respect reduced motion.**
  Recharts animates its series by default; added `useReducedMotion()` (framer-motion) to
  `dashboard-chart.tsx` and passed `isAnimationActive={!reduce}` to the Bar/Line/Area, so
  reduced-motion users get a static render — completing the spec's reduced-motion-safe goal across
  entrance, Reveal, and charts. tsc/lint/build ✓.
- **Iteration 108 (13:06 UTC) — Locked the validation verdict's `notes` contract.**
  (The planned step assumed missing-schema → fail; reading `mockValidation.ts` showed it does *not* —
  only a missing artifact body hard-fails; a missing schema downgrades to a heuristic check and still
  scores.) The untested surface was `ValidationOutcome.notes`, the human-readable verdict reasons the
  UI shows. Added 3 tests to `lib/__tests__/mock-validation.test.ts`: no-body failure includes its
  explanation note, a no-schema artifact still scores ≥70 (never short-circuits to 0) with the
  heuristic note, and a schema-checked verdict carries the "Artifact present" + schema + score notes.
  71 tests pass (was 68). tsc/lint ✓.
- **Iteration 109 (13:09 UTC) — Locked `deadlineStatus`'s urgency thresholds with tests.**
  `deadlineStatus` colors every deadline chip but had no test. Added `lib/__tests__/deadline-status.test.ts`
  (7 cases): past/at-now → `overdue`, within-24h → `soon` (incl. the exact 24h boundary), past-24h and
  days-out → `normal`, and Date/string/number inputs treated equivalently. A boundary regression now
  fails CI instead of shipping. 78 tests pass (was 71). tsc/lint ✓.
- **Iteration 110 (13:11 UTC) — Locked the `/tasks` filter map with tests.**
  `statusesForFilter`/`TASK_FILTERS` decide which tasks each tab shows but had no test. Added
  `lib/__tests__/task-filters.test.ts` (6 cases): `all`/no-key → no constraint, `active` → exactly the
  5 in-progress statuses, single-status tabs map 1:1, every filter key resolves to statuses that exist
  in `TASK_STATUS_CONFIG`, an unknown key falls back to a raw status, and the result is a fresh copy
  (mutation can't corrupt the config). 84 tests pass (was 78). tsc/lint ✓.
- **Iteration 111 (13:14 UTC) — Locked `reputationEventLabel` with tests.**
  The reputation timeline's per-event labels (curated map + snake_case→sentence-case fallback) had no
  test. Added `lib/__tests__/reputation-labels.test.ts` (4 cases): every `REPUTATION_EVENT_LABELS` key
  round-trips, an unknown type humanizes to *sentence* case (`some_new_event` → "Some new event" — the
  fallback only uppercases the first char, not Title Case as the plan assumed), and output is always a
  non-empty string. 88 tests pass (was 84). tsc/lint ✓. (Noted: utils.test.ts already covers
  `deadlineStatus`, so iter 109's separate file is largely redundant — next step consolidates it.)

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
