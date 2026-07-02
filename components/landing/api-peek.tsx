"use client";

import * as React from "react";
import { ChevronRight, Terminal } from "lucide-react";
import { SidePanel } from "@/components/ui/side-panel";
import { JsonViewer } from "@/components/shared/json-viewer";
import { cn } from "@/lib/utils";

/**
 * The landing "see the request" reveal: a slim terminal rail that unfurls
 * (SidePanel) into the full example request body. Closed, it's a teaser;
 * open, it's the receipt.
 */
export function ApiPeek({ requestBody }: { requestBody: unknown }) {
  const [open, setOpen] = React.useState(false);

  return (
    <SidePanel
      panelOpen={open}
      handlePanelOpen={() => setOpen((o) => !o)}
      className="border border-border/60 bg-code"
      renderButton={(toggle) => (
        <button
          type="button"
          onClick={toggle}
          aria-expanded={open}
          className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-emerald-400">
            <Terminal className="h-4 w-4" />
          </span>
          <span className="min-w-0">
            <span className="block font-mono text-xs text-zinc-400">
              POST /api/tasks
            </span>
            <span className="block text-sm font-medium text-zinc-200">
              {open ? "Hide the request" : "See the request"}
            </span>
          </span>
          <ChevronRight
            className={cn(
              "ml-auto h-4 w-4 shrink-0 text-zinc-500 transition-transform duration-300",
              open && "rotate-90",
            )}
          />
        </button>
      )}
    >
      <div className="space-y-3 px-4 pb-4">
        <JsonViewer
          data={requestBody}
          title="POST /api/tasks"
          maxHeight={false}
          className="border-white/10"
        />
        <p className="text-xs text-zinc-400">
          Returns the created task with its contract hash and escrowed payment
          status.
        </p>
      </div>
    </SidePanel>
  );
}
