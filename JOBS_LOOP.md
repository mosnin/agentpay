# Agent Market — "Think Like Steve Jobs" Improvement Loop

**Cron job:** `b8934309` · every 18 min · **started** 2026-06-27 06:33 UTC · **auto-stops** 2026-06-27 18:33 UTC (epoch `1782585200`, 12-hour window)

This file is the running state of an autonomous self-improvement loop. Every 18 minutes one
iteration: read **▶ Next step**, execute it, verify (`tsc` + `lint` + `build`), commit & push to
`claude/nifty-keller-7lmbih`, then log it and write the next step. The loop deletes its own cron at
the deadline. Each iteration ships exactly one bounded, verified improvement — never a broken build.

---

## The Jobs lens (how every step is judged)

1. **Focus.** Perfect the core loop — discover → hire → verify → pay → reputation. Say no to anything that doesn't serve it.
2. **Ruthless simplicity.** Remove steps and decisions. One obvious primary action per screen.
3. **Sensible defaults — "it just works."** The product should answer questions the user shouldn't have to.
4. **Craft is the product.** Micro-interactions, motion, copy, empty states. "Details are not the details; they make the design."
5. **Start from the experience.** Design the *feeling* of hiring an agent; work back to the implementation.
6. **Integrated & seamless.** Flows connect; context carries through deep links; ⌘K reaches everything.
7. **Delight / "one more thing."** A signature moment that makes it memorable.

---

## ▶ Next step

**Step 2 — Make the task lifecycle obvious ("what happens next").**
On `/tasks/[id]`, add a concise, status-aware one-liner that says what state the task is in and what
the primary action will do (e.g. *pending* → "Waiting for the agent to accept — you can cancel while
it's pending."). In `components/tasks/task-actions.tsx`, make the single *current* primary action
visually dominant and demote the rest to secondary, so there's never ambiguity about the next move.
Confident, human copy. Verify (tsc/lint/build), commit, push.

---

## ✅ Log

- **Iteration 1 (2026-06-27 06:33 UTC) — Frictionless hire: smart budget default.**
  The hire deep-link already carried agent + category into `/tasks/new`, but budget defaulted to `0`,
  forcing a decision the product already knows. Now the budget prefills from the selected agent's
  starting price and re-syncs when you switch agents (without clobbering a value you typed), with a
  subtle "Suggested $X — <Agent>'s starting price" hint. `app/tasks/new/create-task-form.tsx`.
  Verified: tsc ✓ · lint ✓ · build ✓.

---

## 🗂 Backlog (prioritized — pull from here or generate better)

1. **⌘K command palette** that actually jumps — agents, categories, and key actions (Create task, My dashboard, List an agent). Make discovery and navigation instant from anywhere.
2. **Hire scaffolds the brief.** The hire deep-link also seeds a smart starter title/objective from the agent's top capability, so the form is 80% done on arrival.
3. **One-click "Run demo" on a pending task** that auto-advances the lifecycle (accept → start → submit → validate → complete) so the magic of agent execution is *visible* in seconds.
4. **Marketplace "Best match" default ordering** + instant sort/filter feedback; empty state that suggests a category instead of dead-ending.
5. **Motion on state transitions** (Framer Motion) — task status changes, card hovers, payment release — so progress feels alive, never abrupt.
6. **Agent profile "Similar agents" rail** to keep discovery flowing after a profile view.
7. **Dashboard "Needs your attention"** section pinned to the top: tasks awaiting *your* action (accept, validate, review), so the operator always knows the next move.
8. **Optimistic UI** on task actions — the UI responds instantly, reconciles on server confirm.
9. **Copy pass** — tighten every CTA, hint, and empty state into confident, human, Jobs-voice language. Remove hedging.
10. **Keyboard & focus polish** across dialogs and forms (Enter to submit, Esc to close, focus rings, autofocus first field).
11. **Reduce.** Audit every screen; hide or cut anything that doesn't earn its place in the core loop.
12. **Trust at a glance** — surface verification, dispute rate, and schema-compliance more legibly where hiring decisions are made.
