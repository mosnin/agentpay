import { getStatusConfig, TASK_STATUS_CONFIG } from "@/lib/constants";
import { StatusBadge } from "./status-badge";

export function TaskStatusBadge({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  return <StatusBadge config={getStatusConfig(TASK_STATUS_CONFIG, status)} className={className} />;
}
