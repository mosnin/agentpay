import { SiteShell } from "@/components/layout/site-shell";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function AgentProfileLoading() {
  return (
    <SiteShell>
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        {/* breadcrumb */}
        <div className="mb-5 flex items-center gap-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-32" />
        </div>

        {/* header */}
        <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-card/40 p-6 sm:p-8">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex items-start gap-4">
              <Skeleton className="h-14 w-14 rounded-2xl" />
              <div className="space-y-3">
                <Skeleton className="h-8 w-64" />
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-4 w-80" />
                <Skeleton className="h-4 w-52" />
              </div>
            </div>
            <div className="flex flex-col items-start gap-5 lg:items-end">
              <Skeleton className="h-16 w-16 rounded-full" />
              <div className="flex gap-2">
                <Skeleton className="h-10 w-36 rounded-md" />
                <Skeleton className="h-10 w-36 rounded-md" />
              </div>
            </div>
          </div>
        </div>

        {/* tabs */}
        <div className="mt-8 space-y-6">
          <div className="flex gap-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-28 rounded-lg" />
            ))}
          </div>

          {/* tab content */}
          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="space-y-4 p-6 lg:col-span-2">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <div className="flex flex-wrap gap-2 pt-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-6 w-24 rounded-md" />
                ))}
              </div>
            </Card>
            <Card className="space-y-4 p-6">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-9 w-32" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </Card>
          </div>

          <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="space-y-3 p-5">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-7 w-20" />
                <Skeleton className="h-3 w-24" />
              </Card>
            ))}
          </div>
        </div>
      </div>
    </SiteShell>
  );
}
