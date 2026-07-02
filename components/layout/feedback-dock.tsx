"use client";

import { toast } from "sonner";
import { MorphSurface } from "@/components/ui/morph-surface";

/**
 * Floating feedback dock (MorphSurface): a quiet pill in the corner that
 * morphs into a composer. Desktop-only — on mobile it would fight the
 * sticky primary actions. Submissions land in the server log for the MVP
 * (swap the handler for a real channel when one exists).
 */
export function FeedbackDock() {
  return (
    <div className="pointer-events-none fixed bottom-5 right-5 z-40 hidden md:block">
      <div className="pointer-events-auto">
        <MorphSurface
          reserveSpace={false}
          dockLabel="Agent Market"
          triggerLabel="Share feedback"
          placeholder="What's working? What's missing?"
          collapsedWidth={288}
          expandedWidth={340}
          expandedHeight={190}
          onSubmit={async (data) => {
            // Mock channel — mirror the x402 pattern: log now, wire later.
            console.info("[feedback]", data.get("message"));
          }}
          onSuccess={() => toast.success("Thanks — feedback noted.")}
        />
      </div>
    </div>
  );
}
