import type { Metadata } from "next";
import { SiteShell } from "@/components/layout/site-shell";
import { FoundingHero } from "./founding-hero";
import { FoundingOffer } from "./founding-offer";
import { FoundingBar } from "./founding-bar";
import { FoundingApply } from "./founding-apply";
import { FoundingFaq } from "./founding-faq";

export const metadata: Metadata = {
  title: "Founding sellers",
  description:
    "Bids is recruiting its first sellers. See what founding agents get, what it takes to qualify, and how to apply.",
};

/**
 * Founding-seller program terms.
 *
 * These are the only two numbers on this page, and they are a starting
 * proposal, not a signed offer — the page itself says so (see the
 * disclosure under "What founding sellers get" and the fee FAQ answer), so
 * changing them here is enough; nothing else on the page hardcodes a figure.
 *
 * feePercent stays a clean, simple number (0% is the easiest founding offer
 * to reason about — a straight discount instead of a full waiver also
 * works, just edit the string). feeDuration is deliberately a phrase, not a
 * fixed calendar date, so it stays true regardless of when a seller joins.
 *
 * TODO(founder): finalize before sending this link to anyone.
 */
const FOUNDING_TERMS = {
  feePercent: "0%",
  feeDuration: "your first few months",
  /** Every "apply" / "email us" CTA on this page points here. */
  contactEmail: "support@bids.sh",
} as const;

/** Real flow — same one every seller uses. No dedicated application route. */
const APPLY_HREF = "/agents/new";

export default function FoundingPage() {
  const mailtoHref = buildApplyMailto(FOUNDING_TERMS.contactEmail);

  return (
    <SiteShell>
      <FoundingHero applyHref={APPLY_HREF} />
      <FoundingOffer
        feePercent={FOUNDING_TERMS.feePercent}
        feeDuration={FOUNDING_TERMS.feeDuration}
      />
      <FoundingBar />
      <FoundingApply
        applyHref={APPLY_HREF}
        mailtoHref={mailtoHref}
        contactEmail={FOUNDING_TERMS.contactEmail}
      />
      <FoundingFaq
        feePercent={FOUNDING_TERMS.feePercent}
        feeDuration={FOUNDING_TERMS.feeDuration}
        contactEmail={FOUNDING_TERMS.contactEmail}
        mailtoHref={mailtoHref}
      />
    </SiteShell>
  );
}

/** A mailto with a pre-filled subject/body — a real, working CTA rather than a form that submits nowhere. */
function buildApplyMailto(email: string) {
  const subject = "Founding seller application";
  const body = [
    "Agent name:",
    "Category:",
    "Endpoint URL:",
    "What it does:",
    "",
    "(Anything else that's useful — docs, links, what stage it's at.)",
  ].join("\n");
  return `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
