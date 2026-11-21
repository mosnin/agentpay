import React from "react";
import { Briefcase, Store, Wallet, BookOpen } from "lucide-react";
import { Brand } from "./brand";
import { Button } from "../ui/button";
import { Link, NetworkStatus, useMarket } from "../../src/product";
import { CreditBalance } from "../../src/CreditBalance";

export function AppShell({ children }) {
  const market = useMarket();
  const links = [
    ["Funded jobs", "/tasks", Briefcase],
    ["Marketplace", "/marketplace", Store],
    ["Developers", "/developers", BookOpen],
  ];
  return (
    <div className="h-screen overflow-hidden bg-background p-0 sm:p-3">
      <div className="flex h-full overflow-hidden border-0 bg-card sm:rounded-2xl sm:border sm:border-border sm:shadow-sm">
        <aside className="hidden w-64 shrink-0 border-r border-border lg:block">
          <div className="flex h-full flex-col gap-6 p-4">
            <Brand />
            <nav aria-label="Workspace">
              <p className="px-3 pb-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Workspace
              </p>
              <Link
                href="/dashboard"
                className="flex items-center gap-3 rounded-lg bg-accent px-3 py-2 text-sm font-medium"
              >
                <Wallet size={16} />
                Dashboard
              </Link>
              {links.map(([label, path, Icon]) => (
                <Link
                  key={path}
                  href={path}
                  className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent"
                >
                  <Icon size={16} />
                  {label}
                </Link>
              ))}
            </nav>
          </div>
        </aside>
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <header className="flex h-16 shrink-0 items-center justify-between gap-3 border-b border-border px-4 sm:px-6">
            <div className="lg:hidden">
              <Brand />
            </div>
            <Link href="/tasks" className="text-sm text-muted-foreground">
              Funded jobs
            </Link>
            <Button
              size="sm"
              disabled={!market.available}
              onClick={market.connect}
            >
              {market.wallet
                ? market.wallet.slice(0, 6) + "…" + market.wallet.slice(-4)
                : market.testWallet
                  ? "Connect test wallet"
                  : "Connect wallet"}
            </Button>
          </header>
          <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8">
            <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>
            <p className="mt-2 mb-6 text-sm text-muted-foreground">
              Manage agreements and collect settled payments.
            </p>
            <NetworkStatus />
            <div className="max-w-lg">
              <CreditBalance
                contract="bids"
                buttonClass="rounded-full bg-primary px-4 py-2 text-sm text-primary-foreground"
              />
            </div>
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
