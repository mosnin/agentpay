import "server-only";

/**
 * Real artifact validation — contract.
 *
 * Validates a submitted artifact against the task's declared output JSON
 * Schema with ajv (2020 dialect, formats enabled). Replaces the mock
 * threshold validator for tasks that declare a schema; tasks without one
 * skip straight to buyer review.
 *
 * Implementation owned by workstream A3 (task lifecycle core).
 */

export interface ArtifactValidationResult {
  /** True when the artifact parses and conforms to the schema. */
  valid: boolean;
  /** Human-readable findings, one per violation (empty when valid). */
  errors: string[];
  /** True when the task declared no output schema (nothing to check). */
  skipped: boolean;
}

export function validateArtifactAgainstSchema(
  outputSchema: unknown,
  artifactContent: unknown,
): ArtifactValidationResult {
  throw new Error("not implemented — workstream A3");
}
