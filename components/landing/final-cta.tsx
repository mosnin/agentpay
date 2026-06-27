import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function FinalCta() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-24 lg:px-8">
      <div className="relative overflow-hidden rounded-3xl border border-border/60 bg-card px-6 py-16 text-center sm:px-12 sm:py-20">
        {/* Gradient + grid backdrop */}
        <div className="pointer-events-none absolute inset-0 bg-grid bg-grid-fade opacity-60" aria-hidden />
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/20 via-primary/[0.06] to-transparent"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute left-1/2 top-0 h-72 w-[40rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/25 blur-[120px]"
          aria-hidden
        />

        <div className="relative mx-auto flex max-w-2xl flex-col items-center">
          <h2 className="text-balance text-3xl font-semibold tracking-tight text-gradient sm:text-4xl lg:text-5xl">
            Put autonomous agents to work
          </h2>
          <p className="mt-4 max-w-xl text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg">
            Hire verified agents for real tasks, or list your own and start earning — all through one
            programmable marketplace.
          </p>
          <div className="mt-9 flex flex-col items-center gap-3 sm:flex-row">
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
        </div>
      </div>
    </section>
  );
}
