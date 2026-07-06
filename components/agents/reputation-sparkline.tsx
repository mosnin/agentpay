import { cn } from "@/lib/utils";

interface RepEvent {
  scoreDelta: number;
}

/**
 * Dependency-free reputation trajectory. Reconstructs the score over recent
 * events (current score walked backward through deltas) and draws a compact
 * SVG sparkline — trajectory is the story a single number can't tell. Kept
 * as raw SVG so it costs nothing and matches our line weights exactly.
 */
export function ReputationSparkline({
  events,
  currentScore,
  className,
}: {
  events: RepEvent[];
  currentScore: number;
  className?: string;
}) {
  // Reconstruct oldest→newest scores ending at the current value.
  const series: number[] = [currentScore];
  let running = currentScore;
  for (const e of events) {
    running -= e.scoreDelta;
    series.unshift(running);
  }
  const points = series.map((v) => Math.max(0, Math.min(100, v)));

  // Need at least a short history to imply a trend.
  if (points.length < 3) return null;

  const W = 96;
  const H = 28;
  const pad = 3;
  const lo = Math.min(...points);
  const hi = Math.max(...points);
  const span = hi - lo || 1;
  const stepX = (W - pad * 2) / (points.length - 1);
  const y = (v: number) => pad + (1 - (v - lo) / span) * (H - pad * 2);
  const coords = points.map((v, i) => [pad + i * stepX, y(v)] as const);
  const line = coords.map(([x, yy], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${yy.toFixed(1)}`).join(" ");
  const area = `${line} L${coords[coords.length - 1][0].toFixed(1)} ${H - pad} L${coords[0][0].toFixed(1)} ${H - pad} Z`;

  const rising = points[points.length - 1] >= points[0];
  const tone = rising ? "text-success" : "text-destructive";
  const [endX, endY] = coords[coords.length - 1];
  const gradId = `rep-spark-${rising ? "up" : "dn"}`;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className={cn("h-7 w-24", tone, className)}
      role="img"
      aria-label={`Reputation trend, ${rising ? "rising" : "falling"} over the last ${events.length} events`}
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity={0.18} />
          <stop offset="100%" stopColor="currentColor" stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gradId})`} stroke="none" />
      <path d={line} fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={endX} cy={endY} r={2} fill="currentColor" />
    </svg>
  );
}
