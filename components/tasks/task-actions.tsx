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
  ScanSearch,
  ShieldAlert,
  Star,
  ThumbsUp,
  Upload,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  acceptTask,
  startTask,
  runValidation,
  completeTask,
  cancelTask,
  simulateTask,
} from "@/lib/actions/tasks";
import { SubmitArtifactDialog } from "./submit-artifact-dialog";
import { ReviewForm } from "./review-form";
import { DisputeDialog } from "./dispute-dialog";
import type { ActionResult } from "@/lib/types";

interface TaskActionsProps {
  task: {
    id: string;
    status: string;
    hasReviewed: boolean;
  };
}

const ACTIVE_STATUSES = new Set([
  "pending",
  "accepted",
  "running",
  "submitted",
  "validating",
]);

// Plain-language "what happens next" for each actionable state, so the
// operator never has to guess the next move.
const STATUS_GUIDE: Record<string, string> = {
  pending: "Waiting for the agent to accept. You can cancel while it's still pending.",
  accepted: "The agent accepted. Start the task to kick off execution.",
  running: "The agent is working. Submit the artifact when the deliverable is ready.",
  submitted:
    "Artifact's in. Run validation to check it against the contract — then complete.",
  validating:
    "Validation is back. Complete the task to release payment, or submit a revision.",
  completed: "All done. Leave a review to update this agent's reputation.",
};

export function TaskActions({ task }: TaskActionsProps) {
  const [pending, startTransition] = React.useTransition();
  const [busyKey, setBusyKey] = React.useState<string | null>(null);
  const [actionError, setActionError] = React.useState<string | null>(null);
  const [optimisticStatus, setOptimisticStatus] = useOptimistic(task.status);

  const id = task.id;

  function run(
    key: string,
    action: () => Promise<ActionResult<unknown>>,
    successMessage: string,
    nextStatus?: string,
  ) {
    setBusyKey(key);
    setActionError(null);
    startTransition(async () => {
      if (nextStatus) setOptimisticStatus(nextStatus);
      const res = await action();
      if (res.ok) {
        toast.success(successMessage);
      } else {
        setActionError(res.error ?? "Action failed. Please try again.");
        toast.error(res.error);
      }
      setBusyKey(null);
    });
  }

  function onRunValidation() {
    setBusyKey("validate");
    setActionError(null);
    startTransition(async () => {
      setOptimisticStatus("validating");
      const res = await runValidation(id);
      if (res.ok) {
        const score = res.data?.score ?? 0;
        const passed = res.data?.status === "passed";
        const message = `Validation ${passed ? "passed" : "failed"} · score ${score}/100`;
        if (passed) toast.success(message);
        else toast.error(message);
      } else {
        setActionError(res.error ?? "Validation failed to run.");
        toast.error(res.error);
      }
      setBusyKey(null);
    });
  }

  const isBusy = (key: string) => pending && busyKey === key;

  const showAccept = optimisticStatus === "pending";
  const showStart = optimisticStatus === "accepted";
  const showSubmit = ["accepted", "running", "submitted"].includes(optimisticStatus);
  const showValidate = optimisticStatus === "submitted";
  const showComplete = ["submitted", "validating"].includes(optimisticStatus);
  const showReview = optimisticStatus === "completed";
  const showDispute = ACTIVE_STATUSES.has(optimisticStatus);
  const showCancel = ["draft", "pending", "accepted", "running"].includes(optimisticStatus);
  const showDemo = ACTIVE_STATUSES.has(optimisticStatus);

  const isTerminal = optimisticStatus === "completed" || optimisticStatus === "cancelled";

  // Primary actions advance the lifecycle; secondary actions are escapes.
  const hasPrimary =
    showAccept || showStart || showSubmit || showValidate || showComplete;

  return (
    <div className="space-y-4">
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
      {STATUS_GUIDE[optimisticStatus] && (
        <p className="flex items-start gap-2 rounded-lg border border-border/60 bg-muted/30 px-3 py-2.5 text-xs leading-relaxed text-muted-foreground">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
          <span>{STATUS_GUIDE[optimisticStatus]}</span>
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

        {showValidate && (
          <Button
            variant="secondary"
            className="w-full justify-start"
            disabled={pending}
            onClick={onRunValidation}
          >
            {isBusy("validate") ? <Loader2 className="animate-spin" /> : <ScanSearch />}
            {isBusy("validate") ? "Running validation…" : "Run validation"}
          </Button>
        )}

        {showComplete && (
          <Button
            className="w-full justify-start"
            disabled={pending}
            onClick={() =>
              run(
                "complete",
                () => completeTask(id),
                "Task completed · payment released",
                "completed",
              )
            }
          >
            {isBusy("complete") ? <Loader2 className="animate-spin" /> : <Lock />}
            {isBusy("complete")
              ? "Releasing payment…"
              : "Complete task & release payment"}
          </Button>
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
                  "Demo complete · task auto-advanced and payment released",
                  "completed",
                )
              }
            >
              {isBusy("demo") && <Loader2 className="animate-spin" />}
              {isBusy("demo") ? "Running demo…" : "Run demo — auto-complete"}
            </Button>
            <p className="px-1 text-xs text-muted-foreground">
              Simulates the agent: accepts, submits an artifact, validates,
              completes, and releases payment.
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
