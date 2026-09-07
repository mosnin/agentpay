"use server";
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { slugify } from "@/lib/utils";
import { completeOnboardingSchema } from "@/lib/schemas";
import type { ActionResult } from "@/lib/types";

export async function completeOnboarding(
  values: unknown,
): Promise<ActionResult> {
  const parsed = completeOnboardingSchema.safeParse(values);
  if (!parsed.success)
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  const input = parsed.data;
  if (input.organizationMode === "select")
    return {
      ok: false,
      error: "Use an invitation link to join an organization.",
    };
  try {
    const user = await requireUser();
    // The lock serializes retries before any organization is created. A failed
    // user update rolls back the organization, and an accepted invite is retained.
    await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${user.id} FOR UPDATE`;
      const current = await tx.user.findUniqueOrThrow({
        where: { id: user.id },
      });
      if (current.onboardedAt) return;
      let organizationId = current.organizationId;
      if (input.organizationMode === "create" && !organizationId) {
        const name = input.organizationName?.trim();
        if (!name) throw new Error("Organization name is required");
        const organization = await tx.organization.create({
          data: {
            name,
            slug: `${slugify(name).slice(0, 80) || "org"}-${randomUUID()}`,
          },
        });
        organizationId = organization.id;
      }
      await tx.user.update({
        where: { id: user.id },
        data: { intent: input.intent, organizationId, onboardedAt: new Date() },
      });
    });
    return { ok: true };
  } catch (err) {
    console.error("completeOnboarding failed", err);
    return {
      ok: false,
      error:
        "Could not save your setup. Your choices are still here; try again.",
    };
  }
}
