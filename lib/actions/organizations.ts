"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { slugify } from "@/lib/utils";
import { notify } from "@/lib/notifications";
import type { ActionResult } from "@/lib/types";

const INVITE_TTL_DAYS = 14;

// Local slug pattern — mirrors lib/actions/onboarding.ts's uniqueOrganizationSlug.
// Reimplemented here (rather than imported) so this module doesn't reach into
// another workstream's action file.
async function uniqueOrganizationSlug(name: string): Promise<string> {
  const base = slugify(name) || "org";
  let slug = base;
  let i = 1;
  // eslint-disable-next-line no-await-in-loop
  while (await prisma.organization.findUnique({ where: { slug } })) {
    i += 1;
    slug = `${base}-${i}`;
  }
  return slug;
}

function revalidateOrganizationSurfaces() {
  revalidatePath("/settings/organization");
  revalidatePath("/marketplace");
  revalidatePath("/seller");
  revalidatePath("/dashboard");
  revalidatePath("/admin");
}

export async function createOrganization(
  name: string,
): Promise<ActionResult<{ id: string; slug: string }>> {
  const trimmed = name.trim();
  if (trimmed.length < 2) {
    return { ok: false, error: "Organization name must be at least 2 characters." };
  }
  if (trimmed.length > 80) {
    return { ok: false, error: "Keep the organization name under 80 characters." };
  }

  try {
    const user = await requireUser();
    if (user.organizationId) {
      return { ok: false, error: "You're already in an organization. Leave it first." };
    }

    const slug = await uniqueOrganizationSlug(trimmed);
    const org = await prisma.organization.create({
      data: { name: trimmed, slug },
    });
    await prisma.user.update({
      where: { id: user.id },
      data: { organizationId: org.id },
    });

    revalidateOrganizationSurfaces();
    return { ok: true, data: { id: org.id, slug: org.slug } };
  } catch (err) {
    console.error("createOrganization failed", err);
    return { ok: false, error: "Could not create organization. Please try again." };
  }
}

export async function inviteToOrganization(email: string): Promise<ActionResult> {
  const normalized = email.trim().toLowerCase();
  if (!normalized || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    return { ok: false, error: "Enter a valid email address." };
  }

  try {
    const user = await requireUser();
    if (!user.organizationId) {
      return { ok: false, error: "You need an organization before you can invite anyone." };
    }
    const organizationId = user.organizationId;

    // Refuse if the email already belongs to a member of this org...
    const existingMember = await prisma.user.findFirst({
      where: { organizationId, email: { equals: normalized, mode: "insensitive" } },
      select: { id: true },
    });
    if (existingMember) {
      return { ok: false, error: "That email already belongs to a member of this organization." };
    }

    // ...or already has a pending invite to this org.
    const pendingInvite = await prisma.organizationInvite.findFirst({
      where: {
        organizationId,
        status: "pending",
        email: { equals: normalized, mode: "insensitive" },
      },
      select: { id: true },
    });
    if (pendingInvite) {
      return { ok: false, error: "There's already a pending invite for that email." };
    }

    const invite = await prisma.organizationInvite.create({
      data: {
        email: normalized,
        token: randomUUID(),
        status: "pending",
        expiresAt: new Date(Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000),
        organizationId,
        invitedById: user.id,
      },
    });

    // Best-effort: if the invitee already has an account, let them know
    // in-app. notify() is owned by another workstream — wrapped so a throw
    // there can't roll back the invite we already created.
    const invitedUser = await prisma.user.findFirst({
      where: { email: { equals: normalized, mode: "insensitive" } },
      select: { id: true },
    });
    if (invitedUser) {
      try {
        const orgName = user.organization?.name ?? "an organization";
        await notify({
          userId: invitedUser.id,
          type: "invite_received",
          title: `Invitation to join ${orgName}`,
          body: `${user.name ?? user.email} invited you to publish agents under ${orgName} on Bids.`,
          href: `/invites/${invite.token}`,
        });
      } catch (err) {
        console.error("notify(invite_received) failed", err);
      }
    }

    revalidateOrganizationSurfaces();
    return { ok: true };
  } catch (err) {
    console.error("inviteToOrganization failed", err);
    return { ok: false, error: "Could not send the invite. Please try again." };
  }
}

export async function revokeInvite(id: string): Promise<ActionResult> {
  try {
    const user = await requireUser();
    if (!user.organizationId) {
      return { ok: false, error: "You're not in an organization." };
    }

    const invite = await prisma.organizationInvite.findUnique({
      where: { id },
      select: { id: true, organizationId: true, status: true },
    });
    if (!invite) return { ok: false, error: "Invite not found." };
    if (invite.organizationId !== user.organizationId) {
      return { ok: false, error: "You can only revoke invites from your own organization." };
    }
    if (invite.status !== "pending") {
      return { ok: false, error: `This invite is already ${invite.status}.` };
    }

    await prisma.organizationInvite.update({
      where: { id },
      data: { status: "revoked" },
    });

    revalidateOrganizationSurfaces();
    return { ok: true };
  } catch (err) {
    console.error("revokeInvite failed", err);
    return { ok: false, error: "Could not revoke the invite." };
  }
}

/**
 * The only path (besides creating a brand-new org) that sets a user's
 * organizationId to an EXISTING organization. Every check below exists to
 * keep it that way — this is the trust boundary the whole feature hinges on.
 */
export async function acceptInvite(
  token: string,
): Promise<ActionResult<{ organizationId: string }>> {
  try {
    const user = await requireUser();
    const invite = await prisma.organizationInvite.findUnique({ where: { token } });
    if (!invite) return { ok: false, error: "This invite doesn't exist." };
    if (invite.status === "revoked") {
      return { ok: false, error: "This invite has been revoked." };
    }
    if (invite.status === "accepted") {
      return { ok: false, error: "This invite has already been accepted." };
    }
    if (invite.expiresAt.getTime() < Date.now()) {
      return { ok: false, error: "This invite has expired." };
    }
    if (invite.email.toLowerCase() !== user.email.toLowerCase()) {
      return {
        ok: false,
        error: `This invite was sent to ${invite.email}, not ${user.email}.`,
      };
    }
    if (user.organizationId && user.organizationId !== invite.organizationId) {
      return { ok: false, error: "Leave your current organization first." };
    }

    await prisma.organizationInvite.update({
      where: { id: invite.id },
      data: { status: "accepted", acceptedAt: new Date() },
    });
    await prisma.user.update({
      where: { id: user.id },
      data: { organizationId: invite.organizationId },
    });

    revalidateOrganizationSurfaces();
    revalidatePath(`/invites/${token}`);
    return { ok: true, data: { organizationId: invite.organizationId } };
  } catch (err) {
    console.error("acceptInvite failed", err);
    return { ok: false, error: "Could not accept the invite. Please try again." };
  }
}

export async function leaveOrganization(): Promise<ActionResult> {
  try {
    const user = await requireUser();
    if (!user.organizationId) {
      return { ok: false, error: "You're not in an organization." };
    }

    // Agents already published under the org are untouched here — their
    // organizationId isn't derived from the owner's, so past work keeps its
    // organizational attribution even after the owner leaves.
    await prisma.user.update({
      where: { id: user.id },
      data: { organizationId: null },
    });

    revalidateOrganizationSurfaces();
    return { ok: true };
  } catch (err) {
    console.error("leaveOrganization failed", err);
    return { ok: false, error: "Could not leave the organization." };
  }
}
