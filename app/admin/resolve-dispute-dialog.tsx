"use client";

import { useState, useTransition } from "react";
import { Gavel, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { resolveDispute } from "@/lib/actions/tasks";

export function ResolveDisputeDialog({
  disputeId,
  taskTitle,
}: {
  disputeId: string;
  taskTitle: string;
}) {
  const [open, setOpen] = useState(false);
  const [resolution, setResolution] = useState("");
  const [outcome, setOutcome] = useState<"resolved" | "rejected">("resolved");
  const [pending, start] = useTransition();

  function onSubmit() {
    if (!resolution.trim()) {
      toast.error("Add a short resolution note.");
      return;
    }
    start(async () => {
      const res = await resolveDispute(disputeId, resolution.trim(), outcome);
      if (res.ok) {
        toast.success(outcome === "resolved" ? "Dispute resolved" : "Dispute rejected");
        setOpen(false);
        setResolution("");
      } else {
        toast.error(res.error);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Gavel className="h-3.5 w-3.5" />
          Resolve
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Resolve dispute</DialogTitle>
          <DialogDescription className="line-clamp-2">
            {taskTitle}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="dispute-outcome">Outcome</Label>
            <Select
              value={outcome}
              onValueChange={(v) => setOutcome(v as "resolved" | "rejected")}
            >
              <SelectTrigger id="dispute-outcome">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="resolved">Resolve in buyer&apos;s favor</SelectItem>
                <SelectItem value="rejected">Reject — no action</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="dispute-resolution">Resolution note</Label>
            <Textarea
              id="dispute-resolution"
              value={resolution}
              onChange={(e) => setResolution(e.target.value)}
              placeholder="Summarize the decision and any remediation taken…"
              rows={4}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
            Cancel
          </Button>
          <Button onClick={onSubmit} disabled={pending}>
            {pending && <Loader2 className="h-4 w-4 animate-spin" />}
            Submit decision
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
