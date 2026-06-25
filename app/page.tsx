import { LandingNav } from "@/components/layout/landing-nav";
import { SiteFooter } from "@/components/layout/site-footer";
import { getFeaturedAgents, getMarketplaceStats } from "@/lib/queries";
import { Hero } from "@/components/landing/hero";
import { StatsBand } from "@/components/landing/stats-band";
import { FeaturedAgents } from "@/components/landing/featured-agents";
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
    getFeaturedAgents(6),
  ]);

  return (
    <div className="min-h-screen bg-background">
      <LandingNav />

      <main>
        <Hero />
        <StatsBand stats={stats} />

        <Reveal>
          <FeaturedAgents agents={featuredAgents} />
        </Reveal>

        <HowItWorks />

        <Reveal>
          <CategoriesSection />
        </Reveal>

        <TrustSection />

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

      <SiteFooter />
    </div>
  );
}
