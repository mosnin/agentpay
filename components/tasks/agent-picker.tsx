"use client";
import { useEffect, useRef, useState } from "react";
import type { AgentSelectOption } from "@/app/tasks/new/create-task-form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";

/** An input and ordinary result buttons: works with keyboard, touch and speech. */
export function AgentPicker({
  initial,
  value,
  onSelect,
  invalid,
}: {
  initial: AgentSelectOption[];
  value: string;
  onSelect: (agent: AgentSelectOption) => void;
  invalid: boolean;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState(initial);
  const [selected, setSelected] = useState(initial.find((a) => a.id === value));
  const [editing, setEditing] = useState(!value);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!editing) return;
    const controller = new AbortController();
    setLoading(true);
    setError("");
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(
          `/api/agents/options?q=${encodeURIComponent(query)}`,
          { signal: controller.signal },
        );
        if (!response.ok)
          throw new Error(
            "Search is unavailable. Your selection is saved; try again.",
          );
        const data = await response.json();
        if (!controller.signal.aborted) setResults(data.agents);
      } catch (e) {
        if (!controller.signal.aborted)
          setError(e instanceof Error ? e.message : "Search failed.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, retry, editing]);
  return (
    <div className="space-y-3">
      {selected && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3">
          <div className="min-w-0">
            <p className="break-words text-sm font-medium">{selected.name}</p>
            <p className="text-xs text-muted-foreground">
              {selected.category} · from{" "}
              {formatCurrency(selected.startingPrice, selected.currency)}
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              setEditing(!editing);
              if (!editing) requestAnimationFrame(() => input.current?.focus());
            }}
          >
            {editing ? "Keep selection" : "Change agent"}
          </Button>
        </div>
      )}
      {editing && (
        <>
          <Input
            id="sellerAgentId"
            ref={input}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or capability"
            maxLength={200}
            aria-invalid={invalid}
            aria-describedby="agent-search-status"
          />
          <p
            id="agent-search-status"
            role="status"
            className="text-xs text-muted-foreground"
          >
            {loading
              ? "Searching agents…"
              : error ||
                (results.length
                  ? `Showing ${results.length} matches. Search to narrow the results.`
                  : "No agents match. Try a different capability or name.")}
          </p>
          {error ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => setRetry((n) => n + 1)}
            >
              Retry search
            </Button>
          ) : (
            !loading && (
              <ul className="divide-y rounded-lg border">
                {results.map((agent) => (
                  <li key={agent.id}>
                    <button
                      type="button"
                      className="w-full p-3 text-left hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      onClick={() => {
                        setSelected(agent);
                        onSelect(agent);
                        setEditing(false);
                      }}
                    >
                      <span className="block break-words text-sm font-medium">
                        {agent.name}
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        {agent.category} · from{" "}
                        {formatCurrency(agent.startingPrice, agent.currency)}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )
          )}
        </>
      )}
    </div>
  );
}
