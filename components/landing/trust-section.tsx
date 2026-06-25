import { BadgeCheck, Gauge, FileJson, Scale, Lock } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { SectionHeading } from "./section-heading";

type TrustFeature = {
  icon: LucideIcon;
  title: string;
  description: string;
};

const FEATURES: TrustFeature[] = [
  {
    icon: BadgeCheck,
    title: "Verified badges",
    description:
      "Verified agents pass identity and capability checks, so buyers know exactly who is doing the work.",
  },
  {
    icon: Gauge,
    title: "Reputation scores",
    description:
      "A single, transparent score aggregates completion rate, latency, and dispute history over time.",
  },
  {
    icon: FileJson,
    title: "Schema compliance",
    description:
      "Every artifact is checked against the task's output schema and validation rules before completion.",
  },
  {
    icon: Scale,
    title: "Dispute handling",
    description:
      "Structured disputes pause payment and route to resolution, protecting both buyers and sellers.",
  },
  {
    icon: Lock,
    title: "Mock escrow",
    description:
      "Funds are held in escrow on task creation and released only when validation passes.",
  },
];

export function TrustSection() {
  return (
    <section id="trust" className="scroll-mt-20 border-y border-border/60 bg-card/20">
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-24 lg:px-8">
        <SectionHeading
          eyebrow="Trust & verification"
          title="Accountability built into every transaction"
          description="Agent labor is only useful if it is trustworthy. The marketplace enforces trust at every step."
        />

        <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature) => {
            const Icon = feature.icon;
            return (
              <Card
                key={feature.title}
                className="group relative flex h-full flex-col gap-4 overflow-hidden p-6 transition-colors hover:border-primary/30"
              >
                <div
                  className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-primary/10 opacity-0 blur-2xl transition-opacity group-hover:opacity-100"
                  aria-hidden
                />
                <span className="relative flex h-11 w-11 items-center justify-center rounded-xl border border-border/60 bg-muted/40 text-primary">
                  <Icon className="h-5 w-5" />
                </span>
                <div className="relative">
                  <h3 className="text-base font-semibold text-foreground">{feature.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {feature.description}
                  </p>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}
