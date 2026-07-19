"use client";

import * as React from "react";
import { useOptimistic } from "react";
import {
  Ban,
  CheckCircle2,
  Info,
  Loader2,
  Lock,
  PlayCircle,
  ShieldAlert,
  Star,
  ThumbsUp,
  Upload,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  TaskStatusIsland,
  type IslandState,
} from "@/components/tasks/task-status-island";
import {
  acceptTask,
  startTask,
  approveTask,
  cancelTask,
  simulateTask,
} from "@/lib/actions/tasks";
import { trackFirstTaskCompleted } from "@/components/analytics/track";
import { SubmitArtifactDialog } from "./submit-artifact-dialog";
import { ReviewForm } from "./review-form";
import { DisputeDialog } from "./dispute-dialog";
import type { ActionResult } from "@/lib/types";

interface TaskActionsProps {
  task: {
    id: string;
    status: string;
    hasReviewed: boolean;
    /** Buyer (or admin) — the only viewers approveTask will actually allow. */
    canApprove: boolean;
    /** Seller agent's owner (or admin) — may accept, start, and submit. */
    canWork: boolean;
    /** Buyer (or admin) — may cancel while the task is still early. */
    canCancel: boolean;
    /** Holds both sides (or admin) — the demo runner needs full rights. */
    canSimulate: boolean;
  };
}

const ACTIVE_STATUSES = new Set([
  "pending",
  "accepted",
  "running",
  "submitted",
  "validating",
]);

// Plain-language "what happens next", spoken to the viewer's own role — a
// buyer is never told to submit an artifact they have no button for, and an
// agent owner is never told to wait on themselves.
function guideFor(
  status: string,
  task: { canWork: boolean },
): string | undefined {
  switch (status) {
    case "pending":
      return task.canWork
        ? "A new commission for your agent. Accept it to get started."
        : "Waiting for the agent to accept. You can cancel while it's still pending.";
    case "accepted":
      return task.canWork
        ? "The agent accepted. Start the task to kick off execution."
        : "The agent accepted and is about to start.";
    case "running":
      return task.canWork
        ? "The agent is working. Submit the artifact when the deliverable is ready."
        : "The agent is working. You'll be notified when a deliverable arrives.";
    case "submitted":
      return task.canWork
        ? "This submission didn't pass the contract's output schema — see the errors below, then submit a corrected artifact."
        : "The latest submission didn't pass the contract's output schema. The agent has been asked for a corrected artifact.";
    case "completed":
      return "All done. Leave a review to update this agent's reputation.";
    default:
      return undefined;
  }
}

// While an action runs, the floating status island narrates it — one quiet
// channel instead of stacked toasts. Success settles for a beat, then clears.
const BUSY_LABELS: Record<string, string> = {
  accept: "Accepting task…",
  start: "Starting task…",
  approve: "Releasing payment…",
  cancel: "Cancelling task…",
  demo: "Running demo — accept, deliver, approve…",
};

export function TaskActions({ task }: TaskActionsProps) {
  const [pending, startTransition] = React.useTransition();
  const [busyKey, setBusyKey] = React.useState<string | null>(null);
  const [actionError, setActionError] = React.useState<string | null>(null);
  const [island, setIsland] = React.useState<IslandState | null>(null);
  const [optimisticStatus, setOptimisticStatus] = useOptimistic(task.status);
  const islandTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const id = task.id;

  // Show an outcome on the island briefly, then dismiss it.
  function settleIsland(state: IslandState, holdMs = 2000) {
    if (islandTimer.current) clearTimeout(islandTimer.current);
    setIsland(state);
    islandTimer.current = setTimeout(() => setIsland(null), holdMs);
  }

  React.useEffect(() => {
    return () => {
      if (islandTimer.current) clearTimeout(islandTimer.current);
    };
  }, []);

  function run(
    key: string,
    action: () => Promise<ActionResult<unknown>>,
    successMessage: string,
    nextStatus?: string,
  ) {
    setBusyKey(key);
    setActionError(null);
    setIsland({ label: BUSY_LABELS[key] ?? "Working…", tone: "busy" });
    startTransition(async () => {
      if (nextStatus) setOptimisticStatus(nextStatus);
      const res = await action();
      if (res.ok) {
        settleIsland({ label: successMessage, tone: "success" });
        // Funnel: a buyer approval is the genuine "first task completed" moment
        // (the demo runner simulates a completion, so it deliberately doesn't count).
        if (key === "approve") trackFirstTaskCompleted({ taskId: id });
      } else {
        setActionError(res.error ?? "Action failed. Please try again.");
        settleIsland({ label: res.error ?? "Action failed", tone: "error" }, 2600);
      }
      setBusyKey(null);
    });
  }

  const isBusy = (key: string) => pending && busyKey === key;

  // Every button mirrors its server action's authorization — a viewer only
  // sees the moves that are actually theirs to make.
  const showAccept = optimisticStatus === "pending" && task.canWork;
  const showStart = optimisticStatus === "accepted" && task.canWork;
  const showSubmit =
    ["accepted", "running", "submitted"].includes(optimisticStatus) && task.canWork;
  // "validating" now means "awaiting buyer approval" — a real pass already
  // happened automatically on submission, so only the buyer (or an admin)
  // gets the button that actually releases payment.
  const showApprove = optimisticStatus === "validating" && task.canApprove;
  const showReview = optimisticStatus === "completed";
  const showDispute = ACTIVE_STATUSES.has(optimisticStatus);
  const showCancel =
    ["draft", "pending", "accepted", "running"].includes(optimisticStatus) &&
    task.canCancel;
  // The demo walks the whole lifecycle — accept and deliver as the seller,
  // approve as the buyer — so it needs a viewer holding both sides.
  const showDemo = ACTIVE_STATUSES.has(optimisticStatus) && task.canSimulate;

  const isTerminal = optimisticStatus === "completed" || optimisticStatus === "cancelled";

  // Primary actions advance the lifecycle; secondary actions are escapes.
  const hasPrimary = showAccept || showStart || showSubmit || showApprove;

  const guideText =
    optimisticStatus === "validating"
      ? task.canApprove
        ? "This artifact passed validation. Approve to release payment, or open a dispute if something's wrong."
        : "Submitted and validated — waiting on the buyer to approve and release payment."
      : guideFor(optimisticStatus, task);

  return (
    <div className="space-y-4">
      <TaskStatusIsland state={island} />
      {actionError && (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-xs text-destructive">
          <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-destructive" />
          <span className="flex-1">{actionError}</span>
          <button
            onClick={() => setActionError(null)}
            className="text-muted-foreground hover:text-foreground"
            aria-label="Dismiss error"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}
      {guideText && (
        <p className="flex items-start gap-2 rounded-lg border border-border/60 bg-muted/30 px-3 py-2.5 text-xs leading-relaxed text-muted-foreground">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
          <span>{guideText}</span>
        </p>
      )}
      <div className="space-y-2.5">
        {showAccept && (
          <Button
            className="w-full justify-start"
            disabled={pending}
            onClick={() => run("accept", () => acceptTask(id), "Task accepted", "accepted")}
          >
            {isBusy("accept") ? <Loader2 className="animate-spin" /> : <CheckCircle2 />}
            {isBusy("accept") ? "Accepting…" : "Accept task"}
          </Button>
        )}

        {showStart && (
          <Button
            className="w-full justify-start"
            disabled={pending}
            onClick={() => run("start", () => startTask(id), "Task started", "running")}
          >
            {isBusy("start") ? <Loader2 className="animate-spin" /> : <PlayCircle />}
            {isBusy("start") ? "Starting…" : "Start task"}
          </Button>
        )}

        {showSubmit && (
          <SubmitArtifactDialog taskId={id} disabled={pending}>
            <Button
              variant={optimisticStatus === "submitted" ? "outline" : "default"}
              className="w-full justify-start"
              disabled={pending}
            >
              <Upload />
              {optimisticStatus === "submitted"
                ? "Submit another artifact"
                : "Submit artifact"}
            </Button>
          </SubmitArtifactDialog>
        )}

        {showApprove && (
          <div className="space-y-1.5">
            <Button
              className="w-full justify-start"
              disabled={pending}
              onClick={() =>
                run(
                  "approve",
                  () => approveTask(id),
                  "Task approved · payment released",
                  "completed",
                )
              }
            >
              {isBusy("approve") ? <Loader2 className="animate-spin" /> : <Lock />}
              {isBusy("approve")
                ? "Releasing payment…"
                : "Approve & release payment"}
            </Button>
            <p className="px-1 text-xs text-muted-foreground">
              Releases the escrowed budget to the agent — this can&apos;t be undone.
            </p>
          </div>
        )}

        {showReview && (
          <ReviewForm taskId={id} alreadyReviewed={task.hasReviewed}>
            <Button className="w-full justify-start" disabled={task.hasReviewed}>
              {task.hasReviewed ? <ThumbsUp /> : <Star />}
              {task.hasReviewed ? "Review submitted" : "Leave a review"}
            </Button>
          </ReviewForm>
        )}

        {showDemo && (
          <div className="space-y-1.5">
            <Button
              variant="outline"
              className="w-full justify-start border-dashed text-muted-foreground hover:text-foreground"
              disabled={pending}
              onClick={() =>
                run(
                  "demo",
                  () => simulateTask(id),
                  "Demo complete · payment released",
                  "completed",
                )
              }
            >
              {isBusy("demo") && <Loader2 className="animate-spin" />}
              {isBusy("demo") ? "Running demo…" : "Run demo — auto-complete"}
            </Button>
            <p className="px-1 text-xs text-muted-foreground">
              Simulates the agent: accepts, submits an artifact, then approves
              and releases payment once it passes validation.
            </p>
          </div>
        )}
      </div>

      {(showDispute || showCancel) && (
        <>
          {hasPrimary && <Separator className="bg-border/60" />}
          {showDispute && (
            <DisputeDialog taskId={id} disabled={pending}>
              <Button
                variant="ghost"
                className="w-full justify-start text-muted-foreground hover:text-destructive"
                disabled={pending}
              >
                <ShieldAlert />
                Open dispute
              </Button>
            </DisputeDialog>
          )}
          {showCancel && (
            <Button
              variant="ghost"
              className="w-full justify-start text-muted-foreground hover:text-destructive"
              disabled={pending}
              onClick={() =>
                run("cancel", () => cancelTask(id), "Task cancelled · payment refunded", "cancelled")
              }
            >
              {isBusy("cancel") ? <Loader2 className="animate-spin" /> : <Ban />}
              {isBusy("cancel") ? "Cancelling…" : "Cancel task"}
            </Button>
          )}
        </>
      )}

      {isTerminal && !showReview && (
        <p className="flex items-center gap-2 rounded-lg border border-border/60 bg-muted/20 px-3 py-2.5 text-xs text-muted-foreground">
          <Ban className="h-3.5 w-3.5 shrink-0" />
          This task is {optimisticStatus}. No further actions are available.
        </p>
      )}

      {optimisticStatus === "disputed" && (
        <p className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-xs text-destructive">
          <ShieldAlert className="h-3.5 w-3.5 shrink-0" />
          A dispute is open. Resolution is handled from the admin console.
        </p>
      )}
    </div>
  );
}
