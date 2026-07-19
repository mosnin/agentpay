"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  createOrganization,
  inviteToOrganization,
  leaveOrganization,
  revokeInvite,
} from "@/lib/actions/organizations";
import { formatDate, formatRelativeTime, initials } from "@/lib/utils";

export interface OrganizationMember {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  createdAt: Date;
}

export interface PendingInviteItem {
  id: string;
  email: string;
  createdAt: Date;
  expiresAt: Date;
}

export interface OrganizationDetail {
  id: string;
  name: string;
  slug: string;
  members: OrganizationMember[];
  pendingInvites: PendingInviteItem[];
}

export function OrganizationManager({
  organization,
  currentUserId,
}: {
  organization: OrganizationDetail | null;
  currentUserId: string;
}) {
  if (!organization) {
    return <CreateOrganizationCard />;
  }

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{organization.name}</CardTitle>
          <code className="mt-0.5 w-fit rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-muted-foreground">
            {organization.slug}
          </code>
        </CardHeader>
      </Card>

      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-foreground">Members</h2>
          <p className="text-sm text-muted-foreground">
            {organization.members.length === 1
              ? "1 person publishes under this organization."
              : `${organization.members.length} people publish under this organization.`}
          </p>
        </div>
        <MembersList members={organization.members} currentUserId={currentUserId} />
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-foreground">
            Pending invites
          </h2>
          <p className="text-sm text-muted-foreground">Invitations waiting to be accepted.</p>
        </div>
        {organization.pendingInvites.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border/60 bg-card/30 px-4 py-6 text-center text-sm text-muted-foreground">
            No pending invites.
          </p>
        ) : (
          <PendingInvitesList invites={organization.pendingInvites} />
        )}
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-foreground">
            Invite someone
          </h2>
        </div>
        <Card>
          <CardContent className="pt-6">
            <InviteForm />
          </CardContent>
        </Card>
      </section>

      <div className="flex flex-col gap-3 border-t border-border/60 pt-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-md text-sm text-muted-foreground">
          Leaving removes your access to publish under {organization.name}. Agents you&apos;ve
          already listed keep their organization credit.
        </p>
        <LeaveOrganizationDialog organizationName={organization.name} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Without an org — create form.
// ---------------------------------------------------------------------------

function CreateOrganizationCard() {
  const router = useRouter();
  const [name, setName] = React.useState("");
  const [pending, startTransition] = React.useTransition();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error("Enter an organization name.");
      return;
    }
    startTransition(async () => {
      const res = await createOrganization(trimmed);
      if (res.ok) {
        toast.success(`${trimmed} created`);
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  }

  return (
    <Card className="mx-auto w-full max-w-md">
      <CardHeader>
        <CardTitle className="text-lg">Create an organization</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <p className="text-sm text-muted-foreground">
          Publish agents under a shared identity.
        </p>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="org-name">Organization name</Label>
            <Input
              id="org-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Northwind Labs"
              disabled={pending}
            />
          </div>
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Creating…
              </>
            ) : (
              "Create organization"
            )}
          </Button>
        </form>
        <p className="text-center text-sm text-muted-foreground">
          Been invited? Open the link from your invitation.
        </p>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Members — desktop table + mobile cards.
// ---------------------------------------------------------------------------

function MembersList({
  members,
  currentUserId,
}: {
  members: OrganizationMember[];
  currentUserId: string;
}) {
  return (
    <Card className="overflow-hidden">
      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="pl-6">Member</TableHead>
              <TableHead>Email</TableHead>
              <TableHead className="pr-6 text-right">Joined</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.map((m) => (
              <TableRow key={m.id}>
                <TableCell className="pl-6">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8 border border-border/60">
                      {m.image && <AvatarImage src={m.image} alt="" />}
                      <AvatarFallback className="bg-muted text-xs">
                        {initials(m.name || m.email)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-medium text-foreground">
                      {m.name || m.email}
                      {m.id === currentUserId && (
                        <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                          (You)
                        </span>
                      )}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">{m.email}</TableCell>
                <TableCell
                  className="pr-6 text-right text-xs text-muted-foreground"
                  title={formatDate(m.createdAt)}
                >
                  {formatRelativeTime(m.createdAt)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="divide-y divide-border/60 md:hidden">
        {members.map((m) => (
          <div key={m.id} className="flex items-center gap-3 p-4">
            <Avatar className="h-9 w-9 border border-border/60">
              {m.image && <AvatarImage src={m.image} alt="" />}
              <AvatarFallback className="bg-muted text-xs">
                {initials(m.name || m.email)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">
                {m.name || m.email}
                {m.id === currentUserId && (
                  <span className="ml-1.5 text-xs font-normal text-muted-foreground">(You)</span>
                )}
              </p>
              <p className="truncate text-xs text-muted-foreground">{m.email}</p>
            </div>
            <p className="shrink-0 text-xs text-muted-foreground" title={formatDate(m.createdAt)}>
              {formatRelativeTime(m.createdAt)}
            </p>
          </div>
        ))}
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Pending invites — desktop table + mobile cards, each row revocable.
// ---------------------------------------------------------------------------

function PendingInvitesList({ invites }: { invites: PendingInviteItem[] }) {
  return (
    <Card className="overflow-hidden">
      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="pl-6">Email</TableHead>
              <TableHead>Sent</TableHead>
              <TableHead>Expires</TableHead>
              <TableHead className="pr-6 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invites.map((invite) => (
              <TableRow key={invite.id}>
                <TableCell className="pl-6 font-medium text-foreground">{invite.email}</TableCell>
                <TableCell
                  className="text-xs text-muted-foreground"
                  title={formatDate(invite.createdAt)}
                >
                  {formatRelativeTime(invite.createdAt)}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {formatDate(invite.expiresAt)}
                </TableCell>
                <TableCell className="pr-6 text-right">
                  <RevokeInviteButton id={invite.id} email={invite.email} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="divide-y divide-border/60 md:hidden">
        {invites.map((invite) => (
          <div key={invite.id} className="flex items-center justify-between gap-3 p-4">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-foreground">{invite.email}</p>
              <p className="text-xs text-muted-foreground">
                Expires {formatDate(invite.expiresAt)}
              </p>
            </div>
            <RevokeInviteButton id={invite.id} email={invite.email} />
          </div>
        ))}
      </div>
    </Card>
  );
}

function RevokeInviteButton({ id, email }: { id: string; email: string }) {
  const router = useRouter();
  const [pending, start] = React.useTransition();

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const res = await revokeInvite(id);
          if (res.ok) {
            toast.success(`Invite to ${email} revoked`);
            router.refresh();
          } else {
            toast.error(res.error);
          }
        })
      }
    >
      {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Revoke"}
    </Button>
  );
}

// ---------------------------------------------------------------------------
// Invite form.
// ---------------------------------------------------------------------------

function InviteForm() {
  const router = useRouter();
  const [email, setEmail] = React.useState("");
  const [pending, startTransition] = React.useTransition();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) {
      toast.error("Enter an email address.");
      return;
    }
    startTransition(async () => {
      const res = await inviteToOrganization(trimmed);
      if (res.ok) {
        toast.success(`Invite sent to ${trimmed}`);
        setEmail("");
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="flex-1 space-y-2">
          <Label htmlFor="invite-email" className="sr-only">
            Email address
          </Label>
          <Input
            id="invite-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="teammate@company.com"
            disabled={pending}
          />
        </div>
        <Button type="submit" disabled={pending}>
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send invite"}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        They&apos;ll get an in-app invitation; email delivery arrives with the notifications
        milestone.
      </p>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Leave organization — quiet trigger, explicit confirm.
// ---------------------------------------------------------------------------

function LeaveOrganizationDialog({ organizationName }: { organizationName: string }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [pending, start] = React.useTransition();

  function onConfirm() {
    start(async () => {
      const res = await leaveOrganization();
      if (res.ok) {
        toast.success(`You've left ${organizationName}`);
        setOpen(false);
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!pending) setOpen(next);
      }}
    >
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm" className="shrink-0">
          Leave organization
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Leave {organizationName}?</DialogTitle>
          <DialogDescription>
            You&apos;ll lose access to publish under this organization. You can rejoin later with
            a new invite.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              if (!pending) setOpen(false);
            }}
          >
            Cancel
          </Button>
          <Button type="button" variant="destructive" disabled={pending} onClick={onConfirm}>
            {pending && <Loader2 className="h-4 w-4 animate-spin" />}
            {pending ? "Leaving…" : "Leave organization"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
