import { describe, it, expect } from "vitest";
import { validateArtifactAgainstSchema } from "@/lib/validation";

const OBJECT_SCHEMA = {
  type: "object",
  required: ["summary", "confidence"],
  properties: {
    summary: { type: "string" },
    confidence: { type: "number" },
  },
} as const;

describe("validateArtifactAgainstSchema", () => {
  it("passes a valid object against its schema", () => {
    const r = validateArtifactAgainstSchema(OBJECT_SCHEMA, {
      summary: "done",
      confidence: 0.9,
    });
    expect(r.valid).toBe(true);
    expect(r.skipped).toBe(false);
    expect(r.errors).toEqual([]);
  });

  it("fails a wrong-type field with a readable error containing the path", () => {
    const r = validateArtifactAgainstSchema(OBJECT_SCHEMA, {
      summary: 123,
      confidence: 0.9,
    });
    expect(r.valid).toBe(false);
    expect(r.skipped).toBe(false);
    expect(r.errors.length).toBeGreaterThan(0);
    expect(r.errors.some((e) => e.includes("/summary") && e.includes("string"))).toBe(true);
  });

  it("fails a missing required field", () => {
    const r = validateArtifactAgainstSchema(OBJECT_SCHEMA, { summary: "done" });
    expect(r.valid).toBe(false);
    expect(r.skipped).toBe(false);
    expect(r.errors.length).toBeGreaterThan(0);
    expect(r.errors.some((e) => e.toLowerCase().includes("confidence"))).toBe(true);
  });

  it("reports every violation when multiple fields are wrong (allErrors)", () => {
    const r = validateArtifactAgainstSchema(OBJECT_SCHEMA, {
      summary: 1,
      confidence: "not a number",
    });
    expect(r.valid).toBe(false);
    expect(r.errors.length).toBeGreaterThanOrEqual(2);
  });

  it("skips validation when no output schema is declared (null)", () => {
    const r = validateArtifactAgainstSchema(null, { anything: "goes" });
    expect(r.skipped).toBe(true);
    expect(r.valid).toBe(true);
    expect(r.errors).toEqual([]);
  });

  it("skips validation when no output schema is declared (undefined)", () => {
    const r = validateArtifactAgainstSchema(undefined, { anything: "goes" });
    expect(r.skipped).toBe(true);
    expect(r.valid).toBe(true);
  });

  it("skips validation when the output schema is an empty object", () => {
    const r = validateArtifactAgainstSchema({}, { anything: "goes" });
    expect(r.skipped).toBe(true);
    expect(r.valid).toBe(true);
  });

  it("handles a malformed schema gracefully — invalid, with a message, never throws", () => {
    expect(() =>
      validateArtifactAgainstSchema({ type: "string", pattern: "[" }, "hello"),
    ).not.toThrow();
    const r = validateArtifactAgainstSchema({ type: "string", pattern: "[" }, "hello");
    expect(r.valid).toBe(false);
    expect(r.skipped).toBe(false);
    expect(r.errors.length).toBe(1);
    expect(r.errors[0]).toMatch(/invalid output schema/i);
  });

  it("does not throw and reports invalid for an unresolvable $ref", () => {
    const badRef = { $ref: "#/definitions/doesNotExist" };
    expect(() => validateArtifactAgainstSchema(badRef, {})).not.toThrow();
    const r = validateArtifactAgainstSchema(badRef, {});
    expect(r.valid).toBe(false);
    expect(r.errors.length).toBe(1);
  });

  it("is lenient with this app's non-standard 'shape hint' schemas (seed data style)", () => {
    // e.g. prisma/seed.ts / lib/mockContract.ts's OUTPUT_SCHEMAS_BY_CATEGORY —
    // none of these keys are real JSON Schema keywords, so under strict:false
    // they compile to an always-matching validator instead of throwing.
    const shapeHint = { result: "object", summary: "string", confidence: "number" };
    const r = validateArtifactAgainstSchema(shapeHint, { whatever: 1 });
    expect(r.valid).toBe(true);
    expect(r.skipped).toBe(false);
  });

  it("accepts a schema that declares an older draft-07 $schema", () => {
    const draft07 = {
      $schema: "http://json-schema.org/draft-07/schema#",
      type: "object",
      required: ["summary"],
      properties: { summary: { type: "string" } },
    };
    const passing = validateArtifactAgainstSchema(draft07, { summary: "ok" });
    expect(passing.valid).toBe(true);

    const failing = validateArtifactAgainstSchema(draft07, { summary: 5 });
    expect(failing.valid).toBe(false);
    expect(failing.errors.some((e) => e.includes("/summary"))).toBe(true);
  });

  it("fails cleanly when required content is entirely missing (e.g. a URL-only submission)", () => {
    const r = validateArtifactAgainstSchema(OBJECT_SCHEMA, null);
    expect(r.valid).toBe(false);
    expect(r.errors.length).toBeGreaterThan(0);
  });
});
