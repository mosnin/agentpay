import { cn } from "@/lib/utils";

export function CapabilityBadge({
  name,
  className,
}: {
  name: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border border-border/60 bg-muted/40 px-2 py-0.5 text-xs font-medium text-muted-foreground transition-colors",
        className,
      )}
    >
      {name}
    </span>
  );
}
