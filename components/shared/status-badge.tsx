import { cn } from "@/lib/utils";
import {
  getStatusConfig,
  VALIDATION_STATUS_CONFIG,
  AGENT_STATUS_CONFIG,
  DISPUTE_STATUS_CONFIG,
  type StatusConfig,
} from "@/lib/constants";

export function StatusBadge({
  config,
  className,
}: {
  config: StatusConfig;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-medium",
        config.className,
        className,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", config.dot)} />
      {config.label}
    </span>
  );
}

export function ValidationStatusBadge({ status, className }: { status: string; className?: string }) {
  return <StatusBadge config={getStatusConfig(VALIDATION_STATUS_CONFIG, status)} className={className} />;
}

export function AgentStatusBadge({ status, className }: { status: string; className?: string }) {
  return <StatusBadge config={getStatusConfig(AGENT_STATUS_CONFIG, status)} className={className} />;
}

export function DisputeStatusBadge({ status, className }: { status: string; className?: string }) {
  return <StatusBadge config={getStatusConfig(DISPUTE_STATUS_CONFIG, status)} className={className} />;
}
