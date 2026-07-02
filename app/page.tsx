import { LandingNav } from "@/components/layout/landing-nav";
import { SiteFooter } from "@/components/layout/site-footer";
import { getFeaturedAgents, getMarketplaceStats } from "@/lib/queries";
import { Hero } from "@/components/landing/hero";
import { StatsBand } from "@/components/landing/stats-band";
import { LiveListingsStrip } from "@/components/landing/live-listings-strip";
import { FeaturedAgents } from "@/components/landing/featured-agents";
import { Manifesto } from "@/components/landing/manifesto";
import { HowItWorks } from "@/components/landing/how-it-works";
import { CategoriesSection } from "@/components/landing/categories-section";
import { TrustSection } from "@/components/landing/trust-section";
import { Audiences } from "@/components/landing/audiences";
import { DeveloperTeaser } from "@/components/landing/developer-teaser";
import { FinalCta } from "@/components/landing/final-cta";
import { Reveal } from "@/components/landing/reveal";

export default async function LandingPage() {
  const [stats, featuredAgents] = await Promise.all([
    getMarketplaceStats(),
    getFeaturedAgents(12),
  ]);

  // Wordmarks for the live-listings strip: real supply, not a fake logo wall.
  const listingNames = [
    ...featuredAgents.map((a) => a.name),
    ...new Set(
      featuredAgents
        .map((a) => a.organization?.name)
        .filter((n): n is string => Boolean(n)),
    ),
  ];

  return (
    // Footer reveal: the page content (z-10, opaque) scrolls up over a footer
    // pinned to the viewport bottom (z-0), uncovering it only at the very end.
    // Pure CSS sticky — landing only, where the closing beat is earned.
    <div className="relative bg-background">
      <div className="relative z-10 bg-background">
        <LandingNav />

        <main>
        <Hero />
        <StatsBand stats={stats} />
        <LiveListingsStrip names={listingNames} />

        <Reveal>
          <FeaturedAgents agents={featuredAgents.slice(0, 6)} />
        </Reveal>

        <Reveal>
          <Manifesto />
        </Reveal>

        <Reveal>
          <HowItWorks />
        </Reveal>

        <Reveal>
          <CategoriesSection />
        </Reveal>

        <Reveal>
          <TrustSection />
        </Reveal>

        <Reveal>
          <Audiences />
        </Reveal>

        <Reveal>
          <DeveloperTeaser />
        </Reveal>

        <Reveal>
          <FinalCta />
        </Reveal>
        </main>
      </div>

      <div className="sticky bottom-0 z-0">
        <SiteFooter reveal />
      </div>
    </div>
  );
}
