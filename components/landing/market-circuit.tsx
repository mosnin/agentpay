"use client";

import * as React from "react";
import { useReducedMotion } from "motion/react";
import { Bot, Coins, FileCode2, Lock, ShieldCheck, User } from "lucide-react";
import { CircuitBoard } from "@/components/ui/circuit-board";
import { cn } from "@/lib/utils";

const CANVAS_W = 880;
const CANVAS_H = 330;

// The marketplace lifecycle as a live circuit: work flows along the top rail
// (contract → agent → validation), money along the bottom (escrow → payout).
// Pulses are the product's one ambient motion — they ARE the explanation.
const NODES = [
  { id: "you", x: 80, y: 165, label: "You", size: "lg" as const, status: "active" as const, icon: <User className="h-5 w-5" /> },
  { id: "contract", x: 300, y: 75, label: "Contract", icon: <FileCode2 className="h-4 w-4" /> },
  { id: "escrow", x: 300, y: 255, label: "Escrow", icon: <Lock className="h-4 w-4" /> },
  { id: "agent", x: 505, y: 165, label: "Agent", size: "lg" as const, status: "processing" as const, icon: <Bot className="h-5 w-5" /> },
  { id: "validation", x: 715, y: 75, label: "Validation", icon: <ShieldCheck className="h-4 w-4" /> },
  { id: "payout", x: 715, y: 255, label: "Payout", status: "active" as const, icon: <Coins className="h-4 w-4" /> },
];

const CONNECTIONS = [
  { from: "you", to: "contract" },
  { from: "contract", to: "agent" },
  { from: "agent", to: "validation" },
  { from: "validation", to: "payout" },
  { from: "you", to: "escrow" },
  { from: "escrow", to: "payout" },
];

/**
 * Responsive wrapper: the circuit renders on a fixed 880×330 canvas and
 * scales down with its container, so traces and labels keep their
 * composition at every width.
 */
export function MarketCircuit({ className }: { className?: string }) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [scale, setScale] = React.useState<number | null>(null);
  const reduceMotion = useReducedMotion() ?? false;

  React.useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => setScale(Math.min(1, el.clientWidth / CANVAS_W));
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const connections = React.useMemo(
    () => CONNECTIONS.map((c) => ({ ...c, animated: !reduceMotion })),
    [reduceMotion],
  );

  return (
    <div
      ref={containerRef}
      // aria-hidden + pointer-events-none: the scaled inner board's unscaled
      // layout box overflows this container's height and would otherwise float
      // an invisible hit-area over the content below (e.g. the footer links).
      className={cn("pointer-events-none relative w-full", className)}
      style={{ height: scale ? CANVAS_H * scale : CANVAS_H }}
      aria-hidden
    >
      {scale !== null && (
        <div
          className="origin-top-left"
          style={{ transform: `scale(${scale})`, width: CANVAS_W, height: CANVAS_H }}
        >
          <CircuitBoard
            nodes={NODES}
            connections={connections}
            width={CANVAS_W}
            height={CANVAS_H}
            gridSize={22}
            pulseSpeed={2.6}
            pulseColor="hsl(243 80% 70% / 0.85)"
          />
        </div>
      )}
    </div>
  );
}
