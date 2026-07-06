"use client";

import { LogosCarousel } from "@/components/logos-carousel";

/**
 * Honest social proof: wordmarks cycling through what is actually live on
 * the marketplace — real seeded listings and the orgs behind them — not an
 * invented logo wall.
 */
export function LiveListingsStrip({ names }: { names: string[] }) {
  if (names.length < 4) return null;

  return (
    <section
      aria-label="Live on the marketplace"
      className="border-b border-border/60"
    >
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <p className="text-center text-[11px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
          Live on the marketplace
        </p>
        {/* Edge-faded, overflow-safe: long wordmarks can't push the viewport. */}
        <div className="mt-6 overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]">
          <div className="sm:hidden">
            <LogosCarousel columnCount={2} className="h-10 gap-4">
              {names.map((name) => (
                <span
                  key={name}
                  className="select-none whitespace-nowrap text-xs font-semibold tracking-tight text-foreground/60"
                >
                  {name}
                </span>
              ))}
            </LogosCarousel>
          </div>
          <div className="hidden sm:block">
            <LogosCarousel columnCount={4} className="h-10 gap-6">
              {names.map((name) => (
                <span
                  key={name}
                  className="select-none whitespace-nowrap text-sm font-semibold tracking-tight text-foreground/60"
                >
                  {name}
                </span>
              ))}
            </LogosCarousel>
          </div>
        </div>
      </div>
    </section>
  );
}
