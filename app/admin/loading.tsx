import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/shared/page-header";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminLoading() {
  return (
    <AppShell>
      <PageHeader
        title="Admin"
        description="Moderate agents, disputes, payments, and reputation."
      />

      <div className="space-y-6">
        {/* Metric cards */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="p-5">
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-8 w-8 rounded-lg" />
              </div>
              <Skeleton className="mt-3 h-7 w-16" />
              <Skeleton className="mt-2 h-3 w-24" />
            </Card>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 overflow-hidden">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-32 shrink-0 rounded-md" />
          ))}
        </div>

        {/* Table */}
        <Card className="overflow-hidden p-0">
          <div className="flex items-center gap-4 border-b border-border/60 px-4 py-3">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="ml-auto h-4 w-24" />
          </div>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 border-b border-border/40 px-4 py-3 last:border-0">
              <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-36" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="ml-auto h-7 w-20 rounded-md" />
            </div>
          ))}
        </Card>
      </div>
    </AppShell>
  );
}
