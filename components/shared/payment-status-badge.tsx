import { getStatusConfig, PAYMENT_STATUS_CONFIG } from "@/lib/constants";
import { StatusBadge } from "./status-badge";

export function PaymentStatusBadge({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  return <StatusBadge config={getStatusConfig(PAYMENT_STATUS_CONFIG, status)} className={className} />;
}
