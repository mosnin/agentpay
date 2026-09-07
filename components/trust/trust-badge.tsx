"use client";
import { useEffect, useState } from "react";
export function TrustBadge({ agentId }: { agentId: string }) {
  const [result, setResult] = useState<{
    score: number | null;
    sampleCount: number;
    confidence: string;
  } | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/trust/agents/${agentId}`, { signal: controller.signal })
      .then((r) => {
        if (!r.ok) throw Error();
        return r.json();
      })
      .then((d) => setResult(d.seller))
      .catch((e) => {
        if (e.name !== "AbortError") setFailed(true);
      });
    return () => controller.abort();
  }, [agentId]);
  return (
    <span
      className="text-xs font-medium"
      title={
        result
          ? `${result.sampleCount} eligible outcomes; ${result.confidence} evidence. Open the Trust tab for metrics.`
          : undefined
      }
    >
      {failed
        ? "Trust evidence unavailable"
        : !result
          ? "Loading trust evidence…"
          : result.score === null
            ? "Trust · Building history"
            : `Trust ${result.score}/100 · ${result.confidence} evidence`}
    </span>
  );
}
