# Agent Market — "Think Like Steve Jobs" Improvement Loop

**Cron job:** `9d472b29` · every 3 min · **window** 2026-06-27 07:56 → **19:56 UTC** (epoch `1782590176`, 12h)

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

**Step 3 — Kill another decision: sensible default deadline.**
In `app/tasks/new/create-task-form.tsx`, default the deadline to ~7 days out (editable) instead of
empty, with a quiet hint, so the task form lands ready-to-submit on arrival from "Hire this agent."
Verify (tsc/lint/build), commit, push.

---

## ✅ Log

- **Iteration 1 (06:33 UTC) — Frictionless hire: smart budget default.**
  Budget now prefills from the selected agent's starting price and re-syncs on agent change (without
  clobbering a typed value), with a "Suggested $X" hint. `create-task-form.tsx`. tsc/lint/build ✓.
- **Iteration 2 (07:56 UTC) — Obvious task lifecycle.**
  Added a status-aware "what happens next" line at the top of the task actions panel (pending →
  "Waiting for the agent to accept…", submitted → "Run validation… then complete", etc.) so the next
  move is never ambiguous. `components/tasks/task-actions.tsx`. tsc/lint/build ✓.

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
