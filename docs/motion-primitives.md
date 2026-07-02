# Motion primitives (cult-ui)

Four adapted [cult-ui](https://cult-ui.com) primitives power the app's
signature interactions. They live in `components/ui/` and run on the
`motion` package (`motion/react`), NOT the legacy `framer-motion` import
that the charts use. `side-panel` also depends on `react-use-measure`.

**These are load-bearing.** Do not remove them, swap their dependencies, or
"simplify" their placements without re-reading this file — each placement
below is part of the product's designed experience.

---

## 1. `dynamic-island.tsx` — task lifecycle status

**Used by:** `components/tasks/task-status-island.tsx`, mounted in
`components/tasks/task-actions.tsx` (task detail page).

The floating black pill that narrates lifecycle actions: it appears when an
action starts ("Accepting task…", "Releasing payment…"), morphs wider while
busy, settles on the outcome ("Validation passed · 92/100"), and clears
itself after ~2s. It **replaces success/error toasts** for task lifecycle
actions — do not reintroduce toasts alongside it (one feedback channel).

Adaptation notes:
- The island surface is intentionally **pure black in both themes** (like
  the hardware it quotes). Inner colors are fixed shades (`text-white`,
  `bg-sky-400`…), never theme tokens.
- Drive it via the `IslandState` (`label` + `tone: busy|success|error`)
  prop; sizes are `compactLong` (busy) → `compact` (settled).

## 2. `expandable-screen.tsx` — trigger → fullscreen morph

**Used by:**
- `components/landing/featured-agent-tile.tsx` — landing featured-agent
  cards morph into a full-screen quick view (about, capabilities, metrics,
  Hire CTA).
- `components/tasks/contract-expand.tsx` — "Inspect fullscreen" for the
  generated contract in `/tasks/new`.

Adaptation notes:
- We added `backgroundClassName` to `ExpandableScreenTrigger`: it styles
  the **morphing layer** and must match the content surface (e.g.
  `bg-card border border-border/60`) so trigger → screen reads as one
  continuous shape, not a modal appearing.
- Each instance on a page needs a unique `layoutId`.
- Content locks body scroll while open (`lockScroll`).

## 3. `side-panel.tsx` — rail → wide reveal

**Used by:** `components/landing/api-peek.tsx` inside
`components/landing/developer-teaser.tsx` — the "POST /api/tasks" terminal
rail that unfurls into the full example request.

Adaptation notes:
- Upstream shipped a bug: the `closed` variant had no `width` target, so
  the panel never shrank back. Both variants are explicit now
  (`open: 100%`, `closed: 260px`). Keep them explicit.
- Style the surface via `className` (we use `bg-code border-border/60`);
  content inside sits on the fixed-dark `bg-code` surface, so inner text
  uses fixed light shades (see the code-surface rule in the design system).

## 4. `morph-surface.tsx` — button → composer morph

**Used by:** `components/layout/feedback-dock.tsx`, mounted in the
`AppShell` (desktop only, `hidden md:block`) — the bottom-right feedback
pill that morphs into a textarea. Submit is mocked (server log) in the
MVP, mirroring the x402 adapter pattern.

Adaptation notes:
- We added `reserveSpace={false}` for use inside `fixed` wrappers (the
  upstream root reserves the expanded footprint in layout).
- We added `dockLabel` (upstream hardcoded "Morph Surface").
- Shadows/surfaces were retokenized (`bg-card border-border/60 shadow-lg`).

---

## Regression checklist

When touching any of these files or their placements, verify:

1. `npm run build` + `npx tsc --noEmit` pass.
2. **Both themes**: the island stays black; expandable surfaces use
   `bg-card`; the API peek stays `bg-code` with light-on-dark text.
3. **Mobile (390px)**: feedback dock hidden; featured-tile quick view
   scrolls; island doesn't cover the mobile sticky Hire bar (island is
   task-detail only, bottom-center).
4. **Escape hatches work**: expandable screens close via the X; morph
   surface closes on outside click/Escape; side panel toggles closed and
   actually shrinks back.
5. **One feedback channel**: task lifecycle actions speak through the
   island, not toasts.
6. `motion/react` and `framer-motion` are separate packages here — don't
   consolidate imports without migrating the chart components too.
