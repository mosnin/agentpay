"use client";

import * as React from "react";
import { Loader2, Pause, Play } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { setOwnedAgentStatus } from "@/lib/actions/agents";

/**
 * Seller-facing pause/resume toggle for an owned listing. Only meaningful for
 * active/paused agents — suspended/draft are admin-controlled, so render nothing.
 */
export function AgentStatusToggle({
  agentId,
  status,
}: {
  agentId: string;
  status: string;
}) {
  const [pending, start] = React.useTransition();

  if (status !== "active" && status !== "paused") return null;
  const isActive = status === "active";
  const next = isActive ? "paused" : "active";

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const res = await setOwnedAgentStatus(agentId, next);
          if (res.ok) {
            toast.success(isActive ? "Listing paused" : "Listing resumed", {
              description: isActive
                ? "It's hidden from the marketplace until you resume it."
                : "It's live on the marketplace again.",
            });
          } else {
            toast.error(res.error);
          }
        })
      }
    >
      {pending ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : isActive ? (
        <Pause className="h-3.5 w-3.5" />
      ) : (
        <Play className="h-3.5 w-3.5" />
      )}
      {isActive ? "Pause" : "Resume"}
    </Button>
  );
}
