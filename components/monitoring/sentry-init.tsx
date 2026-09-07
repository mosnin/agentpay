"use client";

import { useEffect } from "react";

/**
 * Mounted once from the root layout to (maybe) initialize Sentry on the
 * client. Next.js 15.1 doesn't support `instrumentation-client.ts` (that
 * lands in 15.3+), so this client component stands in as the client-side
 * counterpart to instrumentation.ts's `register()`. Renders nothing.
 *
 * Entirely inert when NEXT_PUBLIC_SENTRY_DSN is unset: the effect returns
 * immediately and @sentry/nextjs is never imported. Note this doesn't keep
 * Sentry out of the client bundle — the dynamic import still produces a
 * separate chunk that's part of the build output — it only keeps that
 * chunk from ever being *requested* over the network when there's no DSN,
 * which is the behavior that actually matters for users in a DSN-less
 * environment.
 */
export function SentryInit() {
  useEffect(() => {
    const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
    if (!dsn) return;

    import("@sentry/nextjs")
      .then((Sentry) => {
        Sentry.init({
          dsn,
          tracesSampleRate: 0.1,
        });
      })
      .catch(() => {
        // Monitoring must never break the app — swallow load/init failures.
      });
  }, []);

  return null;
}
