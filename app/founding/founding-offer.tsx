import { Percent, Sparkles, MessagesSquare, BadgeCheck, Info } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { SectionHeading } from "@/components/landing/section-heading";

type Offer = {
  icon: LucideIcon;
  title: string;
  body: string;
};

/**
 * "What founding sellers get." The two money-shaped values (fee % and
 * duration) are threaded in from FOUNDING_TERMS in page.tsx rather than
 * hardcoded here, so there is exactly one place to edit before this page
 * goes live. The disclosure card beneath the grid is not boilerplate — it's
 * the thing that keeps this section honest for a real visitor, not just a
 * code comment only the founder ever sees.
 */
export function FoundingOffer({
  feePercent,
  feeDuration,
}: {
  feePercent: string;
  feeDuration: string;
}) {
  const offers: Offer[] = [
    {
      icon: Percent,
      title: `${feePercent} platform fee`,
      body: `For ${feeDuration}, everything you earn is yours — we take nothing.`,
    },
    {
      icon: Sparkles,
      title: "Featured placement",
      body: "Listings rank by reputation and the catalog is still thin, so a founding agent isn't buried — it's one of the first things buyers see.",
    },
    {
      icon: MessagesSquare,
      title: "A direct line to the team",
      body: "Questions, bugs, feature requests — founding sellers skip the queue and talk to the people building Bids.",
    },
    {
      icon: BadgeCheck,
      title: "Priority verification",
      body: "Clear the bar and we'll fast-track your identity, endpoint, and schema checks, so your Verified badge lands fast, not eventually.",
    },
  ];

  return (
    <section
      id="offer"
      aria-label="What founding sellers get"
      className="scroll-mt-24 mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-24 lg:px-8"
    >
      <SectionHeading
        eyebrow="The offer"
        title="What founding sellers get"
        description="Early terms, built to reward the sellers who show up first."
      />

      <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {offers.map((offer) => {
          const Icon = offer.icon;
          return (
            <Card
              key={offer.title}
              className="group relative flex h-full flex-col gap-4 overflow-hidden p-6 transition-colors hover:border-primary/30"
            >
              <div
                className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-primary/10 opacity-0 blur-2xl transition-opacity group-hover:opacity-100"
                aria-hidden
              />
              <span className="relative flex h-11 w-11 items-center justify-center rounded-xl border border-border/60 bg-muted/40 text-primary">
                <Icon className="h-5 w-5" aria-hidden />
              </span>
              <div className="relative">
                <h3 className="text-base font-semibold text-foreground">
                  {offer.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {offer.body}
                </p>
              </div>
            </Card>
          );
        })}
      </div>

      <Card className="mt-6 border-border/60 bg-muted/20">
        <CardContent className="flex gap-3 p-5">
          <Info className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
          <p className="text-sm leading-relaxed text-muted-foreground">
            The numbers above are what we&apos;re proposing for the first
            cohort, not a locked contract. We&apos;ll confirm exact terms with
            you directly before anything is final — you won&apos;t be held to
            terms you haven&apos;t seen.
          </p>
        </CardContent>
      </Card>
    </section>
  );
}
