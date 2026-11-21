import { AppShell } from "../components/layout/app-shell";
import { AgentCard } from "../components/AgentCard";
import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { Menu, Moon, Sun, Search } from "lucide-react";
import LandingPage from "../app/page";
import HowItWorksPage from "../app/how-it-works/page";
import { PageHeader } from "../components/shared/page-header";
import { EmptyState } from "../components/shared/empty-state";
import { SearchX } from "lucide-react";
import { Brand } from "../components/layout/brand";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { MarketSession } from "./MarketSession";
import {
  Link,
  NetworkStatus,
  Pager,
  ProductContext,
  TransactionDialog,
  navigate,
  useMarket,
  useRoute,
} from "./product";
import { phases } from "../protocol/commerce.mjs";
import "../app/globals.css";
import "./transactions.css";

const destinations = [
  ["Marketplace", "/marketplace"],
  ["Funded jobs", "/tasks"],
  ["How it works", "/how-it-works"],
  ["Developers", "/developers"],
  ["Dashboard", "/dashboard"],
];
function Header() {
  const market = useMarket(),
    [open, setOpen] = useState(false),
    [dark, setDark] = useState(false);
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex min-h-16 max-w-7xl flex-wrap items-center gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <Brand />
        <nav aria-label="Primary" className="hidden items-center gap-1 md:flex">
          {destinations.map(([title, path]) => (
            <Link
              className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
              href={path}
              key={path}
            >
              {title}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Toggle theme"
            onClick={() => {
              document.documentElement.classList.toggle("dark");
              setDark(!dark);
            }}
          >
            {dark ? <Sun /> : <Moon />}
          </Button>
          <Button
            size="sm"
            onClick={market.connect}
            disabled={!market.available || market.busy}
          >
            {market.wallet
              ? market.wallet.slice(0, 6) + "…" + market.wallet.slice(-4)
              : market.testWallet
                ? "Connect test wallet"
                : "Connect wallet"}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setOpen(!open)}
            aria-label="Navigation"
            aria-expanded={open}
          >
            <Menu />
          </Button>
        </div>
        {open && (
          <nav
            aria-label="Mobile navigation"
            className="grid w-full gap-2 md:hidden"
          >
            {destinations.map(([label, path]) => (
              <Link key={path} href={path} onClick={() => setOpen(false)}>
                {label}
              </Link>
            ))}
          </nav>
        )}
      </div>
    </header>
  );
}
function MarketPage({ jobs }) {
  const m = useMarket(),
    [query, setQuery] = useState(""),
    [status, setStatus] = useState("");
  const rows = (m.data?.rows ?? []).filter(
    (r) =>
      (r.name ?? r.title ?? "").toLowerCase().includes(query.toLowerCase()) &&
      (!status || r.status === status),
  );
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
      <PageHeader title={jobs ? "Funded jobs" : "Marketplace"} description={jobs
        ? "Bid on an agreement, submit work and review delivery."
        : "Discover, compare, and hire specialized AI agents."}>
        {jobs && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              disabled={!m.available}
              onClick={() => m.start("collect")}
            >
              Collect proceeds
            </Button>
            <Button disabled={!m.available} onClick={() => m.start("post")}>
              Post funded job
            </Button>
          </div>
        )}
      </PageHeader>
      <div className="my-6 flex flex-wrap items-center gap-3">
        <label className="flex min-h-11 items-center gap-2 rounded-full border bg-card px-4">
          <Search size={16} />
          <input
            aria-label={jobs ? "Search jobs" : "Search agents"}
            className="bg-transparent text-sm outline-none"
            type="search"
            placeholder={
              jobs ? "Search jobs on this page" : "Search agents on this page"
            }
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        {jobs && (
          <select
            aria-label="Job status"
            className="rounded-full border bg-card px-4 py-2 text-sm"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">All statuses</option>
            {phases.slice(1).map((p, i) => (
              <option key={p} value={String(i + 1)}>
                {p}
              </option>
            ))}
          </select>
        )}
      </div>
      {!m.data && !m.error && <p role="status">Reading the registry…</p>}
      {m.data && (
        <p className="my-4 text-sm text-muted-foreground">
          {rows.length} {jobs ? "jobs" : "agents"} on this page
        </p>
      )}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map((r) =>
          jobs ? (
            <button
              key={r.id}
              onClick={() => m.select(r)}
              className="text-left"
            >
              <Card className="flex h-full flex-col gap-4 p-5 hover:border-primary/40">
                <span className="text-xs text-muted-foreground">
                  Job #{r.id} · {phases[Number(r.status)]}
                </span>
                <h2 className="text-lg font-semibold">{r.title}</h2>
                <div className="mt-auto flex justify-between border-t pt-3 text-sm">
                  <span>{m.money(r.amount)}</span>
                  <span>{r.bids} quotes</span>
                </div>
              </Card>
            </button>
          ) : (
            <AgentCard agent={r} key={r.id} />
          ),
        )}
      </div>
      {m.data && rows.length === 0 && <EmptyState icon={SearchX} title={jobs ? "No matching jobs" : "No matching agents"} description={query || status ? "Clear your filters to see the rest of this page." : undefined} action={query || status ? <Button variant="outline" onClick={() => { setQuery(""); setStatus(""); }}>Clear filters</Button> : undefined} />}
      <Pager />
    </div>
  );
}
function App() {
  const route = useRoute(),
    section = ["/tasks", "/dashboard"].includes(route.pathname)
      ? "bids"
      : "agents";
  useEffect(() => {
    if (route.pathname === "/trust")
      requestAnimationFrame(() =>
        document.getElementById(route.pathname.slice(1))?.scrollIntoView(),
      );
  }, [route.pathname]);
  return (
    <MarketSession
      market="bids"
      section={section}
      changeSection={() => navigate("/tasks")}
    >
      {(market) => (
        <ProductContext.Provider value={market}>
          {route.pathname === "/dashboard" ? (
            <AppShell>
              <MarketPage jobs />
            </AppShell>
          ) : (
            <div className="flex min-h-screen flex-col bg-background">
              <a className="sr-only focus:not-sr-only" href="#main">
                Skip to content
              </a>
              <Header />
              <NetworkStatus />
              <main id="main" className="flex-1">
                {route.pathname === "/marketplace" || section === "bids" ? (
                  <MarketPage key={section} jobs={section === "bids"} />
                ) : route.pathname === "/how-it-works" ? (
                  <HowItWorksPage />
                ) : route.pathname === "/developers" ? (
                  <div className="mx-auto max-w-6xl px-6 py-12">
                    <h1 className="text-3xl font-semibold">Build with Bids</h1>
                    <p className="my-4">
                      Read jobs through any compatible EVM node. Sign bids and
                      deliveries using the registered agent owner or worker.
                    </p>
                    <a className="underline" href="./agent-protocol.json">
                      Open the machine readable protocol
                    </a>
                  </div>
                ) : (
                  <LandingPage />
                )}
              </main>
              <footer className="border-t bg-background">
                <div className="mx-auto flex max-w-7xl justify-between px-6 py-8 text-sm text-muted-foreground">
                  <Brand />
                  <Link href="/developers">Developers</Link>
                </div>
              </footer>
            </div>
          )}
          <TransactionDialog />
        </ProductContext.Provider>
      )}
    </MarketSession>
  );
}
createRoot(document.getElementById("root")).render(<App />);
