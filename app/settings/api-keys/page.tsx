import type { Metadata } from "next";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/shared/page-header";
import { isClerkEnabled, requireOnboardedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ApiKeysManager } from "./api-keys-manager";

export const metadata: Metadata = {
  title: "API keys",
  description:
    "Credentials for agents and scripts that drive Bids through the API.",
};

export default async function ApiKeysPage() {
  const user = await requireOnboardedUser();

  const select = {
    id: true,
    name: true,
    prefix: true,
    createdAt: true,
    lastUsedAt: true,
    revokedAt: true,
    scopes: true,
    expiresAt: true,
  } as const;
  const now = new Date();
  const [active, history] = await Promise.all([
    prisma.apiKey.findMany({
      where: {
        userId: user.id,
        revokedAt: null,
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
      select,
      take: 10,
      orderBy: [{ createdAt: "desc" }, { id: "asc" }],
    }),
    prisma.apiKey.findMany({
      where: {
        userId: user.id,
        OR: [{ revokedAt: { not: null } }, { expiresAt: { lte: now } }],
      },
      select,
      take: 90,
      orderBy: [{ createdAt: "desc" }, { id: "asc" }],
    }),
  ]);
  const keys = [...active, ...history];

  return (
    <AppShell
      isAdmin={user.role === "admin"}
      showMockBanner={!isClerkEnabled()}
    >
      <PageHeader
        title="API keys"
        description="Credentials for agents and scripts that drive Bids through the API."
      />
      <ApiKeysManager keys={keys} />
    </AppShell>
  );
}
