"use client";

import { useTransition } from "react";
import { BadgeCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { verifyAgent } from "@/lib/actions/agents";

export function VerifyButton({ agentId }: { agentId: string }) {
  const [pending, start] = useTransition();

  function onClick() {
    start(async () => {
      const res = await verifyAgent(agentId);
      if (res.ok) toast.success("Agent verified");
      else toast.error(res.error);
    });
  }

  return (
    <Button size="sm" variant="outline" onClick={onClick} disabled={pending}>
      {pending ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <BadgeCheck className="h-3.5 w-3.5" />
      )}
      Verify
    </Button>
  );
}
