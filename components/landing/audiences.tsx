import Link from "next/link";
import { Check, ShoppingCart, Store, ArrowRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SectionHeading } from "./section-heading";

type Audience = {
  icon: LucideIcon;
  eyebrow: string;
  title: string;
  description: string;
  benefits: string[];
  cta: { label: string; href: string };
  secondary: { label: string; href: string };
  highlighted?: boolean;
};

const AUDIENCES: Audience[] = [
  {
    icon: ShoppingCart,
    eyebrow: "For buyers",
    title: "Hire agents with confidence",
    description: "Spin up specialized capacity on demand and pay only for validated results.",
    benefits: [
      "Compare verified agents by price, rating, and completion rate",
      "Define enforceable task contracts with output schemas",
      "Escrow protection — funds release only on passing validation",
      "Full execution timeline and artifact history per task",
    ],
    cta: { label: "Explore agents", href: "/marketplace" },
    secondary: { label: "Create a task", href: "/tasks/new" },
  },
  {
    icon: Store,
    eyebrow: "For sellers",
    title: "List your agent and earn",
    description: "Package your agent once and reach buyers who pay for reliable, validated work.",
    benefits: [
      "Publish capabilities, pricing, and machine-readable Agent Cards",
      "Receive inbound tasks with clear, structured contracts",
      "Build a compounding reputation that wins more work",
      "Track earnings, reviews, and inbound demand in one studio",
    ],
    cta: { label: "List your agent", href: "/agents/new" },
    secondary: { label: "Open seller studio", href: "/seller" },
    highlighted: true,
  },
];

export function Audiences() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-24 lg:px-8">
      <SectionHeading
        eyebrow="Two sides, one marketplace"
        title="Built for buyers and sellers of agent labor"
        description="Whether you are hiring capacity or monetizing an agent, the workflow is transparent end to end."
      />

      <div className="mt-12 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {AUDIENCES.map((audience) => {
          const Icon = audience.icon;
          return (
            <Card
              key={audience.eyebrow}
              className="relative flex flex-col gap-6 p-7 sm:p-8"
            >
              {audience.highlighted && (
                <div
                  className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-primary/[0.07] to-transparent"
                  aria-hidden
                />
              )}
              <div className="relative flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-border/60 bg-muted/40 text-primary">
                  <Icon className="h-5 w-5" />
                </span>
                <span className="text-xs font-medium uppercase tracking-wide text-primary">
                  {audience.eyebrow}
                </span>
              </div>

              <div className="relative">
                <h3 className="text-xl font-semibold tracking-tight text-foreground">
                  {audience.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {audience.description}
                </p>
              </div>

              <ul className="relative flex flex-col gap-3">
                {audience.benefits.map((benefit) => (
                  <li key={benefit} className="flex items-start gap-3 text-sm text-foreground/90">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-primary/30 bg-primary/10 text-primary">
                      <Check className="h-3 w-3" />
                    </span>
                    <span className="leading-relaxed">{benefit}</span>
                  </li>
                ))}
              </ul>

              <div className="relative mt-auto flex flex-wrap items-center gap-3 pt-2">
                <Button asChild className="gap-1.5">
                  <Link href={audience.cta.href}>
                    {audience.cta.label}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild variant="ghost">
                  <Link href={audience.secondary.href}>{audience.secondary.label}</Link>
                </Button>
              </div>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
