"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, Copy, KeyRound, Loader2, PlusCircle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
import { EmptyState } from "@/components/shared/empty-state";
import { createApiKey, revokeApiKey } from "@/lib/actions/api-keys";
import { cn, formatDate, formatRelativeTime } from "@/lib/utils";

export interface ApiKeyListItem {
  id: string;
  name: string;
  prefix: string;
  createdAt: Date;
  lastUsedAt: Date | null;
  revokedAt: Date | null;
  scopes: string[];
  expiresAt: Date | null;
}

type RevealState = { name: string; secret: string } | null;

export function ApiKeysManager({ keys }: { keys: ApiKeyListItem[] }) {
  const router = useRouter();
  const [createOpen, setCreateOpen] = React.useState(false);
  const [name, setName] = React.useState("");
  const [profile, setProfile] = React.useState<"worker" | "reader" | "account">(
    "worker",
  );
  const [lifetime, setLifetime] = React.useState(90);
  const [pending, startCreate] = React.useTransition();

  const [reveal, setReveal] = React.useState<RevealState>(null);
  const [revealOpen, setRevealOpen] = React.useState(false);

  const activeKeys = keys.filter((k) => !k.revokedAt);
  const revokedKeys = keys.filter((k) => k.revokedAt);
  const ordered = [...activeKeys, ...revokedKeys];

  function openCreate() {
    setName("");
    setCreateOpen(true);
  }

  function submitCreate(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error("Give the key a name.");
      return;
    }
    startCreate(async () => {
      const res = await createApiKey(trimmed, profile, lifetime);
      if (res.ok && res.data) {
        setCreateOpen(false);
        setReveal({ name: trimmed, secret: res.data.secret });
        setRevealOpen(true);
        router.refresh();
      } else {
        toast.error(
          res.ok ? "Something went wrong. Please try again." : res.error,
        );
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-foreground">
            Your keys
          </h2>
          <p className="text-sm text-muted-foreground">
            Active credentials first, followed by recent history (up to 100).
          </p>
        </div>
        {keys.length > 0 && (
          <Button onClick={openCreate}>
            <PlusCircle className="h-4 w-4" />
            Create key
          </Button>
        )}
      </div>

      {keys.length === 0 ? (
        <EmptyState
          icon={KeyRound}
          title="No API keys yet"
          description="Create a key so an agent or script can authenticate as you and drive Bids through the API."
          action={
            <div className="flex flex-col items-center gap-3">
              <Button onClick={openCreate}>
                <PlusCircle className="h-4 w-4" />
                Create key
              </Button>
              <Link
                href="/developers"
                className="text-xs text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
              >
                View the developer docs
              </Link>
            </div>
          }
        />
      ) : (
        <KeyList keys={ordered} />
      )}

      {/* Create key */}
      <Dialog
        open={createOpen}
        onOpenChange={(next) => {
          if (!pending) setCreateOpen(next);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create API key</DialogTitle>
            <DialogDescription>
              Name it after what will use it, so you can recognize it later.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={submitCreate} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="key-name">Name</Label>
              <Input
                id="key-name"
                autoFocus
                placeholder="What will use this key? e.g. Production agent"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="key-profile">Permissions</Label>
              <select
                className="w-full rounded-md border bg-background p-3"
                id="key-profile"
                value={profile}
                onChange={(e) => setProfile(e.target.value as typeof profile)}
              >
                <option value="worker">
                  Worker — read tasks, deliver work, manage listings
                </option>
                <option value="reader">Read task history only</option>
                <option value="account">
                  Full account access — includes payments
                </option>
              </select>
              <p className="text-xs text-muted-foreground">
                Worker keys cannot create purchases, approve payment, manage
                wallets or administer the platform.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="key-expiry">Expires after</Label>
              <select
                className="w-full rounded-md border bg-background p-3"
                id="key-expiry"
                value={lifetime}
                onChange={(e) => setLifetime(Number(e.target.value))}
              >
                {[7, 30, 90].map((d) => (
                  <option key={d} value={d}>
                    {d} days
                  </option>
                ))}
              </select>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  if (!pending) setCreateOpen(false);
                }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={pending}>
                {pending && <Loader2 className="animate-spin" />}
                {pending ? "Creating…" : "Create key"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Reveal secret — shown exactly once, right after creation */}
      <Dialog open={revealOpen} onOpenChange={setRevealOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>API key created</DialogTitle>
            <DialogDescription>
              This is the only time you&apos;ll see this key. Store it somewhere
              safe.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {reveal && (
              <>
                <p className="text-sm font-medium text-foreground">
                  {reveal.name}
                </p>
                <SecretBlock secret={reveal.secret} />
              </>
            )}
          </div>
          <DialogFooter>
            <Button onClick={() => setRevealOpen(false)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ---------------------------------------------------------------------------
// List — desktop table + mobile cards, revoked keys greyed at the bottom.
// ---------------------------------------------------------------------------

function KeyList({ keys }: { keys: ApiKeyListItem[] }) {
  return (
    <Card className="overflow-hidden">
      {/* Desktop table */}
      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="pl-6">Name</TableHead>
              <TableHead>Key</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Last used</TableHead>
              <TableHead className="pr-6 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {keys.map((key) => {
              const revoked =
                Boolean(key.revokedAt) ||
                Boolean(key.expiresAt && new Date(key.expiresAt) <= new Date());
              return (
                <TableRow
                  key={key.id}
                  className={cn("group", revoked && "opacity-60")}
                >
                  <TableCell className="max-w-[220px] pl-6">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-medium text-foreground">
                        {key.name}
                      </span>
                      {revoked && (
                        <Badge
                          variant="outline"
                          className="h-5 shrink-0 px-1.5 text-[10px] text-muted-foreground"
                        >
                          {key.revokedAt ? "Revoked" : "Expired"}
                        </Badge>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {key.scopes.join(", ")} ·{" "}
                      {key.expiresAt
                        ? `Expires ${formatDate(key.expiresAt)}`
                        : "Legacy key · no expiry"}
                    </p>
                  </TableCell>
                  <TableCell>
                    <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground">
                      {key.prefix}…
                    </code>
                  </TableCell>
                  <TableCell
                    className="text-xs text-muted-foreground"
                    title={formatDate(key.createdAt)}
                  >
                    {formatRelativeTime(key.createdAt)}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {key.lastUsedAt ? (
                      <span title={formatDate(key.lastUsedAt)}>
                        {formatRelativeTime(key.lastUsedAt)}
                      </span>
                    ) : (
                      "Never"
                    )}
                  </TableCell>
                  <TableCell className="pr-6 text-right">
                    {!revoked && <RevokeButton id={key.id} name={key.name} />}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Mobile cards */}
      <div className="divide-y divide-border/60 md:hidden">
        {keys.map((key) => {
          const revoked =
            Boolean(key.revokedAt) ||
            Boolean(key.expiresAt && new Date(key.expiresAt) <= new Date());
          return (
            <div
              key={key.id}
              className={cn("space-y-3 p-4", revoked && "opacity-60")}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="truncate font-medium text-foreground">
                      {key.name}
                    </span>
                    {revoked && (
                      <Badge
                        variant="outline"
                        className="h-5 shrink-0 px-1.5 text-[10px] text-muted-foreground"
                      >
                        {key.revokedAt ? "Revoked" : "Expired"}
                      </Badge>
                    )}
                  </div>
                  <code className="mt-0.5 block font-mono text-xs text-muted-foreground">
                    {key.prefix}…
                  </code>
                  <p className="mt-2 break-words text-xs text-muted-foreground">
                    {key.scopes.join(", ")} ·{" "}
                    {key.expiresAt
                      ? `Expires ${formatDate(key.expiresAt)}`
                      : "Legacy key · no expiry"}
                  </p>
                </div>
                {!revoked && <RevokeButton id={key.id} name={key.name} />}
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span title={formatDate(key.createdAt)}>
                  Created {formatRelativeTime(key.createdAt)}
                </span>
                <span>
                  {key.lastUsedAt ? (
                    <span title={formatDate(key.lastUsedAt)}>
                      Used {formatRelativeTime(key.lastUsedAt)}
                    </span>
                  ) : (
                    "Never used"
                  )}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Revoke — small confirm dialog scoped to one row.
// ---------------------------------------------------------------------------

function RevokeButton({ id, name }: { id: string; name: string }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [pending, start] = React.useTransition();

  function onConfirm() {
    start(async () => {
      const res = await revokeApiKey(id);
      if (res.ok) {
        toast.success("Key revoked");
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
        <Button variant="outline" size="sm">
          Revoke
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Revoke this key?</DialogTitle>
          <DialogDescription>
            Anything still using it stops working immediately.
          </DialogDescription>
        </DialogHeader>
        <div className="rounded-md border border-border/60 bg-muted/30 px-3 py-2 text-sm text-foreground">
          {name}
        </div>
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
          <Button
            type="button"
            variant="destructive"
            disabled={pending}
            onClick={onConfirm}
          >
            {pending && <Loader2 className="animate-spin" />}
            {pending ? "Revoking…" : "Revoke key"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Secret display — dark "code surface" block, matching the JSON/code blocks
// used on the developer docs page, with its own copy affordance + toast.
// ---------------------------------------------------------------------------

function SecretBlock({ secret }: { secret: string }) {
  const [copied, setCopied] = React.useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(secret);
      setCopied(true);
      toast.success("Copied");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Couldn't copy — select and copy the key manually.");
    }
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border/60 bg-code">
      <div className="flex items-center justify-between border-b border-white/10 bg-white/[0.03] px-3 py-2">
        <span className="font-mono text-xs text-zinc-400">Secret key</span>
        <button
          type="button"
          onClick={copy}
          className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/[0.04] px-2 py-1 text-xs font-medium text-zinc-400 transition-colors hover:bg-white/10 hover:text-zinc-200"
        >
          {copied ? (
            <Check className="h-3.5 w-3.5 text-success" />
          ) : (
            <Copy className="h-3.5 w-3.5" />
          )}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <div className="overflow-x-auto p-4">
        <code className="break-all font-mono text-sm leading-relaxed text-zinc-200">
          {secret}
        </code>
      </div>
    </div>
  );
}
