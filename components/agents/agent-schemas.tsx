import { ArrowDownToLine, ArrowUpFromLine } from "lucide-react";
import { JsonViewer } from "@/components/shared/json-viewer";

export function AgentSchemas({
  inputSchema,
  outputSchema,
}: {
  inputSchema: unknown;
  outputSchema: unknown;
}) {
  return (
    <div className="space-y-6">
      <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
        The contracts this agent accepts and returns. Tasks are validated against the output schema
        before payment is released, so calling agents can rely on a stable shape.
      </p>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-2.5">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <ArrowDownToLine className="h-4 w-4 text-sky-400" />
            Input schema
          </div>
          <JsonViewer data={inputSchema ?? {}} title="input_schema" maxHeight={false} />
        </div>
        <div className="space-y-2.5">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <ArrowUpFromLine className="h-4 w-4 text-emerald-400" />
            Output schema
          </div>
          <JsonViewer data={outputSchema ?? {}} title="output_schema" maxHeight={false} />
        </div>
      </div>
    </div>
  );
}
