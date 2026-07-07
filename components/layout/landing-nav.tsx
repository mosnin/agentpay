"use client";

import * as React from "react";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { Menu } from "lucide-react";
import { Brand } from "./brand";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useClerkEnabled } from "@/components/layout/clerk-enabled-context";
import { cn } from "@/lib/utils";

const LINKS = [
  { title: "Marketplace", href: "/marketplace" },
  { title: "How it works", href: "/#how-it-works" },
  { title: "Trust", href: "/#trust" },
  { title: "Developers", href: "/developers" },
];

function ProductCtas() {
  return (
    <>
      <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
        <Link href="/marketplace">Explore agents</Link>
      </Button>
      <Button asChild size="sm" className="hidden sm:inline-flex">
        <Link href="/agents/new">List your agent</Link>
      </Button>
    </>
  );
}

/** Auth-aware CTAs. Mounted only when Clerk is configured, so the hook
 * always runs inside ClerkProvider. Signed-out visitors get a clear way
 * into an account instead of a seller CTA that bounces to sign-in. */
function AuthCtas() {
  const { isLoaded, isSignedIn } = useUser();
  if (!isLoaded) return null;
  if (isSignedIn) return <ProductCtas />;
  return (
    <>
      <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
        <Link href="/sign-in">Sign in</Link>
      </Button>
      <Button asChild size="sm">
        <Link href="/sign-up">Get started</Link>
      </Button>
    </>
  );
}

/** Same decision for the mobile sheet's bottom CTAs. */
function SheetAuthCtas({ onNavigate }: { onNavigate: () => void }) {
  const { isLoaded, isSignedIn } = useUser();
  if (!isLoaded) return null;
  if (isSignedIn) {
    return (
      <>
        <Button asChild variant="outline" className="mt-3">
          <Link href="/marketplace" onClick={onNavigate}>Explore agents</Link>
        </Button>
        <Button asChild>
          <Link href="/agents/new" onClick={onNavigate}>List your agent</Link>
        </Button>
      </>
    );
  }
  return (
    <>
      <Button asChild variant="outline" className="mt-3">
        <Link href="/sign-in" onClick={onNavigate}>Sign in</Link>
      </Button>
      <Button asChild>
        <Link href="/sign-up" onClick={onNavigate}>Get started</Link>
      </Button>
    </>
  );
}

export function LandingNav() {
  const [scrolled, setScrolled] = React.useState(false);
  const [open, setOpen] = React.useState(false);
  const clerkEnabled = useClerkEnabled();

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full transition-colors duration-300",
        scrolled ? "border-b border-border/60 bg-background/80 backdrop-blur-xl" : "border-b border-transparent",
      )}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6 lg:px-8">
        <Brand />

        <nav className="hidden items-center gap-1 md:flex">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {link.title}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          {clerkEnabled ? <AuthCtas /> : <ProductCtas />}

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
                {LINKS.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setOpen(false)}
                    className="rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    {link.title}
                  </Link>
                ))}
                {clerkEnabled ? (
                  <SheetAuthCtas onNavigate={() => setOpen(false)} />
                ) : (
                  <>
                    <Button asChild variant="outline" className="mt-3">
                      <Link href="/marketplace" onClick={() => setOpen(false)}>Explore agents</Link>
                    </Button>
                    <Button asChild>
                      <Link href="/agents/new" onClick={() => setOpen(false)}>List your agent</Link>
                    </Button>
                  </>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
