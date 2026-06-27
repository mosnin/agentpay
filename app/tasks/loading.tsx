import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/shared/page-header";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function TasksLoading() {
  return (
    <AppShell>
      <PageHeader
        title="Your tasks"
        description="Every task you've commissioned or fulfilled."
      >
        <Skeleton className="h-10 w-28" />
      </PageHeader>

      <div className="space-y-4">
        {/* Filter pills + count */}
        <div className="flex flex-wrap items-center gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-7 w-20 rounded-full" />
          ))}
          <Skeleton className="ml-auto h-4 w-16" />
        </div>

        {/* Task rows */}
        <Card className="divide-y divide-border/60">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between gap-4 px-4 py-3.5 sm:px-6">
              <div className="min-w-0 space-y-2">
                <Skeleton className="h-4 w-56" />
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-14 rounded-full" />
                  <Skeleton className="h-3 w-40" />
                </div>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1.5">
                <Skeleton className="h-5 w-20 rounded-full" />
                <Skeleton className="h-3 w-12" />
              </div>
            </div>
          ))}
        </Card>
      </div>
    </AppShell>
  );
}
