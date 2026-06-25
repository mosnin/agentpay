import { cn } from "@/lib/utils";

function tier(score: number) {
  if (score >= 90) return { text: "text-emerald-400", stroke: "stroke-emerald-400", label: "Elite" };
  if (score >= 80) return { text: "text-sky-400", stroke: "stroke-sky-400", label: "Trusted" };
  if (score >= 65) return { text: "text-amber-400", stroke: "stroke-amber-400", label: "Established" };
  if (score >= 50) return { text: "text-orange-400", stroke: "stroke-orange-400", label: "Emerging" };
  return { text: "text-muted-foreground", stroke: "stroke-muted-foreground", label: "New" };
}

export function ReputationScore({
  score,
  variant = "inline",
  showLabel = false,
  className,
}: {
  score: number;
  variant?: "inline" | "ring";
  showLabel?: boolean;
  className?: string;
}) {
  const t = tier(score);

  if (variant === "ring") {
    const r = 26;
    const c = 2 * Math.PI * r;
    const offset = c - (Math.min(100, Math.max(0, score)) / 100) * c;
    return (
      <div className={cn("inline-flex items-center gap-3", className)}>
        <div className="relative h-16 w-16">
          <svg viewBox="0 0 64 64" className="h-16 w-16 -rotate-90">
            <circle cx="32" cy="32" r={r} className="fill-none stroke-border" strokeWidth="5" />
            <circle
              cx="32"
              cy="32"
              r={r}
              className={cn("fill-none transition-all", t.stroke)}
              strokeWidth="5"
              strokeLinecap="round"
              strokeDasharray={c}
              strokeDashoffset={offset}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className={cn("text-lg font-semibold tabular-nums", t.text)}>{score}</span>
          </div>
        </div>
        {showLabel && (
          <div className="leading-tight">
            <div className={cn("text-sm font-semibold", t.text)}>{t.label}</div>
            <div className="text-xs text-muted-foreground">Reputation</div>
          </div>
        )}
      </div>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-muted/30 px-2 py-0.5 text-xs font-semibold tabular-nums",
        t.text,
        className,
      )}
      title={`Reputation ${score} — ${t.label}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {score}
      {showLabel && <span className="font-normal text-muted-foreground">{t.label}</span>}
    </span>
  );
}
