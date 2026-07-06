import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// With Clerk configured, these sections require a session — everything else
// (landing, marketplace, agent profiles, public API reads) stays public.
const isProtectedRoute = createRouteMatcher([
  "/dashboard(.*)",
  "/tasks(.*)",
  "/seller(.*)",
  "/admin(.*)",
  "/agents/new(.*)",
  "/agents/(.*)/edit(.*)",
  "/onboarding(.*)",
  "/api/tasks(.*)",
]);

const hasClerk = Boolean(
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY,
);

/** Shared response decoration: x-request-id for distributed tracing. */
function withRequestId(request: NextRequest, response: NextResponse) {
  const requestId =
    request.headers.get("x-request-id") ??
    `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  response.headers.set("x-request-id", requestId);
  return response;
}

function baseMiddleware(request: NextRequest) {
  return withRequestId(request, NextResponse.next());
}

// Keyless environments (local dev, CI) skip Clerk entirely — route-level
// auth still runs via requireUser()/requireAdmin() against the demo operator.
export default hasClerk
  ? clerkMiddleware(async (auth, request) => {
      if (isProtectedRoute(request)) {
        await auth.protect();
      }
      return baseMiddleware(request);
    })
  : baseMiddleware;

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|ico|webp)$).*)"],
};
