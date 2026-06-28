import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Lightweight Edge middleware: injects x-request-id for distributed tracing.
// Route-level auth (requireUser / requireAdmin) is enforced in server
// components and Server Actions — Prisma is not available at Edge runtime.
export function middleware(request: NextRequest) {
  const requestId =
    request.headers.get("x-request-id") ??
    `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

  const response = NextResponse.next();
  response.headers.set("x-request-id", requestId);
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|ico|webp)$).*)"],
};
