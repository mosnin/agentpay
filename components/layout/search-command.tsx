"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import {
  Bot,
  Clock,
  Moon,
  Plus,
  Search,
  ShieldCheck,
  Store,
  Sun,
} from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { SIDEBAR_GROUPS } from "@/lib/nav";
import { CATEGORIES } from "@/lib/constants";
import { cn } from "@/lib/utils";
import {
  readRecentAgents,
  type RecentAgent,
} from "@/components/agents/recently-viewed";

interface AgentHit {
  id: string;
  slug: string;
  name: string;
  category: string;
  capabilities: string[];
  verified: boolean;
}

// Shape returned by GET /api/search (lib/queries.ts#searchAgentsQuick) — a
// lean projection, already ranked verified-desc / reputation-desc server-side.
interface AgentSearchHit {
  id: string;
  slug: string;
  name: string;
  category: string;
  verified: boolean;
  reputationScore: number;
}

const LIVE_SEARCH_MIN_LENGTH = 2;
const LIVE_SEARCH_DEBOUNCE_MS = 200;

/**
 * One agent row, shared by the preloaded (cmdk-filtered) agent list and the
 * live server-search results — identical composition either way so the two
 * data sources are visually indistinguishable.
 */
function AgentResultItem({
  agent,
  onSelect,
  value,
  forceMount,
}: {
  agent: { id: string; name: string; category: string; verified: boolean };
  onSelect: () => void;
  value: string;
  forceMount?: boolean;
}) {
  return (
    <CommandItem value={value} forceMount={forceMount} onSelect={onSelect}>
      <Bot className="mr-2 h-4 w-4 text-muted-foreground" />
      <span>{agent.name}</span>
      {agent.verified && (
        <ShieldCheck className="ml-1.5 h-3.5 w-3.5 shrink-0 text-primary" />
      )}
      {agent.category && (
        <span className="ml-auto text-xs text-muted-foreground">
          {agent.category}
        </span>
      )}
    </CommandItem>
  );
}

export function SearchCommand({ iconOnly = false }: { iconOnly?: boolean }) {
  const [open, setOpen] = React.useState(false);
  const [agents, setAgents] = React.useState<AgentHit[]>([]);
  const [recents, setRecents] = React.useState<RecentAgent[]>([]);
  // Live, debounced /api/search results — populated once the typed query
  // reaches LIVE_SEARCH_MIN_LENGTH chars. Keeps whatever it last held on a
  // failed fetch (see the effect below), so a network hiccup never clears
  // results the user can already see.
  const [paletteQuery, setPaletteQuery] = React.useState("");
  const [liveAgents, setLiveAgents] = React.useState<AgentSearchHit[]>([]);
  const isLiveSearch = paletteQuery.trim().length >= LIVE_SEARCH_MIN_LENGTH;
  // Default to the ⌘ glyph (matches SSR); correct to "Ctrl" on non-Mac after
  // mount so Windows/Linux users see the shortcut that actually works for them.
  const [shortcut, setShortcut] = React.useState("⌘K");
  const loadedRef = React.useRef(false);
  const router = useRouter();

  React.useEffect(() => {
    const platform = navigator.platform || navigator.userAgent;
    if (!/Mac|iPhone|iPad|iPod/i.test(platform)) setShortcut("Ctrl K");
  }, []);

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  // Lazily load agents the first time the palette opens, so ⌘K can jump
  // straight to any agent's profile — not just pages and categories.
  React.useEffect(() => {
    if (!open || loadedRef.current) return;
    loadedRef.current = true;
    const controller = new AbortController();
    fetch("/api/agents", { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : []))
      .then((data: unknown) => {
        if (!Array.isArray(data)) return;
        const hits: AgentHit[] = (data as unknown[]).map((raw) => {
          const a = raw as Record<string, unknown>;
          const trust = (a.trust ?? {}) as Record<string, unknown>;
          const caps = Array.isArray(a.capabilities)
            ? (a.capabilities as unknown[])
            : [];
          return {
            id: String(a.id ?? a.agent_id ?? ""),
            slug: String(a.slug ?? a.id ?? ""),
            name: String(a.name ?? "Agent"),
            category: String(a.category ?? ""),
            capabilities: caps.map((c) => String(c)),
            verified: Boolean(trust.verified),
          };
        });
        setAgents(hits.filter((h) => h.slug));
      })
      .catch(() => {
        // Allow a retry on the next open if the request failed.
        loadedRef.current = false;
      });
    return () => controller.abort();
  }, [open]);

  // Refresh recents from localStorage each time the palette opens.
  React.useEffect(() => {
    if (open) setRecents(readRecentAgents());
  }, [open]);

  // Reset the live-search box each time the palette closes, so reopening
  // ⌘K always starts from a blank query — matching the previous
  // (uncontrolled) input's behavior instead of resuming a stale search.
  React.useEffect(() => {
    if (!open) {
      setPaletteQuery("");
      setLiveAgents([]);
    }
  }, [open]);

  // Debounced live search: once the typed query reaches the minimum length,
  // wait for a pause in typing, then ask the server (which can match on
  // description/category/capability, not just name) and swap the "Agents"
  // group over to those results. A failed or slow fetch just leaves the
  // previous live results on screen — no error state to render.
  React.useEffect(() => {
    const query = paletteQuery.trim();
    if (query.length < LIVE_SEARCH_MIN_LENGTH) {
      setLiveAgents([]);
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(query)}`, {
        signal: controller.signal,
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((data: { agents?: unknown } | null) => {
          if (!data || !Array.isArray(data.agents)) return;
          setLiveAgents(data.agents as AgentSearchHit[]);
        })
        .catch(() => {
          // Silent by design — keep whatever results are already showing.
        });
    }, LIVE_SEARCH_DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [paletteQuery]);

  const go = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  const { resolvedTheme, setTheme } = useTheme();
  const toggleTheme = () => {
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
    setOpen(false);
  };

  const navItems = SIDEBAR_GROUPS.flatMap((g) => g.items);

  return (
    <>
      {iconOnly ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-border/60 bg-muted/30 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label="Search"
        >
          <Search className="h-4 w-4" />
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={cn(
            "flex w-full items-center gap-2 rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground",
          )}
        >
          <Search className="h-4 w-4" />
          <span className="flex-1 text-left">Search agents, pages…</span>
          <kbd className="pointer-events-none hidden items-center gap-1 rounded border border-border/60 bg-background px-1.5 font-mono text-[10px] text-muted-foreground sm:inline-flex">
            {shortcut}
          </kbd>
        </button>
      )}

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput
          placeholder="Search agents, pages, categories…"
          value={paletteQuery}
          onValueChange={setPaletteQuery}
        />
        <CommandList>
          {/* Live results are force-mounted (server already did the matching),
              so they're invisible to cmdk's own filtered-count tally — suppress
              the empty state while we're showing them, or it'd render
              alongside real results instead of only when there truly are none. */}
          {!(isLiveSearch && liveAgents.length > 0) && (
            <CommandEmpty>No results found.</CommandEmpty>
          )}
          <CommandGroup heading="Actions">
            <CommandItem value="action new task create" onSelect={() => go("/tasks/new")}>
              <Plus className="mr-2 h-4 w-4 text-muted-foreground" />
              <span>New task</span>
            </CommandItem>
            <CommandItem
              value="action list an agent new listing"
              onSelect={() => go("/agents/new")}
            >
              <Store className="mr-2 h-4 w-4 text-muted-foreground" />
              <span>List an agent</span>
            </CommandItem>
            <CommandItem
              value="action toggle theme light dark mode"
              onSelect={toggleTheme}
            >
              {resolvedTheme === "dark" ? (
                <Sun className="mr-2 h-4 w-4 text-muted-foreground" />
              ) : (
                <Moon className="mr-2 h-4 w-4 text-muted-foreground" />
              )}
              <span>
                Switch to {resolvedTheme === "dark" ? "light" : "dark"} mode
              </span>
            </CommandItem>
          </CommandGroup>
          <CommandSeparator />
          {recents.length > 0 && (
            <>
              <CommandGroup heading="Recently viewed">
                {recents.map((agent) => (
                  <CommandItem
                    key={`recent-${agent.slug}`}
                    value={`recent ${agent.name} ${agent.category}`}
                    onSelect={() => go(`/agents/${agent.slug}`)}
                  >
                    <Clock className="mr-2 h-4 w-4 text-muted-foreground" />
                    <span>{agent.name}</span>
                    {agent.category && (
                      <span className="ml-auto text-xs text-muted-foreground">
                        {agent.category}
                      </span>
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
              <CommandSeparator />
            </>
          )}
          {isLiveSearch
            ? liveAgents.length > 0 && (
                <>
                  {/* forceMount: these are already matched server-side (name,
                      description, category, capabilities), so cmdk's own
                      client-side fuzzy filter — which only ever sees `value`
                      below — must not re-hide or re-score them. */}
                  <CommandGroup heading="Agents" forceMount>
                    {liveAgents.map((agent) => (
                      <AgentResultItem
                        key={agent.id}
                        agent={agent}
                        value={agent.id}
                        forceMount
                        onSelect={() => go(`/agents/${agent.slug}`)}
                      />
                    ))}
                  </CommandGroup>
                  <CommandSeparator />
                </>
              )
            : agents.length > 0 && (
                <>
                  <CommandGroup heading="Agents">
                    {agents.map((agent) => (
                      <AgentResultItem
                        key={agent.id}
                        agent={agent}
                        value={`agent ${agent.name} ${agent.category} ${agent.capabilities.join(" ")}`}
                        onSelect={() => go(`/agents/${agent.slug}`)}
                      />
                    ))}
                  </CommandGroup>
                  <CommandSeparator />
                </>
              )}
          <CommandGroup heading="Pages">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <CommandItem
                  key={item.href}
                  value={`${item.title} ${item.description ?? ""}`}
                  onSelect={() => go(item.href)}
                >
                  <Icon className="mr-2 h-4 w-4 text-muted-foreground" />
                  <span>{item.title}</span>
                  {item.description && (
                    <span className="ml-auto text-xs text-muted-foreground">{item.description}</span>
                  )}
                </CommandItem>
              );
            })}
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="Browse by category">
            {CATEGORIES.map((cat) => (
              <CommandItem
                key={cat.value}
                value={`category ${cat.label}`}
                onSelect={() => go(`/marketplace?category=${encodeURIComponent(cat.value)}`)}
              >
                <Search className="mr-2 h-4 w-4 text-muted-foreground" />
                {cat.label}
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}
