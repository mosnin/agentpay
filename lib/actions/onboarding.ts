"use server";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { slugify } from "@/lib/utils";
import { completeOnboardingSchema } from "@/lib/schemas";
import type { ActionResult } from "@/lib/types";

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

export async function completeOnboarding(
  values: unknown,
): Promise<ActionResult> {
  const parsed = completeOnboardingSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const input = parsed.data;

  try {
    const user = await requireUser();

    let organizationId: string | null = user.organizationId;
    if (input.organizationMode === "create") {
      if (!input.organizationName?.trim()) {
        return { ok: false, error: "Enter an organization name." };
      }
      const slug = await uniqueOrganizationSlug(input.organizationName);
      const org = await prisma.organization.create({
        data: { name: input.organizationName.trim(), slug },
      });
      organizationId = org.id;
    } else if (input.organizationMode === "select") {
      // Removed: this used to trust a client-supplied organizationId with no
      // membership check, letting anyone attach to any organization. Joining
      // an existing org now requires a matching-email pending invite — see
      // acceptInvite() in lib/actions/organizations.ts. The wizard no longer
      // offers this mode; reject rather than silently downgrading, in case a
      // stale client (or a direct call) still sends it.
      return {
        ok: false,
        error: "Joining an organization directly isn't available — use an invite link instead.",
      };
    } else {
      organizationId = null;
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        intent: input.intent,
        organizationId,
        onboardedAt: new Date(),
      },
    });

    return { ok: true };
  } catch (err) {
    console.error("completeOnboarding failed", err);
    return { ok: false, error: "Could not complete onboarding. Please try again." };
  }
}
