"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DynamicContainer,
  DynamicIsland,
  DynamicIslandProvider,
  useDynamicIslandSize,
} from "@/components/ui/dynamic-island";
import type { IslandState, IslandTone } from "./task-status-island";

// The island surface is pure black in both themes (like the hardware it
// quotes), so its inner colors are fixed shades — not theme tokens.
const TONE_DOT: Record<IslandTone, string> = {
  busy: "bg-sky-400 animate-pulse",
  success: "bg-emerald-400",
  error: "bg-red-400",
};

function IslandBody({ state }: { state: IslandState }) {
  const { setSize } = useDynamicIslandSize();

  // Grow while working; settle tighter on the outcome unless the label
  // needs the room.
  React.useEffect(() => {
    setSize(
      state.tone === "busy" || state.label.length > 22 ? "compactLong" : "compact",
    );
  }, [state.tone, state.label, setSize]);

  return (
    <DynamicIsland id="task-status-island">
      <DynamicContainer className="flex h-full w-full items-center justify-center gap-2 px-4">
        {state.tone === "busy" ? (
          <Loader2 className="h-3 w-3 shrink-0 animate-spin text-sky-400" />
        ) : (
          <span className={cn("h-2 w-2 shrink-0 rounded-full", TONE_DOT[state.tone])} />
        )}
        <span className="truncate text-xs font-medium text-white">
          {state.label}
        </span>
      </DynamicContainer>
    </DynamicIsland>
  );
}

/**
 * The framer-motion-backed island internals, split into their own module so
 * task-status-island.tsx can defer this whole chunk (dynamic-island.tsx is
 * ~500 lines of motion) until the first action actually fires — the island is
 * never on screen at initial load, so there's nothing to pop in.
 */
export default function TaskStatusIslandBody({ state }: { state: IslandState }) {
  return (
    <DynamicIslandProvider initialSize="compact">
      <IslandBody state={state} />
    </DynamicIslandProvider>
  );
}
