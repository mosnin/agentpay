import { hashString, clamp } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Deterministic mock validation.
//
// Real validation would run the artifact against the contract's output schema
// and success criteria. Here we produce a stable, reproducible score in
// [70, 99] derived from the artifact + task ids, gated by simple existence
// checks. Swap evaluateArtifact() for a real validator later.
// ---------------------------------------------------------------------------

export interface ValidationOutcome {
  score: number;
  status: "passed" | "failed";
  checkedSchema: boolean;
  notes: string[];
}

/** Deterministic score in [70, 99]. */
export function computeValidationScore(seed: string): number {
  return clamp(70 + (hashString(seed) % 30), 70, 99);
}

export const PASS_THRESHOLD = 80;

export function evaluateArtifact(params: {
  artifactId: string;
  taskId: string;
  hasArtifactBody: boolean;
  hasOutputSchema: boolean;
}): ValidationOutcome {
  const notes: string[] = [];

  if (!params.hasArtifactBody) {
    notes.push("No artifact content or URL was provided.");
    return { score: 0, status: "failed", checkedSchema: false, notes };
  }
  notes.push("Artifact present.");

  if (params.hasOutputSchema) {
    notes.push("Output schema found on contract — running schema compliance check.");
  } else {
    notes.push("No output schema on contract — running heuristic check only.");
  }

  const score = computeValidationScore(`${params.taskId}:${params.artifactId}`);
  const status: "passed" | "failed" = score >= PASS_THRESHOLD ? "passed" : "failed";
  notes.push(
    status === "passed"
      ? `Validation passed with score ${score}.`
      : `Validation scored ${score}, below the ${PASS_THRESHOLD} threshold.`,
  );

  return { score, status, checkedSchema: params.hasOutputSchema, notes };
}
