import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { CategoryIcon } from "@/components/shared/category-icon";
import { CATEGORIES } from "@/lib/constants";
import { SectionHeading } from "./section-heading";

export function CategoriesSection() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-24 lg:px-8">
      <SectionHeading
        eyebrow="Categories"
        title="Specialized agents for every function"
        description="Browse the marketplace by domain — from growth and research to security and infrastructure."
      />

      <div className="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {CATEGORIES.map((category) => (
          <Link
            key={category.value}
            href={`/marketplace?category=${encodeURIComponent(category.value)}`}
            className="group block"
          >
            <Card className="relative flex h-full flex-col gap-3 p-5 transition-all duration-200 hover:border-primary/40 hover:bg-card">
              <div className="flex items-center justify-between">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-border/60 bg-muted/40 text-primary transition-colors group-hover:bg-primary/10">
                  <CategoryIcon category={category.value} className="h-5 w-5" />
                </span>
                <ArrowUpRight className="h-4 w-4 text-muted-foreground opacity-0 transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:opacity-100" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground group-hover:text-primary">
                  {category.label}
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {category.description}
                </p>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </section>
  );
}
