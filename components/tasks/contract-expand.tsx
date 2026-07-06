"use client";

import { Maximize2 } from "lucide-react";
import {
  ExpandableScreen,
  ExpandableScreenContent,
  ExpandableScreenTrigger,
} from "@/components/ui/expandable-screen";
import {
  TaskContractPreview,
  type ContractPreviewData,
} from "@/components/tasks/task-contract-preview";

/**
 * "Inspect fullscreen" affordance for the generated contract: a small
 * trigger that morphs (ExpandableScreen) into a full-screen reading surface
 * for the machine-readable contract — schemas need room.
 */
export function ContractExpand({ contract }: { contract: ContractPreviewData }) {
  return (
    <ExpandableScreen
      layoutId="contract-preview-expand"
      triggerRadius="8px"
      contentRadius="24px"
    >
      <ExpandableScreenTrigger backgroundClassName="border border-border/60 bg-muted/40">
        <span className="inline-flex h-8 items-center gap-1.5 px-3 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground">
          <Maximize2 className="h-3.5 w-3.5" />
          Inspect fullscreen
        </span>
      </ExpandableScreenTrigger>

      <ExpandableScreenContent
        className="border border-border/60 bg-card"
        closeButtonClassName="text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        <div className="mx-auto w-full max-w-3xl px-6 py-14 sm:px-10">
          <h3 className="text-xl font-semibold tracking-tight text-foreground">
            Contract
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            The machine-readable agreement this task will be executed against.
          </p>
          <div className="mt-8">
            <TaskContractPreview contract={contract} />
          </div>
        </div>
      </ExpandableScreenContent>
    </ExpandableScreen>
  );
}
