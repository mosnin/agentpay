"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { slugify, mockHash } from "@/lib/utils";
import { createAgentSchema, updateAgentSchema } from "@/lib/schemas";
import { onAgentVerified, recordReputationEvent } from "@/lib/reputation";
import type { ActionResult } from "@/lib/types";

function parseJson(val?: string): object | undefined {
  if (!val || !val.trim()) return undefined;
  try {
    return JSON.parse(val);
  } catch {
    return undefined;
  }
}

async function uniqueAgentSlug(name: string): Promise<string> {
  const base = slugify(name) || "agent";
  let slug = base;
  let i = 1;
  // eslint-disable-next-line no-await-in-loop
  while (await prisma.agent.findUnique({ where: { slug } })) {
    i += 1;
    slug = `${base}-${i}`;
  }
  return slug;
}

async function ensureCapabilities(names: string[], category: string): Promise<string[]> {
  const ids: string[] = [];
  for (const raw of names) {
    const name = raw.trim();
    const slug = slugify(name);
    if (!slug) continue;
    // eslint-disable-next-line no-await-in-loop
    const cap = await prisma.capability.upsert({
      where: { slug },
      create: { name, slug, category },
      update: {},
    });
    ids.push(cap.id);
  }
  return ids;
}

function revalidateAgentSurfaces(slug?: string) {
  revalidatePath("/marketplace");
  revalidatePath("/seller");
  revalidatePath("/dashboard");
  revalidatePath("/admin");
  if (slug) revalidatePath(`/agents/${slug}`);
}

export async function createAgent(
  values: unknown,
): Promise<ActionResult<{ id: string; slug: string }>> {
  const parsed = createAgentSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const input = parsed.data;

  try {
    const user = await requireUser();
    const slug = await uniqueAgentSlug(input.name);
    const capabilityIds = await ensureCapabilities(input.capabilities, input.category);

    const agent = await prisma.agent.create({
      data: {
        name: input.name,
        slug,
        shortDescription: input.shortDescription,
        longDescription: input.longDescription,
        category: input.category,
        status: "active",
        verified: input.verified ?? false,
        endpointUrl: input.endpointUrl || null,
        mcpServerUrl: input.mcpServerUrl || null,
        pricingModel: input.pricingModel,
        startingPrice: input.startingPrice,
        currency: input.currency ?? "USD",
        reputationScore: 60,
        inputSchema: parseJson(input.inputSchema) ?? undefined,
        outputSchema: parseJson(input.outputSchema) ?? undefined,
        ownerId: user.id,
        organizationId: input.organizationId || user.organizationId || null,
        capabilities: {
          create: capabilityIds.map((capabilityId) => ({ capabilityId })),
        },
      },
    });

    await recordReputationEvent({
      agentId: agent.id,
      type: "schema_compliance",
      scoreDelta: 0,
      reason: "Agent listed on the marketplace",
    });
    if (agent.verified) {
      await onAgentVerified(agent.id);
    }

    revalidateAgentSurfaces(agent.slug);
    return { ok: true, data: { id: agent.id, slug: agent.slug } };
  } catch (err) {
    console.error("createAgent failed", err);
    return { ok: false, error: "Could not create agent. Please try again." };
  }
}

export async function updateAgent(values: unknown): Promise<ActionResult<{ id: string; slug: string }>> {
  const parsed = updateAgentSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { id, capabilities, inputSchema, outputSchema, ...rest } = parsed.data;

  try {
    const user = await requireUser();
    const existing = await prisma.agent.findUnique({
      where: { id },
      select: { ownerId: true },
    });
    if (!existing) return { ok: false, error: "Agent not found." };
    if (existing.ownerId !== user.id) {
      return { ok: false, error: "You can only edit agents you own." };
    }
    const agent = await prisma.agent.update({
      where: { id },
      data: {
        ...rest,
        endpointUrl: rest.endpointUrl || null,
        mcpServerUrl: rest.mcpServerUrl || null,
        inputSchema: inputSchema !== undefined ? (parseJson(inputSchema) ?? undefined) : undefined,
        outputSchema: outputSchema !== undefined ? (parseJson(outputSchema) ?? undefined) : undefined,
      },
    });

    if (capabilities && capabilities.length) {
      const capabilityIds = await ensureCapabilities(capabilities, agent.category);
      await prisma.agentCapability.deleteMany({ where: { agentId: id } });
      await prisma.agentCapability.createMany({
        data: capabilityIds.map((capabilityId) => ({ agentId: id, capabilityId })),
        skipDuplicates: true,
      });
    }

    revalidateAgentSurfaces(agent.slug);
    return { ok: true, data: { id: agent.id, slug: agent.slug } };
  } catch (err) {
    console.error("updateAgent failed", err);
    return { ok: false, error: "Could not update agent." };
  }
}

export async function verifyAgent(agentId: string): Promise<ActionResult> {
  try {
    await requireUser();
    const agent = await prisma.agent.update({
      where: { id: agentId },
      data: { verified: true },
    });
    await onAgentVerified(agent.id);
    revalidateAgentSurfaces(agent.slug);
    return { ok: true };
  } catch (err) {
    console.error("verifyAgent failed", err);
    return { ok: false, error: "Could not verify agent." };
  }
}

export async function setAgentStatus(
  agentId: string,
  status: "active" | "paused" | "suspended" | "draft",
): Promise<ActionResult> {
  try {
    await requireUser();
    const agent = await prisma.agent.update({ where: { id: agentId }, data: { status } });
    revalidateAgentSurfaces(agent.slug);
    return { ok: true };
  } catch (err) {
    console.error("setAgentStatus failed", err);
    return { ok: false, error: "Could not update status." };
  }
}

/**
 * Seller-facing pause/resume for one of the operator's OWN listings (active ⇄
 * paused only). Separate from the admin `setAgentStatus` so it can enforce
 * ownership without blocking moderation of others' agents.
 */
export async function setOwnedAgentStatus(
  agentId: string,
  status: "active" | "paused",
): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const existing = await prisma.agent.findUnique({
      where: { id: agentId },
      select: { ownerId: true },
    });
    if (!existing) return { ok: false, error: "Agent not found." };
    if (existing.ownerId !== user.id) {
      return { ok: false, error: "You can only change agents you own." };
    }
    const agent = await prisma.agent.update({ where: { id: agentId }, data: { status } });
    revalidateAgentSurfaces(agent.slug);
    return { ok: true };
  } catch (err) {
    console.error("setOwnedAgentStatus failed", err);
    return { ok: false, error: "Could not update listing status." };
  }
}
