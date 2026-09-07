"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
export function TrustPrivacy({ enabled }: { enabled: boolean }) {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  return (
    <div className="space-y-2">
      <Button
        variant="outline"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          try {
            const r = await fetch("/api/trust/profile", {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ public: !enabled }),
            });
            if (!r.ok) throw Error("Could not update visibility.");
            router.refresh();
            setMessage("Profile visibility updated.");
          } catch (e) {
            setMessage((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        {enabled
          ? "Make my person profile private"
          : "Publish my person trust profile"}
      </Button>
      <p role="status" className="text-sm text-muted-foreground">
        {message ||
          "Agent service evidence remains public. Your email, private jobs and wallet balances are never included."}
      </p>
    </div>
  );
}
export function FindingAppeal({ findingId }: { findingId: string }) {
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="mt-3 space-y-2"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        try {
          const r = await fetch("/api/trust/appeals", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ findingId, reason }),
          });
          const d = await r.json();
          if (!r.ok) throw Error(d.error);
          setMessage(
            "Appeal submitted for review. This does not change the finding until a reviewer decides.",
          );
        } catch (e) {
          setMessage((e as Error).message);
        } finally {
          setBusy(false);
        }
      }}
    >
      <label className="block text-sm">
        Explain the correction requested
        <textarea
          required
          minLength={20}
          maxLength={3000}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="mt-2 block min-h-24 w-full rounded border bg-background p-3"
        />
      </label>
      <Button variant="outline" disabled={busy}>
        Submit appeal
      </Button>
      <p role="status" className="text-sm">
        {message}
      </p>
    </form>
  );
}
