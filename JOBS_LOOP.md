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

**Step 8 — "Run demo": make agent execution visible ("one more thing").**
Add a one-click demo on a pending/draft task that auto-advances it through the full happy path
(accept → start → submit artifact → validate → complete → release payment) via a single server action
reusing existing logic, so a new user can watch the core loop resolve in seconds. Surface it as a
clearly-labeled "Run demo" action on the task detail page. Keep it bounded and safe. Verify, commit, push.

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
