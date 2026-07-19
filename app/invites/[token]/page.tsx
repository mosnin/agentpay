import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Brand } from "@/components/layout/brand";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AcceptInviteButton } from "./accept-invite-button";

export const metadata: Metadata = {
  title: "Organization invite",
  description: "Review and accept your invitation to join an organization.",
};

/** Shell: centered card on the bg-grid backdrop, same as onboarding/sign-in. */
function InviteShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center px-4 py-12">
      <div className="pointer-events-none absolute inset-0 bg-grid bg-grid-fade" aria-hidden />
      <div className="relative flex flex-col items-center gap-8">
        <Brand />
        {children}
      </div>
    </div>
  );
}

/** One honest sentence for a dead-end state, plus a way home. */
function StateCard({ title, description }: { title: string; description: string }) {
  return (
    <Card className="w-full max-w-md">
      <CardHeader className="space-y-1.5 text-center">
        <CardTitle className="text-xl">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <Button asChild className="w-full">
          <Link href="/">Go home</Link>
        </Button>
      </CardContent>
    </Card>
  );
}

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const user = await getCurrentUser();
  if (!user) {
    redirect(`/sign-in?redirect_url=${encodeURIComponent(`/invites/${token}`)}`);
  }

  const invite = await prisma.organizationInvite.findUnique({
    where: { token },
    include: {
      organization: { select: { name: true } },
      invitedBy: { select: { name: true, email: true } },
    },
  });

  if (!invite) {
    return (
      <InviteShell>
        <StateCard
          title="Invite not found"
          description="This invite link doesn't match any invitation we know about."
        />
      </InviteShell>
    );
  }

  if (invite.status === "revoked") {
    return (
      <InviteShell>
        <StateCard
          title="Invite revoked"
          description={`This invite to ${invite.organization.name} has been revoked.`}
        />
      </InviteShell>
    );
  }

  if (invite.status === "accepted") {
    return (
      <InviteShell>
        <StateCard
          title="Invite already used"
          description={`This invite to ${invite.organization.name} has already been accepted.`}
        />
      </InviteShell>
    );
  }

  if (invite.expiresAt.getTime() < Date.now()) {
    return (
      <InviteShell>
        <StateCard
          title="Invite expired"
          description={`This invite to ${invite.organization.name} has expired. Ask them to send a new one.`}
        />
      </InviteShell>
    );
  }

  if (invite.email.toLowerCase() !== user.email.toLowerCase()) {
    return (
      <InviteShell>
        <StateCard
          title="Wrong account"
          description={`This invite was sent to ${invite.email}, but you're signed in as ${user.email}.`}
        />
      </InviteShell>
    );
  }

  const inviter = invite.invitedBy?.name || invite.invitedBy?.email || "Someone";

  return (
    <InviteShell>
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1.5 text-center">
          <CardTitle className="text-xl">Join {invite.organization.name}</CardTitle>
          <CardDescription>
            {inviter} invited you to publish agents under {invite.organization.name} on Bids.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AcceptInviteButton token={token} organizationName={invite.organization.name} />
        </CardContent>
      </Card>
    </InviteShell>
  );
}
