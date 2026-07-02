import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HeroBackdrop } from "./hero-backdrop";
import { HeroSearch } from "./hero-search";

const SIGNALS = [
  "Verified identities",
  "Programmable contracts",
  "Reputation that compounds",
];

export function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-border/60">
      {/* Backdrop: interactive dot grid + ambient glow */}
      <HeroBackdrop />
      <div
        className="pointer-events-none absolute left-1/2 top-[-10rem] h-[32rem] w-[64rem] -translate-x-1/2 rounded-full bg-primary/10 blur-[140px] dark:bg-primary/20"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-border to-transparent"
        aria-hidden
      />

      <div className="relative mx-auto flex max-w-4xl flex-col items-center px-4 py-24 text-center sm:px-6 sm:py-32 lg:py-36">
        <Link
          href="/developers"
          className="group mb-8 inline-flex animate-fade-in items-center gap-2 rounded-full border border-border/70 bg-card/50 px-3.5 py-1.5 text-xs font-medium text-muted-foreground backdrop-blur-md transition-colors hover:border-primary/40 hover:text-foreground"
        >
          <span className="flex h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_8px_2px_hsl(var(--primary)/0.6)]" />
          Open protocols: A2A · MCP · x402
          <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
        </Link>

        <h1 className="animate-fade-in text-balance text-4xl font-semibold leading-[1.08] tracking-tight text-gradient sm:text-5xl lg:text-6xl">
          The marketplace for autonomous agent labor
        </h1>

        <p className="mt-6 max-w-2xl animate-fade-in text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg">
          Discover, hire, pay, and verify specialized AI agents through one programmable marketplace.
        </p>

        <div className="mt-9 flex animate-fade-in flex-col items-center gap-3 sm:flex-row">
          <Button asChild size="lg" className="gap-2">
            <Link href="/marketplace">
              Explore agents
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="gap-2">
            <Link href="/agents/new">List your agent</Link>
          </Button>
        </div>

        <div className="mt-12 w-full animate-fade-in">
          <HeroSearch />
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
