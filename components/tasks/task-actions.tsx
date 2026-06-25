"use client";

import * as React from "react";
import {
  Ban,
  CheckCircle2,
  Lock,
  PlayCircle,
  ScanSearch,
  ShieldAlert,
  Star,
  ThumbsUp,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  acceptTask,
  startTask,
  runValidation,
  completeTask,
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

export function TaskActions({ task }: TaskActionsProps) {
  const [pending, startTransition] = React.useTransition();
  const [busyKey, setBusyKey] = React.useState<string | null>(null);

  const { id, status } = task;

  function run(
    key: string,
    action: () => Promise<ActionResult<unknown>>,
    successMessage: string,
  ) {
    setBusyKey(key);
    startTransition(async () => {
      const res = await action();
      if (res.ok) {
        toast.success(successMessage);
      } else {
        toast.error(res.error);
      }
      setBusyKey(null);
    });
  }

  function onRunValidation() {
    setBusyKey("validate");
    startTransition(async () => {
      const res = await runValidation(id);
      if (res.ok) {
        const score = res.data?.score ?? 0;
        const passed = res.data?.status === "passed";
        toast[passed ? "success" : "error"](
          `Validation ${passed ? "passed" : "failed"} · score ${score}/100`,
        );
      } else {
        toast.error(res.error);
      }
      setBusyKey(null);
    });
  }

  const isBusy = (key: string) => pending && busyKey === key;

  const showAccept = status === "pending";
  const showStart = status === "accepted";
  const showSubmit = ["accepted", "running", "submitted"].includes(status);
  const showValidate = status === "submitted";
  const showComplete = ["submitted", "validating"].includes(status);
  const showReview = status === "completed";
  const showDispute = ACTIVE_STATUSES.has(status);

  const isTerminal = status === "completed" || status === "cancelled";

  // Primary actions advance the lifecycle; secondary actions are escapes.
  const hasPrimary =
    showAccept || showStart || showSubmit || showValidate || showComplete;

  return (
    <div className="space-y-4">
      <div className="space-y-2.5">
        {showAccept && (
          <Button
            className="w-full justify-start"
            disabled={pending}
            onClick={() => run("accept", () => acceptTask(id), "Task accepted")}
          >
            <CheckCircle2 />
            {isBusy("accept") ? "Accepting…" : "Accept task"}
          </Button>
        )}

        {showStart && (
          <Button
            className="w-full justify-start"
            disabled={pending}
            onClick={() => run("start", () => startTask(id), "Task started")}
          >
            <PlayCircle />
            {isBusy("start") ? "Starting…" : "Start task"}
          </Button>
        )}

        {showSubmit && (
          <SubmitArtifactDialog taskId={id} disabled={pending}>
            <Button
              variant={status === "submitted" ? "outline" : "default"}
              className="w-full justify-start"
              disabled={pending}
            >
              <Upload />
              {status === "submitted" ? "Submit another artifact" : "Submit artifact"}
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
            <ScanSearch />
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
              )
            }
          >
            <Lock />
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
      </div>

      {showDispute && (
        <>
          {hasPrimary && <Separator className="bg-border/60" />}
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
        </>
      )}

      {isTerminal && !showReview && (
        <p className="flex items-center gap-2 rounded-lg border border-border/60 bg-muted/20 px-3 py-2.5 text-xs text-muted-foreground">
          <Ban className="h-3.5 w-3.5 shrink-0" />
          This task is {status}. No further actions are available.
        </p>
      )}

      {status === "disputed" && (
        <p className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2.5 text-xs text-red-300">
          <ShieldAlert className="h-3.5 w-3.5 shrink-0" />
          A dispute is open. Resolution is handled from the admin console.
        </p>
      )}
    </div>
  );
}
