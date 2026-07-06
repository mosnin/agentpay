import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Lock } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { getAgentByIdOrSlug, getOrganizations } from "@/lib/queries";
import { getCurrentUser, isClerkEnabled } from "@/lib/auth";
import type { CreateAgentInput } from "@/lib/schemas";
import { CreateAgentForm } from "../../new/create-agent-form";

export const metadata: Metadata = {
  title: "Edit agent",
  description: "Update your agent listing.",
};

export default async function EditAgentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [agent, user, organizations] = await Promise.all([
    getAgentByIdOrSlug(id),
    getCurrentUser(),
    getOrganizations(),
  ]);

  if (!agent) notFound();

  // Only the owner may edit. Render an explicit, reliable not-authorized state
  // rather than a redirect (a redirect after the layout starts streaming would
  // resolve to a 200 + client-side hop). updateAgent also enforces this server-side.
  const isOwner = !!user && agent.ownerId === user.id;
  if (!isOwner) {
    return (
      <AppShell isAdmin={user?.role === "admin"} showMockBanner={!isClerkEnabled()}>
        <PageHeader
          title="Edit agent"
          breadcrumbs={[
            { label: agent.name, href: `/agents/${agent.slug}` },
            { label: "Edit" },
          ]}
        />
        <EmptyState
          icon={Lock}
          title="You don't own this agent"
          description="Only the agent's owner can edit its listing."
          action={
            <Button asChild>
              <Link href={`/agents/${agent.slug}`}>View profile</Link>
            </Button>
          }
        />
      </AppShell>
    );
  }

  const defaults: Partial<CreateAgentInput> = {
    name: agent.name,
    shortDescription: agent.shortDescription,
    longDescription: agent.longDescription,
    category: agent.category as CreateAgentInput["category"],
    capabilities: agent.capabilities.map((c) => c.capability.name),
    pricingModel: agent.pricingModel as CreateAgentInput["pricingModel"],
    startingPrice: agent.startingPrice,
    currency: agent.currency,
    endpointUrl: agent.endpointUrl ?? "",
    mcpServerUrl: agent.mcpServerUrl ?? "",
    inputSchema: agent.inputSchema
      ? JSON.stringify(agent.inputSchema, null, 2)
      : "",
    outputSchema: agent.outputSchema
      ? JSON.stringify(agent.outputSchema, null, 2)
      : "",
    organizationId: agent.organizationId ?? undefined,
    verified: agent.verified,
  };

  return (
    <AppShell isAdmin={user?.role === "admin"} showMockBanner={!isClerkEnabled()}>
      <PageHeader
        title="Edit agent"
        description="Update your listing — changes go live immediately."
        breadcrumbs={[
          { label: "Seller studio", href: "/seller" },
          { label: agent.name, href: `/agents/${agent.slug}` },
          { label: "Edit" },
        ]}
      />
      <CreateAgentForm
        organizations={organizations.map((org) => ({
          id: org.id,
          name: org.name,
        }))}
        agentId={agent.id}
        defaultValues={defaults}
      />
    </AppShell>
  );
}
