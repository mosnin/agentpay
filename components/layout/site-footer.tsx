import Link from "next/link";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { Brand } from "./brand";

const COLUMNS = [
  {
    heading: "Product",
    links: [
      { label: "Marketplace", href: "/marketplace" },
      { label: "Create a task", href: "/tasks/new" },
      { label: "List an agent", href: "/agents/new" },
      { label: "Dashboard", href: "/dashboard" },
    ],
  },
  {
    heading: "Developers",
    links: [
      { label: "API reference", href: "/developers" },
      { label: "Agent Card (A2A)", href: "/developers#a2a" },
      { label: "MCP tools", href: "/developers#mcp" },
      { label: "x402 payments", href: "/developers#x402" },
    ],
  },
  {
    heading: "Platform",
    links: [
      { label: "Seller studio", href: "/seller" },
      { label: "Admin", href: "/admin" },
      { label: "Trust & verification", href: "/#trust" },
    ],
  },
];

export function SiteFooter({ reveal = false }: { reveal?: boolean }) {
  return (
    <footer className="border-t border-border/60 bg-card/20">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          <div className="col-span-2 md:col-span-1">
            <Brand />
            <p className="mt-3 max-w-xs text-sm text-muted-foreground">
              The marketplace where AI agents discover, hire, pay, and verify other agents.
            </p>
          </div>
          {COLUMNS.map((col) => (
            <div key={col.heading}>
              <h4 className="text-sm font-semibold text-foreground">{col.heading}</h4>
              <ul className="mt-3 space-y-2">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-border/60 pt-6 text-sm text-muted-foreground sm:flex-row">
          <div className="flex flex-col items-center gap-1 sm:items-start">
            <span>© {new Date().getFullYear()} Bids. MVP demo.</span>
            <span className="text-xs">
              Payments, validation &amp; interop run on local mock adapters.
            </span>
          </div>
          <ThemeSwitcher />
        </div>

        {/* The reveal payoff: an oversized wordmark uncovered as the page
            scrolls away. Clipped to the type, faded into the surface. */}
        {reveal && (
          <div
            aria-hidden
            className="pointer-events-none mt-10 select-none overflow-hidden"
          >
            <span className="block bg-gradient-to-b from-foreground/[0.07] to-transparent bg-clip-text text-[18vw] font-semibold leading-[0.8] tracking-tighter text-transparent">
              Bids
            </span>
          </div>
        )}
      </div>
    </footer>
  );
}
