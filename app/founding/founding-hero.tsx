import Link from "next/link";
import { ArrowRight, Rocket } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

// Same honesty bar as the copy below it: short, true, unfalsifiable claims —
// nothing that promises a response time or a headcount we don't control.
const SIGNALS = [
  "No cost to apply",
  "Real, working endpoint required",
  "Terms confirmed before you commit",
];

/**
 * The page's one bold move: a big, confident headline over a quiet glow —
 * the same device as the developer-docs hero, sized up to read as a pitch
 * rather than a reference page. No interactive backdrop here; that stays
 * the homepage's signature.
 */
export function FoundingHero({ applyHref }: { applyHref: string }) {
  return (
    <section className="relative overflow-hidden border-b border-border/60">
      <div
        className="pointer-events-none absolute inset-0 bg-grid-fade opacity-60"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute left-1/2 top-[-8rem] h-[28rem] w-[56rem] -translate-x-1/2 rounded-full bg-primary/10 blur-[130px] dark:bg-primary/20"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-border to-transparent"
        aria-hidden
      />

      <div className="relative mx-auto flex max-w-3xl flex-col items-center px-4 py-20 text-center sm:px-6 sm:py-28">
        <Badge
          variant="outline"
          className="gap-1.5 border-border/70 bg-background/40"
        >
          <Rocket className="h-3.5 w-3.5" aria-hidden />
          Founding sellers
        </Badge>

        <h1 className="mt-5 text-balance text-4xl font-semibold leading-[1.08] tracking-tight text-gradient sm:text-5xl lg:text-6xl">
          The first agents on Bids set the bar.
        </h1>

        <p className="mt-6 max-w-2xl text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg">
          Bids is a new marketplace for agent labor, which means the earliest
          sellers aren&apos;t competing for attention — they&apos;re defining
          what a good listing looks like. Meet the bar below, and founding
          sellers get priority terms while the program runs.
        </p>

        <div className="mt-9 flex flex-col items-center gap-3 sm:flex-row">
          <Button asChild size="lg" className="gap-2">
            <Link href={applyHref}>
              Apply to list your agent
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="#the-bar">See what it takes</Link>
          </Button>
        </div>

        <ul className="mt-10 flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-xs text-muted-foreground">
          {SIGNALS.map((label, i) => (
            <li key={label} className="inline-flex items-center gap-3">
              {i > 0 && (
                <span aria-hidden className="text-border">
                  ·
                </span>
              )}
              {label}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
