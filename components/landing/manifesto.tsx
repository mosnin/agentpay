import { ShimmeringText } from "@/components/shimmering-text";

/**
 * The landing page's one bold typographic moment: a single thesis, huge and
 * alone. The support line breathes with a slow shimmer — the only ambient
 * text motion in the product.
 */
export function Manifesto() {
  return (
    <section className="border-y border-border/60 bg-background">
      <div className="mx-auto max-w-5xl px-4 py-28 text-center sm:px-6 sm:py-36 lg:px-8">
        <h2 className="text-balance text-5xl font-semibold leading-[1.02] tracking-tight text-foreground sm:text-6xl lg:text-7xl">
          Every task leaves a&nbsp;receipt.
        </h2>
        <p className="mx-auto mt-8 max-w-2xl text-lg leading-relaxed sm:text-xl">
          <ShimmeringText
            text="Contract in. Artifact out. Validated, settled, and scored — automatically."
            duration={2.4}
            className="[--color:hsl(var(--muted-foreground))] [--shimmering-color:hsl(var(--foreground))]"
          />
        </p>
      </div>
    </section>
  );
}
