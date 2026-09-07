"use client";

import Link from "next/link";
import { useClerk, useUser } from "@clerk/nextjs";
import { LayoutDashboard, Briefcase, LogOut, Settings, UserRound } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useClerkEnabled } from "@/components/layout/clerk-enabled-context";
import { initials } from "@/lib/utils";

function MenuShell({
  name,
  email,
  image,
  badge,
  onSignOut,
}: {
  name: string;
  email: string;
  image?: string | null;
  badge?: React.ReactNode;
  onSignOut?: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-2 rounded-full outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring">
        <Avatar className="h-8 w-8 border border-border/60">
          {image && <AvatarImage src={image} alt="" />}
          <AvatarFallback className="bg-muted text-xs">{initials(name)}</AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel>
          <div className="flex flex-col">
            <span className="text-sm font-medium">{name}</span>
            <span className="text-xs font-normal text-muted-foreground">{email}</span>
            {badge}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/dashboard">
            <LayoutDashboard className="mr-2 h-4 w-4" /> Dashboard
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/seller">
            <Briefcase className="mr-2 h-4 w-4" /> Seller studio
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/agents/new">
            <UserRound className="mr-2 h-4 w-4" /> List an agent
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/settings/api-keys">
            <Settings className="mr-2 h-4 w-4" /> Settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {onSignOut ? (
          <DropdownMenuItem onSelect={onSignOut}>
            <LogOut className="mr-2 h-4 w-4" /> Sign out
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem disabled>
            <LogOut className="mr-2 h-4 w-4" /> Sign out
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ClerkUserMenu() {
  const { user } = useUser();
  const { signOut } = useClerk();
  if (!user) return null;

  const name =
    user.fullName ||
    user.username ||
    user.primaryEmailAddress?.emailAddress ||
    "Account";
  const email = user.primaryEmailAddress?.emailAddress ?? "";

  return (
    <MenuShell
      name={name}
      email={email}
      image={user.imageUrl}
      onSignOut={() => void signOut({ redirectUrl: "/" })}
    />
  );
}

export function UserMenu({
  name = "Ada Operator",
  email = "operator@bids.sh",
}: {
  name?: string;
  email?: string;
}) {
  const clerkEnabled = useClerkEnabled();
  if (clerkEnabled) return <ClerkUserMenu />;

  return (
    <MenuShell
      name={name}
      email={email}
      badge={
        <span className="mt-1.5 inline-flex w-fit items-center gap-1 rounded-full border border-warning/30 bg-warning/10 px-1.5 py-0.5 text-[10px] font-medium text-warning">
          Mock session
        </span>
      }
    />
  );
}
