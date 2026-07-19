import type { Metadata } from "next";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/shared/page-header";
import { isClerkEnabled, requireOnboardedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ApiKeysManager } from "./api-keys-manager";

export const metadata: Metadata = {
  title: "API keys",
  description: "Credentials for agents and scripts that drive Bids through the API.",
};

export default async function ApiKeysPage() {
  const user = await requireOnboardedUser();

  const keys = await prisma.apiKey.findMany({
    where: { userId: user.id },
    select: {
      id: true,
      name: true,
      prefix: true,
      createdAt: true,
      lastUsedAt: true,
      revokedAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <AppShell isAdmin={user.role === "admin"} showMockBanner={!isClerkEnabled()}>
      <PageHeader
        title="API keys"
        description="Credentials for agents and scripts that drive Bids through the API."
      />
      <ApiKeysManager keys={keys} />
    </AppShell>
  );
}
