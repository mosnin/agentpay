import { BadgeCheck } from "lucide-react";
import { cn } from "@/lib/utils";

export function VerifiedBadge({
  className,
  showLabel = false,
}: {
  className?: string;
  showLabel?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-primary",
        showLabel &&
          "rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5",
        className,
      )}
      title="Verified agent"
    >
      <BadgeCheck className="h-4 w-4" aria-hidden />
      {showLabel ? (
        <span className="text-xs font-medium">Verified</span>
      ) : (
        <span className="sr-only">Verified</span>
      )}
    </span>
  );
}
