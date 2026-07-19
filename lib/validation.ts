import "server-only";
import Ajv2020, { type Schema as AjvSchema } from "ajv/dist/2020";
import addFormats from "ajv-formats";

/**
 * Real artifact validation.
 *
 * Validates a submitted artifact against the task's declared output JSON
 * Schema with ajv (2020-12 dialect, formats enabled). Replaces the mock
 * threshold validator for tasks that declare a schema; tasks without one
 * skip straight to buyer review.
 *
 * Two lenience decisions, made after inspecting the schemas this app
 * actually produces (prisma/seed.ts, lib/mockContract.ts's
 * OUTPUT_SCHEMAS_BY_CATEGORY, and lib/actions/tasks.ts's parseOutputSchema
 * fallback for free-text input):
 *
 * 1. `strict: false` — most `outputSchema` values in this app are a
 *    lightweight "shape hint" (e.g. `{ summary: "string", confidence:
 *    "number" }`), not real JSON Schema. None of those keys are recognized
 *    JSON Schema keywords, so under strict:false ajv just ignores them and
 *    compiles an always-matching validator — i.e. these tasks behave like
 *    "no schema" in practice, same as before. A hand-authored *real* schema
 *    (a buyer pasting `{"type":"object","required":[...],"properties":{...}}`
 *    into "Expected output format") is enforced for real.
 * 2. Strip `$schema` before compiling — Ajv2020 only ships the 2020-12
 *    meta-schema. A buyer-authored schema declaring
 *    `"$schema": "http://json-schema.org/draft-07/schema#"` (still the most
 *    common draft in the wild) would otherwise fail to *compile* with "no
 *    schema with key or ref", hard-failing every submission for an
 *    otherwise-valid schema. We only check structural keywords (type,
 *    properties, required, format, ...) that read the same across drafts, so
 *    dropping the dialect pin is safe and keeps real-world schemas working
 *    regardless of which draft they declare.
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

/** null/undefined, or an object with no keys — i.e. nothing to check. */
function isEmptySchema(schema: unknown): boolean {
  if (schema === null || schema === undefined) return true;
  if (typeof schema === "object" && !Array.isArray(schema)) {
    return Object.keys(schema as Record<string, unknown>).length === 0;
  }
  return false;
}

/** Drop `$schema` so an unrecognized/unregistered meta-schema ref can't fail
 * compilation of an otherwise-fine schema (see file header). */
function stripSchemaKeyword(schema: object): object {
  if ("$schema" in schema) {
    const { $schema: _drop, ...rest } = schema as Record<string, unknown>;
    return rest;
  }
  return schema;
}

export function validateArtifactAgainstSchema(
  outputSchema: unknown,
  artifactContent: unknown,
): ArtifactValidationResult {
  if (isEmptySchema(outputSchema)) {
    return { valid: true, errors: [], skipped: true };
  }

  const schemaToCompile =
    typeof outputSchema === "object" && outputSchema !== null && !Array.isArray(outputSchema)
      ? stripSchemaKeyword(outputSchema)
      : outputSchema;

  let validate;
  try {
    const ajv = new Ajv2020({ strict: false, allErrors: true, logger: false });
    addFormats(ajv);
    validate = ajv.compile(schemaToCompile as AjvSchema);
  } catch (err) {
    // A genuinely malformed schema (bad regex pattern, unresolvable $ref,
    // wrong schema type, ...) — report it, never throw out of this function.
    return {
      valid: false,
      errors: [
        `Invalid output schema: ${err instanceof Error ? err.message : String(err)}`,
      ],
      skipped: false,
    };
  }

  if (validate(artifactContent)) {
    return { valid: true, errors: [], skipped: false };
  }

  const errors = (validate.errors ?? []).map((e) => {
    const path = e.instancePath && e.instancePath.length > 0 ? e.instancePath : "/";
    return `${path}: ${e.message ?? "is invalid"}`;
  });
  return { valid: false, errors, skipped: false };
}
