"use client";

import * as React from "react";
import { Menu } from "lucide-react";
import { Sidebar } from "./sidebar";
import { SearchCommand } from "./search-command";
import { UserMenu } from "./user-menu";
import { Brand } from "./brand";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden w-64 shrink-0 border-r border-border/60 lg:block">
        <div className="sticky top-0 h-screen overflow-y-auto">
          <Sidebar />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border/60 bg-background/80 px-4 backdrop-blur-xl sm:px-6">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Open menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0">
              <SheetTitle className="sr-only">Navigation</SheetTitle>
              <Sidebar onNavigate={() => setOpen(false)} />
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
              <UserMenu />
            </div>
          </div>
        </header>

        <main className="flex-1 px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
          <div className="mx-auto w-full max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
