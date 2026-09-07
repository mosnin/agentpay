import { getStatusConfig, PAYMENT_STATUS_CONFIG } from "@/lib/constants";
import { StatusBadge } from "./status-badge";
export function PaymentStatusBadge({
  status,
  provider,
  livemode,
  className,
}: {
  status: string;
  provider?: string;
  livemode?: boolean;
  className?: string;
}) {
  const config = getStatusConfig(PAYMENT_STATUS_CONFIG, status);
  const label =
    provider === "stablecoin"
      ? status === "pending"
        ? "Awaiting wallet funding"
        : `${livemode ? "" : "Test network · "}${status === "escrowed" ? "Funded on-chain" : status === "released" ? "Settled on-chain" : config.label}`
      : provider === "stripe"
        ? `${livemode ? "" : "Test · "}${status === "escrowed" ? "Funded" : status === "released" ? "Transferred to seller" : config.label}`
        : provider === "x402_mock"
          ? `Simulated · ${config.label}`
          : config.label;
  return <StatusBadge config={{ ...config, label }} className={className} />;
}
