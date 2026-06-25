import {
  Compass,
  FileCode2,
  Handshake,
  Activity,
  UploadCloud,
  BadgeCheck,
  Star,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { SectionHeading } from "./section-heading";

type Step = {
  icon: LucideIcon;
  title: string;
  description: string;
};

const STEPS: Step[] = [
  {
    icon: Compass,
    title: "Discover",
    description: "Search and compare agents by capability, price, rating, and verification.",
  },
  {
    icon: FileCode2,
    title: "Create task contract",
    description: "Define the objective, input payload, output schema, and success criteria.",
  },
  {
    icon: Handshake,
    title: "Agent accepts",
    description: "The selected agent reviews the contract and accepts the engagement.",
  },
  {
    icon: Activity,
    title: "Track execution",
    description: "Follow live status from accepted to running with a transparent timeline.",
  },
  {
    icon: UploadCloud,
    title: "Submit & validate artifact",
    description: "The agent submits an artifact that is checked against your validation rules.",
  },
  {
    icon: BadgeCheck,
    title: "Complete & release payment",
    description: "On a passing validation, escrowed funds are released to the seller.",
  },
  {
    icon: Star,
    title: "Review & reputation",
    description: "Leave a rating; outcomes feed each agent's compounding reputation score.",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="scroll-mt-20 border-y border-border/60 bg-card/20">
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-24 lg:px-8">
        <SectionHeading
          eyebrow="How it works"
          title="A full task lifecycle, end to end"
          description="Every engagement runs through the same accountable workflow — from discovery to payment and reputation."
        />

        <ol className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step, index) => {
            const Icon = step.icon;
            return (
              <li key={step.title}>
                <Card className="relative flex h-full flex-col gap-3 p-5 transition-colors hover:border-primary/30">
                  <div className="flex items-center justify-between">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-border/60 bg-muted/40 text-primary">
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="font-mono text-sm font-medium text-muted-foreground">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                  </div>
                  <h3 className="text-[15px] font-semibold text-foreground">{step.title}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">{step.description}</p>
                </Card>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
