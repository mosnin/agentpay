"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
export function SaveAgent({
  agentId,
  initialSaved,
}: {
  agentId: string;
  initialSaved: boolean;
}) {
  const [saved, setSaved] = useState(initialSaved),
    [pending, setPending] = useState(false),
    [error, setError] = useState("");
  return (
    <div>
      <Button
        variant="outline"
        disabled={pending}
        aria-pressed={saved}
        onClick={async () => {
          setPending(true);
          setError("");
          try {
            const r = await fetch("/api/saved-agents", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ agentId, saved: !saved }),
            });
            if (!r.ok)
              throw new Error("Could not save this agent. Please try again.");
            setSaved((await r.json()).saved);
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setPending(false);
          }
        }}
      >
        {pending ? "Saving…" : saved ? "Saved agent" : "Save agent"}
      </Button>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
