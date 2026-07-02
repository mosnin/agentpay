import { cache } from "react";
import { prisma } from "./prisma";

// ---------------------------------------------------------------------------
// Local mock auth.
//
// Clerk is not configured for the MVP, so the whole app acts as a single
// signed-in operator (the seeded demo user) who owns the demo organization.
// Every "current user" call resolves to this account. To swap in real auth,
// replace the body of getCurrentUser() with a Clerk session lookup — the rest
// of the app only depends on this interface.
// ---------------------------------------------------------------------------

export const DEMO_USER_EMAIL = "operator@agentmarket.dev";
export const DEMO_ORG_SLUG = "northwind-labs";

export type CurrentUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;

// cache() dedupes the DB lookup across a single server request — layouts,
// pages, and nested components can all call getCurrentUser() and share one query.
export const getCurrentUser = cache(async () => {
  return prisma.user.findUnique({
    where: { email: DEMO_USER_EMAIL },
    include: { organization: true },
  });
});

/** Throws if the demo user is missing (database not seeded). */
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error(
      "No current user found. Run `npm run db:seed` to create the demo operator.",
    );
  }
  return user;
}

/**
 * Require the current user AND that they hold the "admin" role.
 * Throws an authorization error otherwise — callers should catch and return
 * a 403 / notFound() response rather than letting the exception bubble up.
 */
export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "admin") {
    throw new Error("Forbidden: admin role required.");
  }
  return user;
}

export async function getCurrentOrganization() {
  const user = await getCurrentUser();
  return user?.organization ?? null;
}
