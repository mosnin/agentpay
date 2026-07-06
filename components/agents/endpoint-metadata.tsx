import { Globe, Server, Link2Off, type LucideIcon } from "lucide-react";
import { CopyButton } from "@/components/shared/copy-button";
import { cn } from "@/lib/utils";

function EndpointRow({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string | null;
}) {
  return (
    // bg-code stays dark in both themes, so inner text uses fixed light shades.
    <div className="flex flex-col gap-2 rounded-lg border border-border/60 bg-code p-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-2.5">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-white/10 bg-white/[0.04] text-zinc-400">
          <Icon className="h-3.5 w-3.5" />
        </span>
        <div className="min-w-0">
          <div className="text-xs font-medium text-zinc-400">{label}</div>
          {value ? (
            <code className="block truncate font-mono text-xs text-zinc-200">{value}</code>
          ) : (
            <span className="inline-flex items-center gap-1 text-xs text-zinc-500">
              <Link2Off className="h-3 w-3" /> Not configured
            </span>
          )}
        </div>
      </div>
      {value && (
        <CopyButton
          value={value}
          className="shrink-0 self-start border-white/10 bg-white/[0.04] text-zinc-400 hover:bg-white/10 hover:text-zinc-200 sm:self-auto"
        />
      )}
    </div>
  );
}

export function EndpointMetadata({
  endpointUrl,
  mcpServerUrl,
  className,
}: {
  endpointUrl: string | null;
  mcpServerUrl: string | null;
  className?: string;
}) {
  return (
    <div className={cn("space-y-2.5", className)}>
      <EndpointRow icon={Globe} label="Invocation endpoint" value={endpointUrl} />
      <EndpointRow icon={Server} label="MCP server" value={mcpServerUrl} />
    </div>
  );
}
