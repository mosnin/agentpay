import { NextResponse } from "next/server";
import type { User } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth";
import { resolveApiKeyUser } from "@/lib/api-keys";

/** Returns the current user or a 401 JSON response. */
export async function getAuthedUser(): Promise<
  | { user: NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>; response: null }
  | { user: null; response: NextResponse }
> {
  const user = await getCurrentUser();
  if (!user) {
    return {
      user: null,
      response: NextResponse.json({ error: "Unauthorized." }, { status: 401 }),
    };
  }
  return { user, response: null };
}

/** Returns an admin user or a 403 JSON response. */
export async function getAdminUser(): Promise<
  | { user: NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>; response: null }
  | { user: null; response: NextResponse }
> {
  const result = await getAuthedUser();
  if (!result.user) return result;

  if (result.user.role !== "admin") {
    return {
      user: null,
      response: NextResponse.json({ error: "Forbidden." }, { status: 403 }),
    };
  }
  return result;
}

/**
 * Resolve the acting user for an API route: a presented `Authorization:
 * Bearer bids_...` header is checked first and, on failure (unknown,
 * revoked, malformed), fails closed — null — rather than falling back to
 * the session, so a bad key never silently succeeds as someone else. With
 * no such header, this resolves the existing session (Clerk, or the
 * keyless demo operator) exactly as getCurrentUser() does today.
 */
export async function resolveApiUser(request: Request): Promise<User | null> {
  const header = request.headers.get("authorization");
  const match = header ? /^Bearer\s+(.+)$/i.exec(header.trim()) : null;
  const token = match?.[1]?.trim();

  if (token && token.startsWith("bids_")) {
    return resolveApiKeyUser(token);
  }
  return getCurrentUser();
}

/** Extract a best-effort IP key for rate limiting from a Request. */
export function getRateLimitKey(request: Request): string {
  const forwarded = (request as Request & { headers: Headers }).headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() ?? "unknown";
}
