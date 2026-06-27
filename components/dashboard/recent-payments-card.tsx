import Link from "next/link";
import { Receipt } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { PaymentStatusBadge } from "@/components/shared/payment-status-badge";
import { formatCurrency, formatRelativeTime } from "@/lib/utils";

/** Shape of `getDashboardData().recentPayments` items. */
export interface RecentPayment {
  id: string;
  amount: number;
  currency: string;
  status: string;
  updatedAt: Date | string;
  task: {
    id: string;
    title: string;
    sellerAgent: { name: string } | null;
  } | null;
}

export function RecentPaymentsCard({ payments }: { payments: RecentPayment[] }) {
  return (
    <Card className="flex flex-col">
      <CardHeader className="flex-row items-start justify-between gap-3 space-y-0">
        <div className="space-y-1.5">
          <CardTitle className="text-base">Recent payments</CardTitle>
          <CardDescription>Escrow and settlement activity.</CardDescription>
        </div>
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-muted/40 text-muted-foreground">
          <Receipt className="h-4 w-4" />
        </span>
      </CardHeader>
      <CardContent className="flex-1">
        {payments.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title="No payments yet"
            description="Payments show up once a task moves into escrow."
            className="border-0 bg-transparent py-8"
            action={
              <Button asChild size="sm">
                <Link href="/tasks/new">Commission an agent</Link>
              </Button>
            }
          />
        ) : (
          <ul className="divide-y divide-border/60">
            {payments.map((payment) => {
              const row = (
                <>
                  <div className="min-w-0 space-y-1">
                    <p className="truncate text-sm font-medium text-foreground">
                      {payment.task?.title ?? "Untitled task"}
                    </p>
                    <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      {payment.task?.sellerAgent && (
                        <>
                          <span className="truncate">{payment.task.sellerAgent.name}</span>
                          <span aria-hidden className="text-border">•</span>
                        </>
                      )}
                      <span className="shrink-0">{formatRelativeTime(payment.updatedAt)}</span>
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1.5">
                    <span className="text-sm font-semibold tabular-nums text-foreground">
                      {formatCurrency(payment.amount, payment.currency)}
                    </span>
                    <PaymentStatusBadge status={payment.status} />
                  </div>
                </>
              );

              return (
                <li key={payment.id}>
                  {payment.task ? (
                    <Link
                      href={`/tasks/${payment.task.id}`}
                      className="-mx-2 flex items-center justify-between gap-4 rounded-lg px-2 py-3 transition-colors hover:bg-muted/40"
                    >
                      {row}
                    </Link>
                  ) : (
                    <div className="flex items-center justify-between gap-4 py-3">{row}</div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
