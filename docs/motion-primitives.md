# Motion & signature primitives

The product's signature interactions are built on adapted registry
primitives. **The brand defines component usage** — see
`docs/design-philosophy.md`. A component earns placement by strengthening a
product moment and is removed the day it stops. This file is the record.

Dependencies: `motion` (`motion/react`) powers all of these — NOT the legacy
`framer-motion` import the chart components use. Don't consolidate one into
the other without migrating both sides.

---

## Placed

### `ui/dynamic-island.tsx` (cult-ui) — task lifecycle narrator
`components/tasks/task-status-island.tsx`, mounted in `task-actions.tsx`.
Appears when an action starts, morphs wider while busy, settles on the
outcome, clears itself. **Replaces success/error toasts for lifecycle
actions** — one feedback channel; do not reintroduce toasts beside it.
Surface is pure black in both themes; inner colors are fixed shades.

### `ui/expandable-screen.tsx` (cult-ui) — trigger → fullscreen morph
- `landing/featured-agent-tile.tsx`: featured cards morph into a full agent
  quick view.
- `tasks/contract-expand.tsx`: "Inspect fullscreen" for generated contracts.
Adapted with `backgroundClassName` on the trigger so the morphing layer
matches the content surface — the expansion reads as one continuous shape.
Unique `layoutId` per instance.

### `ui/circuit-board.tsx` (componentry) — the market circuit
`landing/market-circuit.tsx` maps the product's lifecycle onto it: work on
the top rail (You → Contract → Agent → Validation), money on the bottom
(You → Escrow → Payout). Pulses are the product's one ambient motion — they
are the explanation, not decoration. Placed in the landing "How it works"
and the developers-page overview (`md+` only; it can't be legible at phone
scale, where the numbered rail carries the meaning). Wrapper scales a fixed
880×330 composition; honors `prefers-reduced-motion` by disabling pulses.

### `dot-grid-spotlight.tsx` (ncdai) — hero backdrop
`landing/hero-backdrop.tsx`: the hero's dot grid brightens under the
cursor. Theme-aware colors chosen at the call site; masked by the shared
`bg-grid-fade`. Fixed a Tailwind v4-ism (`transition-opacity!`).

### `shimmering-text.tsx` (ncdai) — one breathing line
`landing/manifesto.tsx` only. The manifesto headline is silent; its support
line shimmers slowly (muted → foreground). This is the only ambient text
motion in the product — do not add more.
CSS vars must be wrapped at call sites: `[--color:hsl(var(--token))]`.

### `logos-carousel.tsx` (ncdai) — live listings strip
`landing/live-listings-strip.tsx`: wordmarks cycling through **real seeded
listings and orgs** — honest social proof, not an invented logo wall.
Reduced-motion aware out of the box.

### `theme-switcher.tsx` (ncdai) — segmented system/light/dark
Site footer. Headers keep the compact one-icon `ThemeToggle`. Fixed
Tailwind v4 `inset-ring-*` utilities to v3 (`ring-1 ring-inset`).

## Removed (and why)

- **morph-surface / feedback dock** — a floating branded pill over every
  app screen failed the "deserves to exist" test: no real channel behind
  it, pure chrome. Deleted.
- **side-panel / API peek** — hiding the example request behind a toggle
  weakened the developer teaser; marketing shows the product. The code
  block is visible again. (The upstream component also shipped a
  never-shrinks-back bug we'd had to patch.)
- **testimonials-02 / kibo-ui marquee** — a portfolio demo hardcoded with
  someone else's tweets, on Tailwind v4-only utilities. Fake testimonials
  on a marketplace are inauthentic; social proof comes from live stats and
  the listings strip instead.

## Registry hygiene

The ncdai/componentry registries target Tailwind v4. This project is v3:
- Strip `@utility` blocks and `color-mix` token appends from
  `globals.css` after installs.
- Replace v4 utilities (`inset-ring-*`, `*-important!` suffix syntax).
- Fix monorepo imports (`@workspace/ui/...` → `@/lib/utils`).

## Regression checklist

1. `npx tsc --noEmit` + `npm run build` pass.
2. Both themes: island stays black; expandable surfaces `bg-card`; circuit
   legible on `bg-card/20` and in the developers panel; spotlight visible
   in light mode.
3. Mobile (390px): circuit hidden, rail carries "How it works"; quick view
   scrolls; no horizontal overflow from the listings strip.
4. Escape hatches: expandable screens close via X; island self-dismisses.
5. One feedback channel: lifecycle actions speak through the island only.
6. Reduced motion: circuit pulses off, carousel static, shimmer stops.
