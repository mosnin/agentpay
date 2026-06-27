"use client";

import * as React from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

const SIZES = { sm: "h-3.5 w-3.5", md: "h-4 w-4", lg: "h-5 w-5" } as const;

export function StarRating({
  rating,
  size = "md",
  showValue = false,
  count,
  onChange,
  className,
}: {
  rating: number;
  size?: keyof typeof SIZES;
  showValue?: boolean;
  count?: number;
  onChange?: (value: number) => void;
  className?: string;
}) {
  const [hover, setHover] = React.useState<number | null>(null);
  const interactive = typeof onChange === "function";
  const display = hover ?? rating;

  return (
    <div className={cn("inline-flex items-center gap-1.5", className)}>
      <div
        className="flex items-center"
        role={interactive ? "radiogroup" : "img"}
        aria-label={
          interactive ? "Rate this agent" : `${rating.toFixed(1)} out of 5 stars`
        }
      >
        {[1, 2, 3, 4, 5].map((i) => {
          const filled = i <= Math.round(display);
          const star = (
            <Star
              className={cn(
                SIZES[size],
                filled ? "fill-amber-400 text-amber-400" : "fill-transparent text-muted-foreground/40",
              )}
            />
          );
          return interactive ? (
            <button
              key={i}
              type="button"
              className="p-0.5 transition-transform hover:scale-110"
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
              onClick={() => onChange?.(i)}
              aria-label={`${i} star${i > 1 ? "s" : ""}`}
            >
              {star}
            </button>
          ) : (
            <span key={i} aria-hidden>
              {star}
            </span>
          );
        })}
      </div>
      {showValue && (
        <span className="text-sm font-medium text-foreground">
          {rating.toFixed(1)}
          {typeof count === "number" && (
            <span className="ml-1 text-xs font-normal text-muted-foreground">({count})</span>
          )}
        </span>
      )}
    </div>
  );
}
