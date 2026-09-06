import { getStatusConfig, PAYMENT_STATUS_CONFIG } from "@/lib/constants";
import { StatusBadge } from "./status-badge";

export function PaymentStatusBadge({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  const config = getStatusConfig(PAYMENT_STATUS_CONFIG, status);
  return <StatusBadge config={{ ...config, label: `Simulated · ${config.label}` }} className={className} />;
}
