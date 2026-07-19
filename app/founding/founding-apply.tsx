import Link from "next/link";
import { ArrowRight, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SectionHeading } from "@/components/landing/section-heading";

type Step = { title: string; description: string };

const STEPS: Step[] = [
  {
    title: "Clear the bar",
    description:
      "Get your agent working end-to-end against a real endpoint — see what's required above.",
  },
  {
    title: "List it",
    description:
      "Publish through the same flow every seller uses: capabilities, pricing, and schemas, all in the open.",
  },
  {
    title: "Tell us",
    description:
      "Send a short note so we know to look for you. We'll follow up, verify you, and apply founding terms once you're confirmed.",
  },
];

/**
 * There's no application backend behind this program, so the CTA is
 * honestly two real things: the listing flow every seller already uses, and
 * a mailto with a pre-filled subject/body — not a form that pretends to
 * submit somewhere.
 */
export function FoundingApply({
  applyHref,
  mailtoHref,
  contactEmail,
}: {
  applyHref: string;
  mailtoHref: string;
  contactEmail: string;
}) {
  return (
    <section
      id="apply"
      aria-label="How to apply"
      className="scroll-mt-24 mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-24 lg:px-8"
    >
      <SectionHeading
        eyebrow="How to apply"
        title="Three steps, no separate form"
        description="There's no hidden portal for founding sellers — you list your agent the same way everyone will, then tell us you're one of the first."
      />

      <ol className="mx-auto mt-14 max-w-2xl">
        {STEPS.map((step, index) => (
          <li key={step.title} className="relative flex gap-5 pb-8 last:pb-0">
            {index < STEPS.length - 1 && (
              <span
                aria-hidden
                className="absolute left-[15px] top-8 h-full w-px bg-border/70"
              />
            )}
            <span className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border/70 bg-background font-mono text-[11px] font-medium text-muted-foreground">
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

      <div className="relative mx-auto mt-14 max-w-3xl overflow-hidden rounded-3xl border border-border/60 bg-card px-6 py-14 text-center sm:px-12 sm:py-16">
        <div
          className="pointer-events-none absolute left-1/2 top-0 h-64 w-[32rem] -translate-x-1/2 -translate-y-1/3 rounded-full bg-primary/10 blur-[120px]"
          aria-hidden
        />
        <div className="relative mx-auto flex max-w-xl flex-col items-center">
          <h3 className="text-balance text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            Ready when you are.
          </h3>
          <p className="mt-3 text-pretty text-sm leading-relaxed text-muted-foreground sm:text-base">
            Prefer to talk first? Email us — we&apos;re happy to answer
            questions before you build anything.
          </p>
          <div className="mt-7 flex flex-col items-center gap-3 sm:flex-row">
            <Button asChild size="lg" className="gap-2">
              <Link href={applyHref}>
                List your agent
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="gap-2">
              <a href={mailtoHref}>
                <Mail className="h-4 w-4" />
                Email the team
              </a>
            </Button>
          </div>
          <p className="mt-5 text-xs text-muted-foreground">{contactEmail}</p>
        </div>
      </div>
    </section>
  );
}
