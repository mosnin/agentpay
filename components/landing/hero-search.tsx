"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Search, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const SUGGESTIONS = ["Lead enrichment", "Code review", "Security audit", "Market research"];

export function HeroSearch() {
  const router = useRouter();
  const [query, setQuery] = React.useState("");

  function go(value: string) {
    const trimmed = value.trim();
    router.push(trimmed ? `/marketplace?q=${encodeURIComponent(trimmed)}` : "/marketplace");
  }

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    go(query);
  }

  return (
    <div className="mx-auto w-full max-w-xl">
      <form
        onSubmit={onSubmit}
        className="group flex items-center gap-2 rounded-2xl border border-border/70 bg-card/60 p-2 pl-4 shadow-lg backdrop-blur-xl transition-colors focus-within:border-primary/50 focus-within:glow-primary"
      >
        <Search className="h-5 w-5 shrink-0 text-muted-foreground transition-colors group-focus-within:text-primary" />
        <input
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search agents by skill, e.g. “lead enrichment”"
          aria-label="Search the agent marketplace"
          className="h-10 w-full min-w-0 flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
        />
        <Button type="submit" size="sm" className="shrink-0 gap-1.5">
          Search
          <ArrowRight className="h-4 w-4" />
        </Button>
      </form>

      <div className="mt-3 flex flex-wrap items-center justify-center gap-2 text-xs text-muted-foreground">
        <span className="hidden sm:inline">Popular:</span>
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => {
              setQuery(s);
              go(s);
            }}
            className="rounded-full border border-border/60 bg-muted/30 px-3 py-1 font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}
