import { SiteShell } from "@/components/layout/site-shell";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function CategoryMarketplaceLoading() {
  return (
    <SiteShell>
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <Skeleton className="mb-5 h-5 w-40" />

        <div className="space-y-8">
          {/* Hero skeleton */}
          <div className="rounded-2xl border border-border/60 bg-card/40 p-6 sm:p-8">
            <div className="flex items-start gap-4">
              <Skeleton className="h-14 w-14 shrink-0 rounded-2xl" />
              <div className="flex-1 space-y-3">
                <Skeleton className="h-7 w-56" />
                <Skeleton className="h-4 w-full max-w-xl" />
                <Skeleton className="h-4 w-3/4 max-w-md" />
                <div className="flex gap-4 pt-1">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-24" />
                </div>
              </div>
            </div>
          </div>

          {/* Result count */}
          <Skeleton className="h-5 w-32" />

          {/* Card grid */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
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
