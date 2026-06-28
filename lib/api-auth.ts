import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

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

/** Extract a best-effort IP key for rate limiting from a Request. */
export function getRateLimitKey(request: Request): string {
  const forwarded = (request as Request & { headers: Headers }).headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() ?? "unknown";
}
