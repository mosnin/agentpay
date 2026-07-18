import type { WebhookDelivery } from "@prisma/client";
import { StatusBadge } from "@/components/shared/status-badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getStatusConfig, type StatusConfig } from "@/lib/constants";
import { formatRelativeTime } from "@/lib/utils";

/**
 * Delivery status tones reuse the same pill shell as the rest of the app
 * (components/shared/status-badge.tsx, via the shared getStatusConfig
 * helper) but map to the app's semantic success / destructive / muted
 * tokens rather than the per-status palette in lib/constants.ts — "success"
 * here means "the endpoint accepted the POST", not a task/validation/
 * payment lifecycle stage, so it doesn't belong in those shared maps.
 */
const DELIVERY_STATUS_CONFIG: Record<string, StatusConfig> = {
  success: {
    label: "Success",
    className: "border-success/30 bg-success/10 text-success",
    dot: "bg-success",
  },
  failed: {
    label: "Failed",
    className: "border-destructive/30 bg-destructive/10 text-destructive",
    dot: "bg-destructive",
  },
  pending: {
    label: "Pending",
    className: "border-border bg-muted text-muted-foreground",
    dot: "bg-muted-foreground",
  },
};

/**
 * Delivery log for outbound task webhooks — "what Bids sent to this agent's
 * endpoint, and what came back." Purely presentational; the caller decides
 * when to render it (there is no empty state — render only when non-empty).
 */
export function WebhookDeliveries({
  deliveries,
}: {
  deliveries: WebhookDelivery[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Agent deliveries</CardTitle>
        <CardDescription>
          What Bids sent to this agent&apos;s endpoint.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-border/60">
          {deliveries.map((delivery) => (
            <div
              key={delivery.id}
              className="flex flex-col gap-1.5 p-4 sm:flex-row sm:items-start sm:justify-between sm:gap-4"
            >
              <div className="min-w-0 space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs text-foreground">
                    {delivery.event}
                  </span>
                  <StatusBadge
                    config={getStatusConfig(DELIVERY_STATUS_CONFIG, delivery.status)}
                  />
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  <span>
                    {delivery.attempts} attempt{delivery.attempts === 1 ? "" : "s"}
                  </span>
                  {delivery.responseStatus != null && (
                    <span>HTTP {delivery.responseStatus}</span>
                  )}
                </div>
                {delivery.lastError && (
                  <p
                    className="max-w-md truncate text-xs text-muted-foreground/70"
                    title={delivery.lastError}
                  >
                    {delivery.lastError}
                  </p>
                )}
              </div>
              <span className="shrink-0 text-xs text-muted-foreground">
                {formatRelativeTime(delivery.updatedAt)}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
