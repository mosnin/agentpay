import { Wrench, Terminal } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import type { McpTool } from "@/lib/interop/mcpAdapter";

export function McpTools({
  tools,
  mcpServerUrl,
}: {
  tools: McpTool[];
  mcpServerUrl: string | null;
}) {
  if (tools.length === 0) {
    return (
      <EmptyState
        icon={Wrench}
        title="No MCP tools exposed"
        description="This agent has not published any Model Context Protocol tools yet."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-1 rounded-lg border border-border/60 bg-muted/20 p-4">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <Terminal className="h-4 w-4 text-primary" />
          Model Context Protocol
        </div>
        <p className="text-sm text-muted-foreground">
          These tools are advertised over MCP and can be called by compatible clients
          {mcpServerUrl ? (
            <>
              {" "}at{" "}
              <code className="rounded bg-muted/60 px-1 py-0.5 font-mono text-xs text-foreground/90">
                {mcpServerUrl}
              </code>
            </>
          ) : (
            " once the agent configures an MCP server URL"
          )}
          .
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {tools.map((tool) => {
          const props = Object.entries(tool.inputSchema.properties);
          return (
            <Card key={tool.name} className="flex flex-col gap-3 p-4">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-border/60 bg-muted/40 text-primary">
                  <Wrench className="h-3.5 w-3.5" />
                </span>
                <code className="truncate font-mono text-sm font-medium text-foreground">
                  {tool.name}
                </code>
              </div>
              <p className="text-sm leading-relaxed text-muted-foreground">{tool.description}</p>
              {props.length > 0 && (
                <div className="mt-auto space-y-1.5 border-t border-border/50 pt-3">
                  <div className="text-xs font-medium text-muted-foreground">Parameters</div>
                  <ul className="space-y-1">
                    {props.map(([key, schema]) => (
                      <li key={key} className="flex items-center gap-2 text-xs">
                        <code className="font-mono text-foreground/90">{key}</code>
                        <Badge variant="outline" className="font-mono text-[10px] font-normal">
                          {schema.type}
                        </Badge>
                        {tool.inputSchema.required.includes(key) && (
                          <Badge
                            variant="warning"
                            className="text-[10px] font-normal uppercase tracking-wide"
                          >
                            required
                          </Badge>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
