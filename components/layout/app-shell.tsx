"use client";

import * as React from "react";
import { Menu } from "lucide-react";
import { Sidebar } from "./sidebar";
import { SearchCommand } from "./search-command";
import { ThemeToggle } from "./theme-toggle";
import { NotificationBell } from "./notification-bell";
import { UserMenu } from "./user-menu";
import { Brand } from "./brand";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

export function AppShell({
  children,
  isAdmin = false,
  showMockBanner = true,
}: {
  children: React.ReactNode;
  isAdmin?: boolean;
  showMockBanner?: boolean;
}) {
  const [open, setOpen] = React.useState(false);

  return (
    // Floating app panel: a white rounded surface on a light-gray body, with
    // the sidebar + header fixed and the content scrolling inside it.
    <div className="h-screen overflow-hidden bg-background p-0 sm:p-3">
      <a
        href="#main"
        className="sr-only z-50 focus:not-sr-only focus:absolute focus:left-6 focus:top-6 focus:rounded-md focus:border focus:border-border focus:bg-card focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-foreground focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-ring"
      >
        Skip to content
      </a>

      <div className="flex h-full overflow-hidden border-0 bg-card sm:rounded-2xl sm:border sm:border-border sm:shadow-sm">
        <aside className="hidden w-64 shrink-0 border-r border-border lg:block">
          <div className="h-full overflow-y-auto">
            <Sidebar isAdmin={isAdmin} showMockBanner={showMockBanner} />
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <header className="flex h-16 shrink-0 items-center gap-3 border-b border-border px-4 sm:px-6">
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Open menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 p-0">
                <SheetTitle className="sr-only">Navigation</SheetTitle>
                <Sidebar
                  onNavigate={() => setOpen(false)}
                  isAdmin={isAdmin}
                  showMockBanner={showMockBanner}
                />
              </SheetContent>
            </Sheet>

            <div className="lg:hidden">
              <Brand showWordmark={false} />
            </div>

            <div className="flex flex-1 justify-end gap-2 sm:justify-between">
              <div className="hidden flex-1 sm:block sm:max-w-md">
                <SearchCommand />
              </div>
              <div className="flex items-center gap-2">
                <div className="sm:hidden">
                  <SearchCommand iconOnly />
                </div>
                <ThemeToggle />
                <NotificationBell />
                <UserMenu />
              </div>
            </div>
          </header>

          <main
            id="main"
            tabIndex={-1}
            className="flex-1 overflow-y-auto px-4 py-8 focus:outline-none sm:px-6 sm:py-8 lg:px-8"
          >
            <div className="mx-auto w-full max-w-6xl">{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
}
