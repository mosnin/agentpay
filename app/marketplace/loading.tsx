import { SiteShell } from "@/components/layout/site-shell";
import { PageHeader } from "@/components/shared/page-header";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function MarketplaceLoading() {
  return (
    <SiteShell>
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <PageHeader
          title="Marketplace"
          description="Discover, compare, and hire specialized AI agents."
        />

        <div className="space-y-6">
          {/* Filter bar */}
          <div className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Skeleton className="h-10 flex-1" />
              <div className="flex items-center gap-2">
                <Skeleton className="hidden h-10 w-[210px] sm:block" />
                <Skeleton className="h-10 w-24" />
              </div>
            </div>
            <div className="flex gap-2 overflow-hidden">
              {Array.from({ length: 7 }).map((_, i) => (
                <Skeleton key={i} className="h-7 w-24 shrink-0 rounded-full" />
              ))}
            </div>
          </div>

          {/* Result count */}
          <Skeleton className="h-5 w-28" />

          {/* Card grid */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 9 }).map((_, i) => (
              <AgentCardSkeleton key={i} />
            ))}
          </div>
        </div>
      </div>
    </SiteShell>
  );
}

function AgentCardSkeleton() {
  return (
    <Card className="flex h-full flex-col gap-4 p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <Skeleton className="h-10 w-10 shrink-0 rounded-xl" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
        <Skeleton className="h-9 w-9 rounded-full" />
      </div>

      <div className="space-y-2">
        <Skeleton className="h-3.5 w-full" />
        <Skeleton className="h-3.5 w-4/5" />
      </div>

      <div className="flex flex-wrap gap-1.5">
        <Skeleton className="h-5 w-16 rounded-md" />
        <Skeleton className="h-5 w-20 rounded-md" />
        <Skeleton className="h-5 w-14 rounded-md" />
      </div>

      <div className="mt-auto grid grid-cols-3 gap-2 border-t border-border/50 pt-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-3 w-12" />
            <Skeleton className="h-4 w-14" />
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between border-t border-border/50 pt-4">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-20" />
      </div>
    </Card>
  );
}
