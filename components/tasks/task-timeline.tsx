import { Ban, Check, Loader2, ShieldAlert } from "lucide-react";
import { TASK_LIFECYCLE, TASK_STATUS_CONFIG } from "@/lib/constants";
import { cn } from "@/lib/utils";

type StepState = "complete" | "current" | "upcoming";

const STEP_HINTS: Record<string, string> = {
  draft: "Contract drafted, not yet published.",
  pending: "Awaiting acceptance by the agent.",
  accepted: "Agent committed to the contract.",
  running: "Work in progress.",
  submitted: "Artifact delivered — checked automatically against the contract.",
  validating: "Passed validation — awaiting buyer approval to release payment.",
  completed: "Validated and payment released.",
};

/** Furthest canonical step considered "reached" for a given off-ramp status. */
const OFFRAMP_REACHED: Record<string, number> = {
  disputed: TASK_LIFECYCLE.indexOf("submitted"),
  cancelled: TASK_LIFECYCLE.indexOf("accepted"),
};

/**
 * Vertical lifecycle stepper. Walks the canonical TASK_LIFECYCLE and marks each
 * step relative to the task's current status. `disputed` and `cancelled` are
 * terminal off-ramps: the timeline freezes at the last reached step and a
 * distinct terminal node is appended.
 */
export function TaskTimeline({ status }: { status: string }) {
  const isDisputed = status === "disputed";
  const isCancelled = status === "cancelled";
  const isTerminalOfframp = isDisputed || isCancelled;

  // Where on the canonical path did the task get to before any off-ramp?
  const currentIndex = TASK_LIFECYCLE.indexOf(
    status as (typeof TASK_LIFECYCLE)[number],
  );

  // For off-ramps we infer the furthest reached step so prior steps read as done.
  const lastReachedIndex = isTerminalOfframp
    ? Math.max(0, OFFRAMP_REACHED[status] ?? TASK_LIFECYCLE.indexOf("running"))
    : currentIndex;

  function stateFor(index: number): StepState {
    if (isTerminalOfframp) {
      // Everything is treated as reached-or-not; nothing is "current".
      return index <= lastReachedIndex ? "complete" : "upcoming";
    }
    if (currentIndex < 0) return "upcoming";
    if (index < currentIndex) return "complete";
    if (index === currentIndex) return "current";
    return "upcoming";
  }

  return (
    <ol className="relative space-y-0">
      {TASK_LIFECYCLE.map((step, index) => {
        const state = stateFor(index);
        const config = TASK_STATUS_CONFIG[step];
        const isLast = index === TASK_LIFECYCLE.length - 1 && !isTerminalOfframp;
        return (
          <li key={step} className="relative flex gap-4 pb-6 last:pb-0">
            {!isLast && (
              <span
                aria-hidden
                className={cn(
                  "absolute left-[11px] top-7 h-[calc(100%-1.25rem)] w-px",
                  state === "complete" ? "bg-primary/60" : "bg-border/70",
                )}
              />
            )}
            <span
              className={cn(
                "relative z-10 mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[10px] font-semibold",
                state === "complete" &&
                  "border-primary/50 bg-primary text-primary-foreground",
                state === "current" &&
                  "border-primary/60 bg-primary/15 text-primary",
                state === "upcoming" &&
                  "border-border/70 bg-muted/30 text-muted-foreground",
              )}
            >
              {state === "complete" ? (
                <Check className="h-3.5 w-3.5" />
              ) : state === "current" ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                index + 1
              )}
            </span>
            <div className="min-w-0 pt-0.5">
              <div
                className={cn(
                  "text-sm font-medium",
                  state === "upcoming"
                    ? "text-muted-foreground"
                    : "text-foreground",
                )}
              >
                {config?.label ?? step}
              </div>
              <div className="text-xs text-muted-foreground">
                {STEP_HINTS[step]}
                {state === "current" && (
                  <span className="ml-1 text-primary">· in progress</span>
                )}
              </div>
            </div>
          </li>
        );
      })}

      {isTerminalOfframp && (
        <li className="relative flex gap-4">
          <span
            className={cn(
              "relative z-10 mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border",
              isDisputed
                ? "border-destructive/50 bg-destructive/15 text-destructive"
                : "border-border bg-muted text-muted-foreground",
            )}
          >
            {isDisputed ? (
              <ShieldAlert className="h-3.5 w-3.5" />
            ) : (
              <Ban className="h-3.5 w-3.5" />
            )}
          </span>
          <div className="pt-0.5">
            <div
              className={cn(
                "text-sm font-medium",
                isDisputed ? "text-destructive" : "text-foreground",
              )}
            >
              {isDisputed ? "Disputed" : "Cancelled"}
            </div>
            <div className="text-xs text-muted-foreground">
              {isDisputed
                ? "Paused for review by an operator."
                : "Task was cancelled and any escrow refunded."}
            </div>
          </div>
        </li>
      )}
    </ol>
  );
}
