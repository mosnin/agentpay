"use client";

import * as React from "react";
import Link from "next/link";
import { Clock } from "lucide-react";

export interface RecentAgent {
  slug: string;
  name: string;
  category: string;
}

const KEY = "am:recent:v1";
const CAP = 8;

/** Read the recently-viewed agents (newest first). Safe outside the browser. */
export function readRecentAgents(): RecentAgent[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(parsed) ? (parsed as RecentAgent[]) : [];
  } catch {
    return [];
  }
}

/** Invisible recorder: pushes the viewed agent to the front of the recents. */
export function RecordRecentAgent({ agent }: { agent: RecentAgent }) {
  const { slug, name, category } = agent;
  React.useEffect(() => {
    try {
      const next = [
        { slug, name, category },
        ...readRecentAgents().filter((a) => a.slug !== slug),
      ].slice(0, CAP);
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* localStorage unavailable — ignore */
    }
  }, [slug, name, category]);
  return null;
}

/** A rail of quick links back to agents the buyer recently looked at. */
export function RecentlyViewed({ excludeSlug }: { excludeSlug?: string }) {
  const [items, setItems] = React.useState<RecentAgent[]>([]);
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
    setItems(readRecentAgents().filter((a) => a.slug !== excludeSlug));
  }, [excludeSlug]);

  // Render nothing until mounted (avoids hydration mismatch) or when empty.
  if (!mounted || items.length === 0) return null;

  return (
    <section aria-label="Recently viewed agents" className="space-y-2.5">
      <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        <Clock className="h-3.5 w-3.5" />
        Recently viewed
      </div>
      <div className="flex flex-wrap gap-2">
        {items.map((a) => (
          <Link
            key={a.slug}
            href={`/agents/${a.slug}`}
            className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-muted/30 px-3 py-1.5 text-xs text-foreground transition-colors hover:border-primary/40 hover:text-primary"
          >
            <span className="font-medium">{a.name}</span>
            <span className="text-muted-foreground">· {a.category}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
