import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Lightweight Edge middleware: adds x-request-id for distributed tracing
// and strips sensitive response headers the app shouldn't expose.
// Route-level auth (requireUser / requireAdmin) is enforced in server
// components and Server Actions — Prisma is not available at Edge runtime.
export function middleware(request: NextRequest) {
  const requestId =
    request.headers.get("x-request-id") ??
    `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

  const response = NextResponse.next({
    request: {
      headers: new Headers({
        ...Object.fromEntries(request.headers.entries()),
        "x-request-id": requestId,
      }),
    },
  });

  // Forward the request ID so the client can correlate logs.
  response.headers.set("x-request-id", requestId);

  // Belt-and-suspenders: strip the Server header if proxies leak it.
  response.headers.delete("X-Powered-By");

  return response;
}

export const config = {
  // Skip Next.js internals and static assets; only run on real routes.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|ico|webp)$).*)"],
};
