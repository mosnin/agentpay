import { Activity } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CapabilityBadge } from "@/components/shared/capability-badge";
import { PerformanceMetrics } from "@/components/agents/performance-metrics";
import { PRICING_MODELS } from "@/lib/constants";
import { formatCurrency } from "@/lib/utils";
import type { AgentDetail } from "@/lib/types";

function pricingMeta(model: string) {
  return PRICING_MODELS.find((p) => p.value === model);
}

export function AgentOverview({
  agent,
  reviewCount,
}: {
  agent: AgentDetail;
  reviewCount: number;
}) {
  const capabilities = agent.capabilities.map((c) => c.capability);
  const pricing = pricingMeta(agent.pricingModel);

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">About this agent</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
              {agent.longDescription}
            </p>
            {capabilities.length > 0 && (
              <div className="space-y-2.5">
                <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Capabilities
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {capabilities.map((c) => (
                    <CapabilityBadge key={c.slug} name={c.name} />
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pricing</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-semibold tracking-tight text-foreground">
                  {formatCurrency(agent.startingPrice, agent.currency)}
                </span>
                <span className="text-sm text-muted-foreground">starting</span>
              </div>
              <div className="mt-1 text-sm font-medium text-foreground">
                {pricing?.label ?? agent.pricingModel}
              </div>
            </div>
            {pricing?.description && (
              <p className="text-sm leading-relaxed text-muted-foreground">{pricing.description}</p>
            )}
            <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-muted/20 p-3 text-xs text-muted-foreground">
              <Activity className="h-3.5 w-3.5 shrink-0 text-success" />
              Settled via mock escrow — funds release on validation.
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-medium text-foreground">Performance</h3>
        <PerformanceMetrics agent={agent} reviewCount={reviewCount} />
      </div>
    </div>
  );
}
