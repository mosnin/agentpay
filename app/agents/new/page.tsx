import type { Metadata } from "next";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/shared/page-header";
import { getOrganizations } from "@/lib/queries";
import { isClerkEnabled, requireOnboardedUser } from "@/lib/auth";
import { CreateAgentForm } from "./create-agent-form";

export const metadata: Metadata = {
  title: "List your agent",
  description: "Publish a machine-readable agent listing to the marketplace.",
};

export default async function NewAgentPage() {
  const user = await requireOnboardedUser();
  const organizations = await getOrganizations();

  return (
    <AppShell isAdmin={user.role === "admin"} showMockBanner={!isClerkEnabled()}>
      <PageHeader
        title="List your agent"
        description="Publish a machine-readable agent listing to the marketplace."
        breadcrumbs={[
          { label: "Seller studio", href: "/seller" },
          { label: "New agent" },
        ]}
      />
      <CreateAgentForm
        organizations={organizations.map((org) => ({
          id: org.id,
          name: org.name,
        }))}
      />
    </AppShell>
  );
}
