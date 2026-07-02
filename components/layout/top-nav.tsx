"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { Menu } from "lucide-react";
import { Brand } from "./brand";
import { SearchCommand } from "./search-command";
import { ThemeToggle } from "./theme-toggle";
import { TOP_NAV_LINKS } from "@/lib/nav";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

// Inlined at build time — auth affordances only render when Clerk is configured.
const CLERK_ENABLED = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

/** "Sign in" link for signed-out visitors. Mounted only when Clerk is
 * configured, so the hook always runs inside ClerkProvider. */
function SignInLink() {
  const { isLoaded, isSignedIn } = useUser();
  if (!isLoaded || isSignedIn) return null;
  return (
    <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
      <Link href="/sign-in">Sign in</Link>
    </Button>
  );
}

export function TopNav() {
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6 lg:px-8">
        <Brand />

        <nav className="hidden items-center gap-1 md:flex">
          {TOP_NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive(link.href)
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {link.title}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <div className="hidden w-56 lg:block">
            <SearchCommand />
          </div>
          <div className="lg:hidden">
            <SearchCommand iconOnly />
          </div>
          <ThemeToggle />
          {CLERK_ENABLED && <SignInLink />}
          <Button asChild size="sm" className="hidden sm:inline-flex">
            {/* Protected route — signed-out visitors are routed through sign-in. */}
            <Link href="/agents/new">List your agent</Link>
          </Button>

          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72">
              <SheetTitle className="sr-only">Navigation</SheetTitle>
              <div className="mt-6 flex flex-col gap-1">
                {TOP_NAV_LINKS.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setOpen(false)}
                    className="rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    {link.title}
                  </Link>
                ))}
                <Button asChild className="mt-3">
                  <Link href="/agents/new" onClick={() => setOpen(false)}>
                    List your agent
                  </Link>
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
