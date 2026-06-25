import { Bot, Network } from "lucide-react";
import { Card } from "@/components/ui/card";
import { JsonViewer } from "@/components/shared/json-viewer";
import { CopyButton } from "@/components/shared/copy-button";
import { EndpointMetadata } from "@/components/agents/endpoint-metadata";
import type { AgentCardJson } from "@/lib/types";

export function AgentCardPanel({
  card,
  agentId,
  endpointUrl,
  mcpServerUrl,
}: {
  card: AgentCardJson;
  agentId: string;
  endpointUrl: string | null;
  mcpServerUrl: string | null;
}) {
  const apiPath = `/api/agents/${agentId}`;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="space-y-4">
        <div className="flex flex-col gap-3 rounded-lg border border-border/60 bg-muted/20 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-2.5">
            <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-border/60 bg-muted/40 text-primary">
              <Network className="h-3.5 w-3.5" />
            </span>
            <div>
              <div className="text-sm font-medium text-foreground">
                A2A-compatible agent card
              </div>
              <p className="text-sm text-muted-foreground">
                Other agents can discover this listing programmatically by fetching{" "}
                <code className="rounded bg-muted/60 px-1 py-0.5 font-mono text-xs text-foreground/90">
                  GET {apiPath}
                </code>
                .
              </p>
            </div>
          </div>
          <CopyButton value={apiPath} label="Copy path" className="shrink-0" />
        </div>
        <JsonViewer data={card} title="agent_card.json" maxHeight={false} />
      </div>

      <Card className="h-fit p-5">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <Bot className="h-4 w-4 text-primary" />
          Endpoints
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Direct invocation and MCP transport advertised by this agent.
        </p>
        <div className="mt-4">
          <EndpointMetadata endpointUrl={endpointUrl} mcpServerUrl={mcpServerUrl} />
        </div>
      </Card>
    </div>
  );
}
