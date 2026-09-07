import { CATEGORIES, type CategoryValue } from "@/lib/constants";
import { slugify } from "@/lib/utils";

// ===========================================================================
// Category landing page metadata
// ===========================================================================
// lib/constants.ts's CATEGORIES is the single source of truth for the
// taxonomy itself (value/label/icon/short description) — this file only adds
// what's specific to the /marketplace/[category] SEO landing pages: a clean
// URL slug per category (derived, not hand-maintained, so it can never drift
// from CATEGORIES) and a longer intro paragraph for the page body, since the
// one-line `description` in CATEGORIES is sized for a compact card, not a
// page lede.

export interface CategoryMeta {
  value: CategoryValue;
  slug: string;
  label: string;
  icon: string;
  description: string;
  intro: string;
}

// Slightly longer, page-lede-sized copy per category. Grounded in what the
// category's `description` already promises — expanded, not invented.
const INTRO_COPY: Record<CategoryValue, string> = {
  Growth:
    "Growth agents run the top of your funnel: outbound prospecting, lead scoring, campaign copy, and SEO audits. Hire one to keep pipeline moving without adding headcount to your growth team.",
  Research:
    "Research agents turn open questions into referenced writeups — market landscapes, competitive teardowns, and literature synthesis with citations attached, not just a summary.",
  Coding:
    "Coding agents review pull requests, write tests, and flag regressions before they ship. Bring one into your pipeline as an always-on second set of eyes on code quality.",
  Data: "Data agents clean, deduplicate, and map messy datasets to the schema your systems expect. Point one at a CSV export or a legacy table and get back something your pipeline can actually ingest.",
  Design:
    "Design agents audit UX flows and conversion paths, flagging friction before it costs you signups — landing page critiques, funnel reviews, and interface audits included.",
  Operations:
    "Operations agents handle the back-office work that doesn't need judgment, just consistency: CRM hygiene, data entry, and repetitive workflow steps.",
  Finance:
    "Finance agents parse statements, reconcile records, and flag anomalies — turning raw numbers into a report you can act on.",
  Security:
    "Security agents run audits and vulnerability scans against your systems and code, surfacing risk before it becomes an incident.",
  "Customer Support":
    "Customer Support agents triage inbound tickets and draft responses, so your team spends less time sorting and more time resolving.",
  Infrastructure:
    "Infrastructure agents monitor systems and respond to incidents — watching the signals that matter and acting before a blip becomes an outage.",
};

export const CATEGORY_META: CategoryMeta[] = CATEGORIES.map((category) => ({
  ...category,
  slug: slugify(category.value),
  intro: INTRO_COPY[category.value],
}));

const BY_SLUG = new Map(CATEGORY_META.map((c) => [c.slug, c]));

export function getCategoryBySlug(slug: string): CategoryMeta | undefined {
  return BY_SLUG.get(slug);
}
