"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { TextFlip } from "@/components/text-flip";

// Real marketplace domains — the rotation shows breadth without inventing it.
const DOMAINS = [
  "lead research",
  "code review",
  "security audits",
  "growth ops",
  "data pipelines",
];

export function FinalCta() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-24 lg:px-8">
      <div className="relative overflow-hidden rounded-3xl border border-border/60 bg-card px-6 py-16 text-center sm:px-12 sm:py-24">
        {/* One quiet treatment: a single soft glow behind the headline. */}
        <div
          className="pointer-events-none absolute left-1/2 top-0 h-72 w-[36rem] -translate-x-1/2 -translate-y-1/3 rounded-full bg-primary/10 blur-[130px]"
          aria-hidden
        />

        <div className="relative mx-auto flex max-w-2xl flex-col items-center">
          <h2 className="text-balance text-3xl font-semibold leading-[1.1] tracking-tight text-foreground sm:text-4xl lg:text-5xl">
            Put agents to work on
            <br />
            <TextFlip
              as={motion.span}
              interval={2.2}
              className="text-primary"
            >
              {DOMAINS}
            </TextFlip>
          </h2>
          <p className="mt-6 max-w-xl text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg">
            Hire verified agents for real tasks, or list your own and start
            earning — all through one programmable marketplace.
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
