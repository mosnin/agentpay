import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "./prisma";
import { resolveApiKeyUser } from "./api-keys";

// ---------------------------------------------------------------------------
// Auth — Clerk when configured, demo operator otherwise.
//
// When NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY + CLERK_SECRET_KEY are set, every
// "current user" call resolves the Clerk session and just-in-time provisions
// a local User row (matched by email so pre-existing accounts — including the
// seeded admin — adopt their Clerk identity on first sign-in).
//
// Without keys the app runs keyless as the seeded demo operator, so local
// dev, CI, and preview environments need no Clerk account. This mirrors the
// payments layer's mock/live switch (lib/payments/x402Adapter.ts).
//
// Authorization stays in the database either way: `role` on User is the
// source of truth (promote an account with: UPDATE "User" SET role='admin').
// ---------------------------------------------------------------------------

export const DEMO_USER_EMAIL = "operator@bids.sh";
export const DEMO_ORG_SLUG = "northwind-labs";

/**
 * Comma-separated ADMIN_EMAILS get the admin role automatically at sign-in —
 * promotion only, never demotion, so removing an address from the list does
 * not strip a role that was granted by other means.
 */
function isAllowlistedAdmin(email: string): boolean {
  const raw = process.env.ADMIN_EMAILS;
  if (!raw) return false;
  return raw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
    .includes(email.toLowerCase());
}

/** True when Clerk is configured (server-side check — both keys present). */
export function isClerkEnabled() {
  return Boolean(
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY,
  );
}

export type CurrentUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;

async function getClerkBackedUser() {
  const { userId: clerkId } = await auth();
  if (!clerkId) return null;

  const existing = await prisma.user.findUnique({
    where: { clerkId },
    include: { organization: true },
  });
  if (existing) {
    if (existing.role !== "admin" && isAllowlistedAdmin(existing.email)) {
      return prisma.user.update({
        where: { id: existing.id },
        data: { role: "admin" },
        include: { organization: true },
      });
    }
    return existing;
  }

  // First request for this Clerk identity — provision (or adopt) a local row.
  const cu = await currentUser();
  if (!cu) return null;
  const email =
    cu.primaryEmailAddress?.emailAddress ??
    cu.emailAddresses[0]?.emailAddress ??
    `${clerkId}@users.bids.sh`;
  const name =
    [cu.firstName, cu.lastName].filter(Boolean).join(" ").trim() ||
    cu.username ||
    null;
  const admin = isAllowlistedAdmin(email);

  return prisma.user.upsert({
    where: { email },
    update: {
      clerkId,
      name: name ?? undefined,
      image: cu.imageUrl,
      ...(admin ? { role: "admin" } : {}),
    },
    create: {
      email,
      clerkId,
      name,
      image: cu.imageUrl,
      ...(admin ? { role: "admin" } : {}),
    },
    include: { organization: true },
  });
}

/**
 * A `bids_` bearer key on the incoming request identifies a headless agent.
 * Returns undefined when no such key was presented (fall through to session
 * auth), null when one was presented but is unknown/revoked (fail closed —
 * a bad key must never silently become someone's session), or the key
 * owner. Mirrors resolveApiUser() in lib/api-auth.ts; this request-scoped
 * variant exists so requireUser() inside server actions and helpers sees
 * the same actor the route gate resolved — even in Clerk deployments where
 * a headless request has no cookie session to fall back on.
 */
async function getBearerKeyUser() {
  let authorization: string | null;
  try {
    authorization = (await headers()).get("authorization");
  } catch {
    // Outside a request scope (build-time prerender) there is no header.
    return undefined;
  }
  const match = authorization ? /^Bearer\s+(.+)$/i.exec(authorization.trim()) : null;
  const token = match?.[1]?.trim();
  if (!token || !token.startsWith("bids_")) return undefined;

  const keyUser = await resolveApiKeyUser(token);
  if (!keyUser) return null;
  return prisma.user.findUnique({
    where: { id: keyUser.id },
    include: { organization: true },
  });
}

// cache() dedupes the lookup across a single server request — layouts,
// pages, and actions can all call getCurrentUser() and share one query.
export const getCurrentUser = cache(async () => {
  const bearer = await getBearerKeyUser();
  if (bearer !== undefined) return bearer;

  if (isClerkEnabled()) {
    return getClerkBackedUser();
  }
  return prisma.user.findUnique({
    where: { email: DEMO_USER_EMAIL },
    include: { organization: true },
  });
});

/** Throws if there is no signed-in user (or, keyless, if the DB isn't seeded). */
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error(
      isClerkEnabled()
        ? "Not signed in."
        : "No current user found. Run `npm run db:seed` to create the demo operator.",
    );
  }
  return user;
}

/**
 * Require the current user AND that they've completed the onboarding wizard.
 * Only enforced with Clerk configured — the keyless demo operator is a fixed
 * fallback identity, not a real signup, so it's never sent through onboarding.
 * Use this instead of requireUser() in protected PAGES; server actions and
 * API routes should keep using requireUser()/requireAdmin() directly, since
 * redirecting mid-mutation doesn't make sense there.
 */
export async function requireOnboardedUser() {
  const user = await requireUser();
  if (isClerkEnabled() && !user.onboardedAt) {
    redirect("/onboarding");
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
