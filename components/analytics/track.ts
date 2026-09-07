/**
 * Privacy-friendly, cookieless analytics — the `track()` core.
 *
 * Entirely inert until NEXT_PUBLIC_ANALYTICS_ENDPOINT is set: every call
 * below returns before touching the network, so an unconfigured environment
 * (the default — nothing in .env.example sets this) sends nothing, not even
 * a request to a dead endpoint. No fake/local-only events are ever recorded
 * in place of a real send; "not configured" means "no-op", full stop.
 *
 * When it IS configured, this is deliberately NOT a session/user tracker:
 * no cookies, no localStorage-backed visitor id, no fingerprinting. Each
 * call is a single anonymous, fire-and-forget beacon carrying only the
 * event name, the caller-supplied props, the current path, and the
 * document referrer — the same minimal shape privacy-first tools like
 * Plausible/Umami/Fathom send. Bring your own collector (a serverless
 * function, a self-hosted Umami/Plausible-compatible endpoint, anything
 * that accepts a POST body) and point NEXT_PUBLIC_ANALYTICS_ENDPOINT at it;
 * see this team's report for the exact payload shape.
 *
 * Client-only by design (uses window/navigator/document) — call track()
 * and the helpers below from client components and event handlers, not
 * from server actions or Server Components. The `typeof window` guard
 * makes an accidental server-side call a silent no-op rather than a crash.
 */

export type AnalyticsPropValue = string | number | boolean | null | undefined;
export type AnalyticsProps = Record<string, AnalyticsPropValue>;

interface BeaconPayload {
  event: string;
  props: AnalyticsProps;
  websiteId?: string;
  url: string;
  referrer?: string;
  timestamp: string;
}

/** True when the visitor has requested not to be tracked (best-effort — DNT is inconsistently implemented/deprecated across browsers, so this is a courtesy check, not a guarantee). */
function hasDoNotTrack(): boolean {
  const dnt =
    navigator.doNotTrack ??
    (window as unknown as { doNotTrack?: string }).doNotTrack ??
    (navigator as unknown as { msDoNotTrack?: string }).msDoNotTrack;
  return dnt === "1" || dnt === "yes";
}

function sendBeacon(payload: BeaconPayload, endpoint: string): void {
  const body = JSON.stringify(payload);

  try {
    if (typeof navigator.sendBeacon === "function") {
      const blob = new Blob([body], { type: "application/json" });
      if (navigator.sendBeacon(endpoint, blob)) return;
      // sendBeacon returning false means it declined to queue the request
      // (payload too large, browser-imposed limit, ...) — fall through to
      // fetch rather than silently dropping the event.
    }
  } catch {
    // Some environments (older WebViews, locked-down extensions) throw on
    // sendBeacon itself rather than returning false — fall through too.
  }

  try {
    void fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true, // survives the page unload that fetch() alone wouldn't
      credentials: "omit", // cookieless by design — never sends this origin's cookies
    }).catch(() => {
      // Analytics must never surface an error to the user.
    });
  } catch {
    // Never let analytics break the app.
  }
}

/**
 * Record an analytics event. No-ops silently — no network request at all —
 * when NEXT_PUBLIC_ANALYTICS_ENDPOINT is unset, when called outside the
 * browser, or when the visitor has Do Not Track enabled.
 *
 * @param event Event name (e.g. "pageview", "firstTaskCreated"). Free-form,
 *   but prefer the named helpers below for the four funnel milestones so the
 *   event vocabulary stays consistent across call sites.
 * @param props Optional flat key/value bag attached to the event. Keep it
 *   small and non-sensitive — this leaves the browser over the network.
 */
export function track(event: string, props?: AnalyticsProps): void {
  if (typeof window === "undefined") return;

  const endpoint = process.env.NEXT_PUBLIC_ANALYTICS_ENDPOINT;
  if (!endpoint) return;

  try {
    if (hasDoNotTrack()) return;
  } catch {
    // Any weirdness reading DNT state falls through and still fires the
    // event — the check is a courtesy, not the gate that matters (the
    // endpoint env var is), so it must never be the reason an event is lost.
  }

  const payload: BeaconPayload = {
    event,
    props: props ?? {},
    websiteId: process.env.NEXT_PUBLIC_ANALYTICS_WEBSITE_ID || undefined,
    url: `${window.location.pathname}${window.location.search}`,
    referrer: document.referrer || undefined,
    timestamp: new Date().toISOString(),
  };

  sendBeacon(payload, endpoint);
}

// ---------------------------------------------------------------------------
// Named funnel helpers — the four milestones this workstream was asked to
// instrument. Each is a thin, literally-named wrapper around track() so
// every call site uses the same event string. "First" in the name describes
// funnel *intent* (these are the events a dashboard funnel would key off
// to find each user's first occurrence), not a client-side gate — the
// helper fires every time its milestone happens, same as track() for any
// other event; de-duplicating to "first per user" is a query-time concern
// for whatever reads these events, not something guessed at client-side
// (which would risk mislabeling e.g. a user who already had tasks before
// this instrumentation shipped).
//
// See this team's report for the exact file + line each helper should be
// called from — those call sites live in files outside this workstream's
// ownership, so they aren't wired up here.
// ---------------------------------------------------------------------------

/** A visitor began the sign-up flow (submitted the initial create-account form). */
export function trackSignupStarted(props?: AnalyticsProps): void {
  track("signupStarted", props);
}

/** A user completed the onboarding wizard (completeOnboarding succeeded). */
export function trackOnboardingCompleted(props?: AnalyticsProps): void {
  track("onboardingCompleted", props);
}

/** A user created a task (createTask succeeded). */
export function trackFirstTaskCreated(props?: AnalyticsProps): void {
  track("firstTaskCreated", props);
}

/** A task reached completion with payment released (approveTask succeeded). */
export function trackFirstTaskCompleted(props?: AnalyticsProps): void {
  track("firstTaskCompleted", props);
}
