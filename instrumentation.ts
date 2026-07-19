import type { Instrumentation } from "next";

/**
 * Next.js instrumentation hook (App Router). Next 15.1 runs `register()`
 * automatically on server startup for both the nodejs and edge runtimes —
 * `experimental.instrumentationHook` was retired; this file just needs to
 * exist at the repo root.
 *
 * Deliberately inert with no build-plugin coupling: no `withSentryConfig`,
 * no next.config.mjs changes, no source-map upload. @sentry/nextjs is only
 * ever dynamically imported here, and only inside a runtime branch — a
 * plain `import "./instrumentation"` (e.g. from tooling or a type-check
 * pass) never touches Sentry at all.
 *
 * With SENTRY_DSN unset, `enabled: Boolean(dsn)` is `false`, so
 * `Sentry.init` still runs (cheaply) but the resulting client never opens a
 * transport or sends anything — @sentry/core's Client constructor no-ops
 * silently whenever `options.dsn` is falsy, and its debug-only log line is
 * gated behind an internal logger that defaults to disabled, so nothing is
 * printed either.
 */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === "nodejs" || process.env.NEXT_RUNTIME === "edge") {
    const Sentry = await import("@sentry/nextjs");

    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      enabled: Boolean(process.env.SENTRY_DSN),
      tracesSampleRate: 0.1,
    });
  }
}

/**
 * Next's server-side request-error hook (App Router, Next 13.4+): called
 * for uncaught errors in route handlers, server components, actions, and
 * middleware. @sentry/nextjs 10.66.0 exports `captureRequestError`, built
 * specifically to forward this hook's exact (error, request, context)
 * signature to Sentry — see
 * node_modules/@sentry/nextjs/build/types/common/captureRequestError.d.ts.
 *
 * Guarded independently of `register()`: with no SENTRY_DSN, this returns
 * before the dynamic import, so an erroring request in a DSN-less
 * environment (local/CI today) never touches @sentry/nextjs at all. Next
 * itself wraps every call to this hook in a try/catch (see
 * node_modules/next/dist/server/base-server.js, `instrumentationOnRequestError`),
 * so a failure here can never crash a request — at worst Next logs it.
 */
export const onRequestError: Instrumentation.onRequestError = async (error, request, context) => {
  if (!process.env.SENTRY_DSN) return;

  const Sentry = await import("@sentry/nextjs");
  Sentry.captureRequestError(error, request, context);
};
