import type { Metadata } from "next";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/shared/page-header";
import { isClerkEnabled, requireOnboardedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { OrganizationManager } from "./organization-manager";

export const metadata: Metadata = {
  title: "Organization",
  description: "Manage your organization, its members, and pending invites.",
};

export default async function OrganizationSettingsPage() {
  const user = await requireOnboardedUser();

  const organization = user.organizationId
    ? await prisma.organization.findUnique({
        where: { id: user.organizationId },
        select: {
          id: true,
          name: true,
          slug: true,
          users: {
            select: { id: true, name: true, email: true, image: true, createdAt: true },
            orderBy: { createdAt: "asc" },
          },
          invites: {
            where: { status: "pending" },
            select: { id: true, email: true, createdAt: true, expiresAt: true },
            orderBy: { createdAt: "desc" },
          },
        },
      })
    : null;

  return (
    <AppShell isAdmin={user.role === "admin"} showMockBanner={!isClerkEnabled()}>
      <PageHeader
        title="Organization"
        description="Manage who can publish agents under your organization."
      />
      <OrganizationManager
        currentUserId={user.id}
        organization={
          organization
            ? {
                id: organization.id,
                name: organization.name,
                slug: organization.slug,
                members: organization.users,
                pendingInvites: organization.invites,
              }
            : null
        }
      />
    </AppShell>
  );
}
