"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, SlidersHorizontal, X, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CategoryIcon } from "@/components/shared/category-icon";
import { CATEGORIES, PRICING_MODELS, MARKETPLACE_SORTS } from "@/lib/constants";
import { cn } from "@/lib/utils";

const RATING_OPTIONS = [
  { value: "0", label: "Any rating" },
  { value: "4", label: "4.0+ stars" },
  { value: "4.5", label: "4.5+ stars" },
  { value: "4.8", label: "4.8+ stars" },
] as const;

// Sentinel used by Radix Select since it disallows empty-string item values.
const ANY = "__any__";
const DEFAULT_SORT = "reputation";

export interface MarketplaceFiltersProps {
  q?: string;
  category?: string;
  pricingModel?: string;
  minRating?: string;
  verified?: boolean;
  sort?: string;
  categoryCounts?: Record<string, number>;
  totalCount?: number;
}

export function MarketplaceFilters({
  q = "",
  category = "",
  pricingModel = "",
  minRating = "0",
  verified = false,
  sort = DEFAULT_SORT,
  categoryCounts = {},
  totalCount,
}: MarketplaceFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  // Local mirror of the search box so typing stays snappy while we debounce
  // the URL update that triggers the server re-render.
  const [search, setSearch] = useState(q);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep the input in sync when the URL changes externally (e.g. Clear filters,
  // back/forward navigation).
  useEffect(() => {
    setSearch(q);
  }, [q]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const pushParams = useCallback(
    (mutate: (params: URLSearchParams) => void) => {
      const params = new URLSearchParams(searchParams.toString());
      mutate(params);
      const query = params.toString();
      startTransition(() => {
        router.replace(query ? `/marketplace?${query}` : "/marketplace", {
          scroll: false,
        });
      });
    },
    [router, searchParams],
  );

  const setParam = useCallback(
    (key: string, value: string | null) => {
      pushParams((params) => {
        if (value && value !== ANY && value !== "0") params.set(key, value);
        else params.delete(key);
      });
    },
    [pushParams],
  );

  const handleSearchChange = useCallback(
    (value: string) => {
      setSearch(value);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        pushParams((params) => {
          const trimmed = value.trim();
          if (trimmed) params.set("q", trimmed);
          else params.delete("q");
        });
      }, 350);
    },
    [pushParams],
  );

  const toggleCategory = useCallback(
    (value: string) => {
      setParam("category", category === value ? null : value);
    },
    [category, setParam],
  );

  const clearFilters = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setSearch("");
    startTransition(() => {
      router.replace("/marketplace", { scroll: false });
    });
  }, [router]);

  const activeFilterCount =
    (q ? 1 : 0) +
    (category ? 1 : 0) +
    (pricingModel ? 1 : 0) +
    (minRating && minRating !== "0" ? 1 : 0) +
    (verified ? 1 : 0) +
    (sort && sort !== DEFAULT_SORT ? 1 : 0);

  const hasActiveFilters = activeFilterCount > 0;

  return (
    <div className="space-y-4">
      {/* Primary row: search + sort + advanced toggle */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search agents, capabilities, or keywords…"
            aria-label="Search agents"
            className="h-10 pl-9 pr-9"
          />
          {pending ? (
            <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
          ) : (
            search && (
              <button
                type="button"
                onClick={() => handleSearchChange("")}
                aria-label="Clear search"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-sm p-0.5 text-muted-foreground transition-colors hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )
          )}
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden items-center gap-2 sm:flex">
            <Label
              htmlFor="sort"
              className="shrink-0 text-xs font-medium text-muted-foreground"
            >
              Sort
            </Label>
            <Select
              value={sort || DEFAULT_SORT}
              onValueChange={(v) =>
                setParam("sort", v === DEFAULT_SORT ? null : v)
              }
            >
              <SelectTrigger id="sort" className="h-10 w-[170px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                {MARKETPLACE_SORTS.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            type="button"
            variant="outline"
            className="h-10 gap-2"
            onClick={() => setAdvancedOpen((o) => !o)}
            aria-expanded={advancedOpen}
            aria-controls="advanced-filters"
          >
            <SlidersHorizontal className="h-4 w-4" />
            <span className="hidden sm:inline">Filters</span>
            {activeFilterCount > 0 && (
              <span className="ml-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-semibold text-primary-foreground">
                {activeFilterCount}
              </span>
            )}
          </Button>
        </div>
      </div>

      {/* Category pill row */}
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <CategoryPill
          active={!category}
          label="All"
          count={Object.values(categoryCounts).reduce((a, b) => a + b, 0) || totalCount}
          onClick={() => setParam("category", null)}
        />
        {CATEGORIES.map((c) => (
          <CategoryPill
            key={c.value}
            value={c.value}
            label={c.label}
            count={categoryCounts[c.value]}
            active={category === c.value}
            onClick={() => toggleCategory(c.value)}
          />
        ))}
      </div>

      {/* Advanced filters panel */}
      {advancedOpen && (
        <div
          id="advanced-filters"
          className="grid grid-cols-1 gap-4 rounded-xl border border-border/70 bg-card/40 p-4 sm:grid-cols-2 lg:grid-cols-4"
        >
          {/* Sort (mobile lives here too) */}
          <div className="space-y-1.5 sm:hidden">
            <Label className="text-xs font-medium text-muted-foreground">
              Sort
            </Label>
            <Select
              value={sort || DEFAULT_SORT}
              onValueChange={(v) =>
                setParam("sort", v === DEFAULT_SORT ? null : v)
              }
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                {MARKETPLACE_SORTS.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">
              Pricing model
            </Label>
            <Select
              value={pricingModel || ANY}
              onValueChange={(v) => setParam("pricingModel", v)}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Any model" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ANY}>Any model</SelectItem>
                {PRICING_MODELS.map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">
              Minimum rating
            </Label>
            <Select
              value={minRating && minRating !== "0" ? minRating : ANY}
              onValueChange={(v) => setParam("minRating", v === ANY ? null : v)}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Any rating" />
              </SelectTrigger>
              <SelectContent>
                {RATING_OPTIONS.map((r) => (
                  <SelectItem
                    key={r.value}
                    value={r.value === "0" ? ANY : r.value}
                  >
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-end">
            <label
              htmlFor="verified-only"
              className="flex h-9 w-full cursor-pointer items-center justify-between gap-3 rounded-md border border-input bg-transparent px-3 text-sm"
            >
              <span className="font-medium text-foreground">Verified only</span>
              <Switch
                id="verified-only"
                checked={verified}
                onCheckedChange={(checked) =>
                  setParam("verified", checked ? "true" : null)
                }
                aria-label="Show verified agents only"
              />
            </label>
          </div>

          {hasActiveFilters && (
            <div className="sm:col-span-2 lg:col-span-4">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="gap-1.5 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
                Clear all filters
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function CategoryPill({
  value,
  label,
  count,
  active,
  onClick,
}: {
  value?: string;
  label: string;
  count?: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
        active
          ? "border-primary/40 bg-primary/15 text-primary"
          : "border-border/70 bg-card/40 text-muted-foreground hover:border-border hover:bg-muted/50 hover:text-foreground",
      )}
    >
      {value && (
        <CategoryIcon
          category={value}
          className={cn("h-3.5 w-3.5", active ? "text-primary" : "")}
        />
      )}
      {label}
      {typeof count === "number" && (
        <span
          className={cn(
            "tabular-nums",
            active ? "text-primary/70" : "text-muted-foreground/60",
          )}
        >
          {count}
        </span>
      )}
    </button>
  );
}
