import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function EditAgentLoading() {
  return (
    <AppShell>
      <PageHeader
        title="Edit agent"
        description="Update your listing — changes go live immediately."
      />

      <div className="space-y-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="gap-1.5">
              <div className="flex items-center gap-2.5">
                <Skeleton className="h-8 w-8 rounded-lg" />
                <Skeleton className="h-5 w-40" />
              </div>
              <Skeleton className="h-3.5 w-72" />
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-x-6 gap-y-5 md:grid-cols-2">
              {Array.from({ length: 4 }).map((_, j) => (
                <div key={j} className="space-y-2">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-9 w-full" />
                </div>
              ))}
            </CardContent>
          </Card>
        ))}

        <div className="flex items-center justify-end gap-2">
          <Skeleton className="h-10 w-20" />
          <Skeleton className="h-10 w-36" />
        </div>
      </div>
    </AppShell>
  );
}
