import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "./prisma";
import { resolveApiKeyUser, type ApiScope } from "./api-keys";

// ---------------------------------------------------------------------------
// Auth — Clerk when configured, demo operator otherwise.
//
// When NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY + CLERK_SECRET_KEY are set, every
// "current user" call resolves the Clerk session and just-in-time provisions
// a local User row (matched by email so pre-existing accounts — including the
// seeded admin — adopt their Clerk identity on first sign-in).
//
// Without keys, only explicit NEXT_PUBLIC_BIDS_PAYMENT_MODE=demo enables the
// seeded local operator. All other environments require a session or valid
// bearer credential; missing configuration never silently grants admin access.
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
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY &&
      process.env.CLERK_SECRET_KEY,
  );
}

export type CurrentUser = NonNullable<
  Awaited<ReturnType<typeof getCurrentUser>>
>;

async function getClerkBackedUser() {
  const { userId: clerkId } = await auth();
  if (!clerkId) return null;

  const cu = await currentUser();
  // Never adopt an account or grant an email-based role from an unverified
  // provider attribute. Bind the profile to the authenticated session as well.
  const primary = cu?.primaryEmailAddress;
  if (
    !cu ||
    cu.id !== clerkId ||
    !primary ||
    primary.verification?.status !== "verified"
  )
    return null;
  const email = primary.emailAddress;
  const name =
    [cu.firstName, cu.lastName].filter(Boolean).join(" ").trim() ||
    cu.username ||
    null;
  const admin = isAllowlistedAdmin(email);

  return prisma.$transaction(async (tx) => {
    const existing = await tx.user.findUnique({ where: { clerkId } });
    if (existing) {
      if (existing.role !== "admin" && admin) {
        return tx.user.update({
          where: { id: existing.id },
          data: { role: "admin" },
          include: { organization: true },
        });
      }
      return tx.user.findUnique({
        where: { id: existing.id },
        include: { organization: true },
      });
    }
    const byEmail = await tx.user.findUnique({ where: { email } });
    if (byEmail) {
      // A verified email must never replace a different bound Clerk identity.
      // The conditional write also prevents competing first-login requests
      // from rebinding an account between the read and update.
      if (byEmail.clerkId && byEmail.clerkId !== clerkId) return null;
      const adopted = await tx.user.updateMany({
        where: { id: byEmail.id, clerkId: null },
        data: {
          clerkId,
          name: name ?? undefined,
          image: cu.imageUrl,
          ...(admin ? { role: "admin" } : {}),
        },
      });
      if (adopted.count !== 1) return null;
      return tx.user.findUnique({
        where: { id: byEmail.id },
        include: { organization: true },
      });
    }
    return tx.user.create({
      data: {
        email,
        clerkId,
        name,
        image: cu.imageUrl,
        ...(admin ? { role: "admin" } : {}),
      },
      include: { organization: true },
    });
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
async function getBearerKeyUser(scope: ApiScope = "account") {
  // Preserve Next's dynamic-render signal; swallowing it can cache a keyless
  // identity or unauthenticated redirect while prerendering protected pages.
  const authorization = (await headers()).get("authorization");
  const match = authorization
    ? /^Bearer\s+(.+)$/i.exec(authorization.trim())
    : null;
  const token = match?.[1]?.trim();
  if (!authorization) return undefined;
  if (!token || !token.startsWith("bids_")) return null;

  const keyUser = await resolveApiKeyUser(token, scope);
  if (!keyUser) return null;
  const user = await prisma.user.findUnique({
    where: { id: keyUser.id },
    include: { organization: true },
  });
  return user ? { ...user, role: keyUser.role } : null;
}

// cache() dedupes the lookup across a single server request — layouts,
// pages, and actions can all call getCurrentUser() and share one query.
export const getCurrentUser = cache(async () => {
  const bearer = await getBearerKeyUser();
  if (bearer !== undefined) return bearer;

  if (isClerkEnabled()) {
    return getClerkBackedUser();
  }
  if (process.env.NEXT_PUBLIC_BIDS_PAYMENT_MODE !== "demo") return null;
  return prisma.user.findUnique({
    where: { email: DEMO_USER_EMAIL },
    include: { organization: true },
  });
});

/** Throws if there is no signed-in user (or, keyless, if the DB isn't seeded). */
export async function requireUser(scope: ApiScope = "account") {
  const bearer = await getBearerKeyUser(scope);
  const user = bearer === undefined ? await getCurrentUser() : bearer;
  if (!user) {
    throw new Error(
      process.env.NEXT_PUBLIC_BIDS_PAYMENT_MODE === "demo" && !isClerkEnabled()
        ? "No demo operator found in this local database."
        : "Not signed in.",
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
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
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
