import "server-only";
import { prisma } from "@/lib/prisma";
export interface SetupStep {
  id: string;
  title: string;
  detail: string;
  href: string;
  complete: boolean;
}
export async function getSetupProgress(userId: string) {
  const [user, listing, key, payout, commissioned, delivered] =
    await Promise.all([
      prisma.user.findUniqueOrThrow({
        where: { id: userId },
        select: { intent: true },
      }),
      prisma.agent.findFirst({
        where: { ownerId: userId },
        select: { id: true, slug: true },
      }),
      prisma.apiKey.findFirst({
        where: { userId, revokedAt: null },
        select: { id: true, lastUsedAt: true },
        orderBy: { lastUsedAt: { sort: "desc", nulls: "last" } },
      }),
      prisma.walletAccount.findFirst({
        where: { userId, isPayout: true, revokedAt: null },
        select: { id: true },
      }),
      prisma.task.findFirst({
        where: { buyerId: userId },
        select: { id: true },
      }),
      prisma.task.findFirst({
        where: { sellerAgent: { ownerId: userId }, status: "completed" },
        select: { id: true },
      }),
    ]);
  const seller: SetupStep[] = [
    {
      id: "listing",
      title: "Describe your service",
      detail: listing
        ? "Your listing is saved."
        : "Set a clear scope, deliverable and price.",
      href: listing ? `/agents/${listing.slug}/edit` : "/agents/new",
      complete: !!listing,
    },
    {
      id: "api",
      title: "Connect your integration",
      detail: key?.lastUsedAt
        ? "An active API key has authenticated a request."
        : key
          ? "Key created. Make your first authenticated API request."
          : "Create an API key for your worker, or deliver manually in Seller studio.",
      href: key ? "/developers#quickstart" : "/settings/api-keys",
      complete: !!key?.lastUsedAt,
    },
    {
      id: "payout",
      title: "Choose a stablecoin payout wallet",
      detail: payout
        ? "A verified wallet is selected for payouts."
        : "Verify ownership and choose where settlement is sent.",
      href: "/wallets",
      complete: !!payout,
    },
    {
      id: "delivery",
      title: "Complete a delivery",
      detail: delivered
        ? "A buyer has approved a delivery. Test work does not earn live trust."
        : "Accept work, submit the result and receive buyer approval.",
      href: delivered ? `/tasks/${delivered.id}` : "/seller",
      complete: !!delivered,
    },
  ];
  const buyer: SetupStep[] = [
    {
      id: "discover",
      title: "Find a service for your task",
      detail: "Compare the scope, deliverables and evidence behind each agent.",
      href: "/marketplace",
      complete: !!commissioned,
    },
    {
      id: "commission",
      title: "Create your first request",
      detail: commissioned
        ? "Your request is saved. Follow its next action to continue."
        : "Choose an agent and agree on the work before funding.",
      href: commissioned ? `/tasks/${commissioned.id}` : "/tasks/new",
      complete: !!commissioned,
    },
  ];
  return { intent: user.intent, buyer, seller };
}
