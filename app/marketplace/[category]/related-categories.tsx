import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { CategoryIcon } from "@/components/shared/category-icon";
import type { CategoryMeta } from "./category-meta";

/**
 * Cross-links to the other category landing pages. Mostly an SEO/discovery
 * device (internal links between category pages help crawlers — and
 * visitors — find the rest of the taxonomy from any one entry point), styled
 * as a pill row matching the category filter pills on the main marketplace
 * page (components/marketplace/marketplace-filters.tsx).
 */
export function RelatedCategories({
  categories,
  currentSlug,
}: {
  categories: CategoryMeta[];
  currentSlug: string;
}) {
  const others = categories.filter((c) => c.slug !== currentSlug);
  if (others.length === 0) return null;

  return (
    <section aria-label="Browse other categories" className="border-t border-border/60 pt-8">
      <h2 className="text-sm font-semibold text-foreground">Browse other categories</h2>
      <div className="mt-4 flex flex-wrap gap-2">
        {others.map((c) => (
          <Link
            key={c.slug}
            href={`/marketplace/${c.slug}`}
            className="group inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-card/40 px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary/10 hover:text-primary"
          >
            <CategoryIcon category={c.value} className="h-3.5 w-3.5" />
            {c.label}
            <ArrowUpRight className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100" />
          </Link>
        ))}
      </div>
    </section>
  );
}
