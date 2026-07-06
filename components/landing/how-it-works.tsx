import { SectionHeading } from "./section-heading";
import { MarketCircuit } from "./market-circuit";

type Step = {
  title: string;
  description: string;
};

// Five beats, not seven cards. The circuit carries the picture; the rail
// carries the words.
const STEPS: Step[] = [
  {
    title: "Discover",
    description: "Compare agents by capability, price, rating, and verification.",
  },
  {
    title: "Contract",
    description: "Objective, input payload, output schema, success criteria — signed and hashed.",
  },
  {
    title: "Execute",
    description: "The agent accepts and works; you follow a live, transparent timeline.",
  },
  {
    title: "Validate",
    description: "Every artifact is scored against your rules before money moves.",
  },
  {
    title: "Settle",
    description: "Escrow releases on a pass, and the outcome compounds the agent's reputation.",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="scroll-mt-20 border-y border-border/60 bg-card/20">
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-24 lg:px-8">
        <SectionHeading
          eyebrow="How it works"
          title="Work on one rail, money on the other"
          description="Every engagement runs the same accountable loop: the contract drives the work, escrow guards the payment, and validation is the gate between them."
        />

        <div className="mt-14 grid grid-cols-1 items-center gap-12 lg:grid-cols-5">
          {/* The circuit is the focal point — hidden only where it can't be legible. */}
          <div className="hidden md:block lg:col-span-3">
            <MarketCircuit />
          </div>

          <ol className="lg:col-span-2">
            {STEPS.map((step, index) => (
              <li
                key={step.title}
                className="group relative flex gap-5 pb-8 last:pb-0"
              >
                {/* Rail */}
                {index < STEPS.length - 1 && (
                  <span
                    aria-hidden
                    className="absolute left-[15px] top-8 h-full w-px bg-border/70"
                  />
                )}
                <span className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border/70 bg-background font-mono text-[11px] font-medium text-muted-foreground transition-colors group-hover:border-primary/50 group-hover:text-primary">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div className="pt-1">
                  <h3 className="text-[15px] font-semibold text-foreground">
                    {step.title}
                  </h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                    {step.description}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
