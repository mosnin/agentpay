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

### `elastic-slider.tsx` (ncdai) — the budget money moment
`components/tasks/budget-field.tsx` on `/tasks/new`. Rubber-band slider over
a smart range around the agent's rate, paired with an exact-amount input and
a one-tap "Suggested $X · Use" anchor — the tactile peak of committing to a
task. Reworked from Tailwind v4 (bare `var(--muted)`, `--spacing()`,
`bg-(--var)`) to our v3 tokens. Motion-only; no new deps.

### `hover-card.tsx` (Radix) — agent glance
`components/agents/agent-hover-card.tsx`, on agent-name references (task
detail seller line, admin agents table). Lazy-fetches the public agent card
on first open, module-cached. The ExpandableScreen quick-view is for
committing; this is for glancing. Built on Radix (not the @shark/@ark-ui
version, which would have added a parallel headless stack).

### `reputation-sparkline.tsx` (hand-built SVG) — trajectory
`components/agents/performance-metrics.tsx`. Dependency-free sparkline
reconstructed from real `reputationEvents` — shows where a score is heading,
which the number can't. Hand-built rather than pull recharts into the agent
route (chose the small honest thing over the library).

### `line-nav.tsx` (ncdai) — docs scroll-spy TOC
`components/developers/developers-toc.tsx` on `/developers`. Growing-line
active indicator driven by an IntersectionObserver scroll-spy. Fixed v4
syntax (`py-5.25`, `w-(--var)`).

### `text-flip.tsx` (ncdai) — one rotating word
`components/landing/final-cta.tsx` only. Rotates real marketplace domains as
the section's single bold move. Also calmed that CTA from a three-layer
gradient stack to one glow.

### Footer reveal (pure CSS) — the closing signature
`app/page.tsx` + `SiteFooter reveal`. Landing-only sticky-reveal: opaque
content (z-10) scrolls over a pinned footer (z-0) uncovering an oversized
wordmark. Technique extracted from the pixel-perfect demo scaffold (which
was hardcoded, not a component); the scaffold was deleted.

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

## Considered and declined

From the broader component shortlist. Taste is subtraction — each of these
was rejected for a reason, not skipped for time. Revisit only if a real
product gap appears.

| Component | Why not |
| --- | --- |
| metrics-01 | Drags in **visx** — a whole second charting stack next to our recharts. Built sparklines on what we own instead. |
| @shark/hover-card, /hint | Drag in **@ark-ui** to duplicate our Radix tooltip/hover-card. Used Radix. |
| @shark/toast, /spinner, /clipboard, /pagination, /password-input | Working infra already (sonner, Loader2, CopyButton, custom pager, Clerk). Swapping = churn, not craft. |
| @shark/sidebar | Our sidebar is bespoke and clean; a swap risks regressing nav we've tuned. |
| social-proof-01 | The live-listings strip already owns "trusted by" with *real* supply. Two org strips = redundant. |
| magnetic-dock | A look-at-me nav gimmick with no functional home; we deliberately de-iconed categories. |
| pixel-canvas | Hover decoration without information — our border→primary hover already reads premium. |
| progressive-blur | We already have uniform `backdrop-blur-xl` on sticky headers; the gradient-blur upgrade is marginal. |
| radial-carousel, scroll-direction-carousel, card-animation | No honest content to carousel; featured agents are a scannable grid on purpose. |
| text-burn-neon | Loud neon is off-brand — our boldness is typographic scale and contrast, not glow. |
| gradient-glow-fade | "No meaningless gradients." The hero/ CTA already carry one restrained glow each. |
| fluid-cube-scroll | The user gated this at >90% confidence it's Jobs-approved; it isn't for this product. Honest pass. |
| qr-code, image-cropper, file-upload | Out of scope / no data model (no file storage, no image assets, no share-QR moment). |
| scatter-text, scroll-fade, logo-animation, announcement, border-2, axis bits | Nice-to-haves with no earned home right now; the page already has its bold moments. |
| number-input, elastic-slider (as generic) | Placed elastic-slider where it's a *moment* (budget); a generic number stepper elsewhere would be chrome. |

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
