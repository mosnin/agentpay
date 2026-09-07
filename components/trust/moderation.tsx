"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
type Case = {
  id: string;
  taskId: string;
  title: string;
  resolution: string | null;
  participants: { id: string; name: string }[];
};
type Appeal = {
  id: string;
  reason: string;
  finding: { publicReason: string; outcome: string };
};
export function TrustModeration({
  cases,
  appeals,
}: {
  cases: Case[];
  appeals: Appeal[];
}) {
  const [selected, setSelected] = useState(cases[0]?.id || "");
  const [subject, setSubject] = useState("");
  const [outcome, setOutcome] = useState("cleared");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const current = cases.find((c) => c.id === selected);
  async function write(body: unknown, method = "POST") {
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/admin/trust", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const d = await r.json();
      if (!r.ok) throw Error(d.error);
      setReason("");
      router.refresh();
      setError("Decision recorded.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Resolved agreement findings</h2>
        <p className="text-sm text-muted-foreground">
          A refund or split does not prove misconduct. Record a finding only
          when the agreement evidence supports it. You cannot decide a case in
          which you are a participant.
        </p>
        {current ? (
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              write({
                taskId: current.taskId,
                disputeId: current.id,
                subjectUserId: subject,
                outcome,
                publicReason: reason,
              });
            }}
          >
            <label className="block text-sm">
              Resolved dispute
              <select
                className="mt-2 min-h-11 w-full rounded border bg-background p-2"
                value={selected}
                onChange={(e) => {
                  setSelected(e.target.value);
                  setSubject("");
                }}
              >
                {cases.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>
            </label>
            <p className="break-words text-sm text-muted-foreground">
              {current.resolution}
            </p>
            <a
              className="inline-flex min-h-11 items-center text-sm underline"
              href={`/tasks/${current.taskId}`}
            >
              Inspect agreement evidence
            </a>
            <label className="block text-sm">
              Affected participant
              <select
                required
                className="mt-2 min-h-11 w-full rounded border bg-background p-2"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              >
                <option value="">Select participant</option>
                {current.participants.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              Finding
              <select
                className="mt-2 min-h-11 w-full rounded border bg-background p-2"
                value={outcome}
                onChange={(e) => setOutcome(e.target.value)}
              >
                <option value="cleared">
                  Cleared: no substantiated breach
                </option>
                <option value="breach">Substantiated agreement breach</option>
              </select>
            </label>
            <label className="block text-sm">
              Reason shown to the affected participant
              <textarea
                required
                minLength={20}
                maxLength={2000}
                className="mt-2 min-h-28 w-full rounded border bg-background p-3"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </label>
            <Button disabled={busy}>Record finding</Button>
          </form>
        ) : (
          <p className="text-sm text-muted-foreground">
            No resolved cases available for you to decide.
          </p>
        )}
      </section>
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">
          Appeals awaiting independent review
        </h2>
        {appeals.length ? (
          appeals.map((a) => (
            <AppealDecision
              key={a.id}
              appeal={a}
              busy={busy}
              save={(body) => write(body, "PATCH")}
            />
          ))
        ) : (
          <p className="text-sm text-muted-foreground">No open appeals.</p>
        )}
      </section>
      <p role="status" className="text-sm">
        {error}
      </p>
    </div>
  );
}
function AppealDecision({
  appeal,
  busy,
  save,
}: {
  appeal: Appeal;
  busy: boolean;
  save: (body: unknown) => void;
}) {
  const [response, setResponse] = useState("");
  const [decision, setDecision] = useState("upheld");
  return (
    <form
      className="space-y-3 rounded-xl border p-5"
      onSubmit={(e) => {
        e.preventDefault();
        save({ appealId: appeal.id, decision, response });
      }}
    >
      <p className="font-medium">Original finding: {appeal.finding.outcome}</p>
      <p className="text-sm">{appeal.finding.publicReason}</p>
      <p className="text-sm">Appeal: {appeal.reason}</p>
      <label className="block text-sm">
        Decision
        <select
          className="mt-2 min-h-11 w-full rounded border bg-background p-2"
          value={decision}
          onChange={(e) => setDecision(e.target.value)}
        >
          <option value="upheld">Uphold original finding</option>
          <option value="corrected">Remove incorrect finding</option>
        </select>
      </label>
      <label className="block text-sm">
        Reason for your decision
        <textarea
          required
          minLength={20}
          maxLength={2000}
          className="mt-2 min-h-24 w-full rounded border bg-background p-3"
          value={response}
          onChange={(e) => setResponse(e.target.value)}
        />
      </label>
      <Button variant="outline" disabled={busy}>
        Record appeal decision
      </Button>
    </form>
  );
}
