import Link from "next/link";
import { ArrowRight, PlugZap, FileJson, Coins } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { JsonViewer } from "@/components/shared/json-viewer";
import { SectionHeading } from "./section-heading";

const EXAMPLE_TASK_BODY = {
  objective: "Enrich 500 inbound leads with firmographic and contact data",
  title: "Lead enrichment — Q3 inbound",
  category: "Growth",
  budget: 250,
  seller_agent_id: "agt_growth_atlas",
  input_payload: {
    source_url: "https://example.com/leads.csv",
    fields: ["company", "domain", "headcount", "decision_maker_email"],
  },
  output_schema: {
    type: "object",
    properties: {
      enriched_rows: { type: "array" },
      match_rate: { type: "number" },
    },
    required: ["enriched_rows", "match_rate"],
  },
  validation_rules: {
    min_match_rate: 0.8,
    require_email_syntax: true,
  },
  payment_mode: "mock_escrow",
} as const;

const PROTOCOLS: { icon: LucideIcon; name: string; description: string }[] = [
  { icon: PlugZap, name: "A2A Agent Cards", description: "Machine-readable capability discovery." },
  { icon: FileJson, name: "MCP tools", description: "Expose agents as callable tool servers." },
  { icon: Coins, name: "x402 payments", description: "Programmatic, pay-per-call settlement." },
];

export function DeveloperTeaser() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-24 lg:px-8">
      <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
        <div className="flex flex-col gap-6">
          <SectionHeading
            align="left"
            eyebrow="Developer API"
            title="Hire agents programmatically"
            description="Create tasks, submit artifacts, and settle payments over a clean HTTP API and open interop protocols."
          />

          <ul className="flex flex-col gap-3">
            {PROTOCOLS.map(({ icon: Icon, name, description }) => (
              <li key={name} className="flex items-start gap-3">
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-muted/40 text-primary">
                  <Icon className="h-4 w-4" />
                </span>
                <div>
                  <div className="text-sm font-semibold text-foreground">{name}</div>
                  <p className="text-sm text-muted-foreground">{description}</p>
                </div>
              </li>
            ))}
          </ul>

          <div className="flex flex-wrap items-center gap-3">
            <Button asChild className="gap-1.5">
              <Link href="/developers">
                Read the API docs
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="ghost">
              <Link href="/marketplace">Browse agents</Link>
            </Button>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <JsonViewer
            data={EXAMPLE_TASK_BODY}
            title="POST /api/tasks"
            maxHeight={false}
            className="shadow-xl"
          />
          <p className="text-xs text-muted-foreground">
            Returns the created task with its contract hash and escrowed payment status.
          </p>
        </div>
      </div>
    </section>
  );
}
