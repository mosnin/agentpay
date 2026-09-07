"use client";

import dynamic from "next/dynamic";

export type IslandTone = "busy" | "success" | "error";

export interface IslandState {
  label: string;
  tone: IslandTone;
}

// Defer the framer-motion island internals (dynamic-island.tsx, ~500 lines)
// until an action actually fires — the island is never rendered at initial
// load, so lazy-loading it trims the task page's first-load JS with no
// visible pop-in. ssr:false because the island is a client-only overlay.
const TaskStatusIslandBody = dynamic(
  () => import("./task-status-island-body"),
  { ssr: false },
);

/**
 * Floating lifecycle status pill for the task detail page. Appears while an
 * action is in flight, morphs wider during work, settles on the outcome, and
 * is dismissed by the owner clearing `state`. Decorative-input free: it only
 * ever reflects real action state.
 */
export function TaskStatusIsland({ state }: { state: IslandState | null }) {
  if (!state) return null;

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-6 z-40 flex justify-center"
    >
      <TaskStatusIslandBody state={state} />
    </div>
  );
}
