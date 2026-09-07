import { cn } from "@/lib/utils";
/** Legacy activity index; never presented as the verified trust model. */
export function ReputationScore({
  score,
  className,
}: {
  score: number;
  variant?: "inline" | "ring";
  showLabel?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn("text-xs text-muted-foreground", className)}
      title="Legacy activity index includes unverified and test history; it is not a trust score."
    >
      Activity index {Math.round(score)}
    </span>
  );
}
