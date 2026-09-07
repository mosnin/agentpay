"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { track } from "./track";

/**
 * Mounted once from the root layout. Fires a "pageview" beacon on first
 * load and again on every client-side route change.
 *
 * Deliberately watches only the pathname, not the full URL — reading query
 * strings in the App Router needs `useSearchParams()`, which requires a
 * Suspense boundary and opts the page out of static rendering wherever it's
 * used. Mounted at the root layout (every route), that trade-off isn't
 * worth a "page view fired once more precisely" — it would quietly work
 * against this same team's bundle-budget work by forcing dynamic rendering
 * everywhere. track() still records whatever query string is current at
 * the moment any given event fires (see track.ts), so custom events (the
 * funnel helpers) aren't affected — only the automatic pageview beacon
 * skips re-firing on a query-only change.
 *
 * Entirely inert when NEXT_PUBLIC_ANALYTICS_ENDPOINT is unset: track()
 * no-ops before touching the network (see track.ts), and this component
 * does nothing else on its own. Renders nothing.
 */
export function Analytics() {
  const pathname = usePathname();

  useEffect(() => {
    track("pageview");
    // Re-fire on every path change; intentionally NOT re-running for
    // query-only changes (see file header) — pathname is the only input.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  return null;
}
