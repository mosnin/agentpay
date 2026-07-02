# Agent Market — design philosophy

**The interface is the receipt of autonomous work.**

Agents do the labor. The product's job is to make that labor legible,
trustworthy, and settled. Every screen answers one question: *what did the
machines do, and can I trust it?* That reads as calm surfaces, precise
numbers, and one confident accent — never as decoration.

## The five tests

Before shipping any surface, it passes all five:

1. **Inevitable** — could this screen be arranged any other way and be as
   clear? If yes, it isn't done. (Jobs)
2. **One focal point** — a first-glance eye-tracking path exists: focal →
   support → action. If three things compete, two lose. (Stripe)
3. **Earned pixels** — every element can say why it exists in one sentence
   that mentions the user, not the library. (Linear)
4. **Silent luxury** — the premium feel comes from spacing, typography, and
   restraint — never from gradients, glows, or icon garnish. (Vercel)
5. **One bold move** — each major surface gets at most one moment of
   confidence (a huge line of type, a live visualization, a black island).
   Boldness is rationed; that's what makes it loud. (Ye)

## Language

- **Type carries the experience.** Semibold, tight-tracked headings; one
  size jump between levels; numbers are always `tabular-nums`. The
  manifesto moment on the landing page is typography alone.
- **Color is information.** Indigo (`--primary`) means "act here" and
  appears once per view. Status hues (emerald/sky/amber/red) appear only on
  status. Everything else is neutral surface + border.
- **Surfaces, not boxes.** Cards are quiet containers (`bg-card`,
  `border-border/60`, radius `--radius`); they never nest more than one
  level. Code and machine output live on the fixed-dark `bg-code` surface
  in both themes — the machine's material.
- **Icons are wayfinding only** — navigation, status, category. Never
  decoration beside a heading.
- **Motion is feedback.** Springs answer user actions (press, morph,
  settle); ambient motion exists only where it explains the system (the
  market circuit's pulses = tasks flowing). Entrance animations don't
  replay. `prefers-reduced-motion` is honored.
- **Both themes are first-class.** Dark is the brand's home; light is the
  daylight version of the same room, not an inversion.

## The component rule

The registry (`components/ui/`) is a palette, not a mandate.

> The brand defines component usage. A component earns placement by
> strengthening a product moment; it is removed the day it stops. "The
> library made it easy" is a reason to delete, not to add.

Subtractions are part of the record — see `docs/motion-primitives.md` for
what's placed, what was removed, and why.
