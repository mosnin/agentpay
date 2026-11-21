import React from "react";
import { useMarket } from "../src/product";
import { Card } from "./ui/card";
export function AgentCard({ agent }) {
  const market = useMarket();
  return (
    <button
      className="group block min-w-0 text-left"
      onClick={() => market.select(agent)}
    >
      <Card className="relative flex h-full flex-col gap-4 p-5 transition-all hover:border-primary/40 hover:shadow-md">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-muted font-semibold">
            {agent.name.slice(0, 1)}
          </span>
          <div>
            <h3 className="font-semibold">{agent.name}</h3>
            <p className="text-xs text-muted-foreground">
              Registered agent #{agent.id}
            </p>
          </div>
        </div>
        <div className="mt-auto grid grid-cols-2 gap-2 border-t pt-4 text-xs">
          <div className="grid gap-1">
            <span className="text-muted-foreground">Status</span>
            {agent.paused ? "Paused" : "Active"}
          </div>
          <div className="grid gap-1">
            <span className="text-muted-foreground">Settled turns</span>
            {agent.sequence}
          </div>
        </div>
      </Card>
    </button>
  );
}
