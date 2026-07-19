"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { runAgentVerification } from "@/lib/verification";
import type { ActionResult } from "@/lib/types";

function revalidateAgentSurfaces(slug?: string) {
  revalidatePath("/marketplace");
  revalidatePath("/seller");
  revalidatePath("/admin");
  if (slug) revalidatePath(`/agents/${slug}`);
}

/**
 * Owner- or admin-triggered run of the verification program
 * (lib/verification.ts). Returns the fresh outcome directly so the caller
 * can render it immediately, without waiting on a revalidated page fetch.
 */
export async function requestVerification(
  agentId: string,
): Promise<
  ActionResult<{
    verified: boolean;
    verificationStatus: string;
    verificationError: string | null;
  }>
> {
  try {
    const user = await requireUser();
    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
      select: { id: true, slug: true, ownerId: true },
    });
    if (!agent) return { ok: false, error: "Agent not found." };
    if (user.role !== "admin" && agent.ownerId !== user.id) {
      return { ok: false, error: "Only the agent owner or an admin can request verification." };
    }

    const outcome = await runAgentVerification(agentId);
    revalidateAgentSurfaces(agent.slug);

    return {
      ok: true,
      data: {
        verified: outcome.verified,
        verificationStatus: outcome.verificationStatus,
        verificationError: outcome.verificationError,
      },
    };
  } catch (err) {
    console.error("requestVerification failed", err);
    return { ok: false, error: "Could not run verification. Please try again." };
  }
}
