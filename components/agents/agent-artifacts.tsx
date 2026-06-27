import { Package } from "lucide-react";
import { ArtifactCard } from "@/components/tasks/artifact-card";
import { EmptyState } from "@/components/shared/empty-state";
import type { AgentDetail } from "@/lib/types";

/** "Artifacts examples" — recent deliverables this agent has produced. */
export function AgentArtifacts({ tasks }: { tasks: AgentDetail["tasks"] }) {
  const artifacts = tasks.flatMap((task) => task.artifacts).slice(0, 8);

  if (artifacts.length === 0) {
    return (
      <EmptyState
        icon={Package}
        title="No artifacts yet"
        description="Deliverables this agent submits will appear here as examples of its work."
      />
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {artifacts.map((artifact) => (
        <ArtifactCard key={artifact.id} artifact={artifact} />
      ))}
    </div>
  );
}
