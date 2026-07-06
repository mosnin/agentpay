"use client";

import * as React from "react";
import { ElasticSlider } from "@/components/elastic-slider";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/utils";

/** Round up to a "nice" ceiling so the slider's max reads as a round number. */
function niceCeil(n: number): number {
  if (n <= 100) return 100;
  const mag = Math.pow(10, Math.floor(Math.log10(n)));
  return Math.ceil(n / (mag / 2)) * (mag / 2);
}

/**
 * The budget "money moment": an elastic slider carries the common range with
 * tactile rubber-band feedback, while an exact-amount input keeps the value
 * unbounded and precise. The agent's suggested rate is a one-tap anchor.
 */
export function BudgetField({
  value,
  onChange,
  suggestedPrice = 0,
  currency = "USD",
}: {
  value: number;
  onChange: (v: number) => void;
  suggestedPrice?: number;
  currency?: string;
}) {
  const safeValue = Number.isFinite(value) ? value : 0;

  // The slider spans a smart range around the agent's rate (or a $100 floor),
  // and always stretches to fit a hand-typed value above it.
  const sliderMax = React.useMemo(() => {
    const base = niceCeil(Math.max(suggestedPrice * 4, 100));
    return Math.max(base, niceCeil(safeValue));
  }, [suggestedPrice, safeValue]);

  return (
    <div className="space-y-3">
      {/* Empty visible label — the field's <Label> already reads "Budget";
          the slider carries only the live value to avoid duplication. */}
      <ElasticSlider
        label=""
        aria-label="Budget"
        min={0}
        max={sliderMax}
        step={5}
        value={Math.min(safeValue, sliderMax)}
        onValueChange={onChange}
        formatValue={(v) => formatCurrency(v, currency)}
      />

      <div className="flex items-center justify-between gap-3">
        <div className="relative w-32">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
            $
          </span>
          <Input
            id="budget"
            type="number"
            min={0}
            step="0.01"
            inputMode="decimal"
            aria-label="Exact budget amount"
            className="pl-7 font-mono tabular-nums"
            value={Number.isFinite(value) ? String(value) : ""}
            onChange={(e) => onChange(e.target.value === "" ? 0 : Number(e.target.value))}
          />
        </div>

        {suggestedPrice > 0 && (
          <button
            type="button"
            onClick={() => onChange(suggestedPrice)}
            className="text-right text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            Suggested{" "}
            <span className="font-medium text-foreground">
              {formatCurrency(suggestedPrice, currency)}
            </span>
            <span className="ml-1 text-primary">Use</span>
          </button>
        )}
      </div>
    </div>
  );
}
