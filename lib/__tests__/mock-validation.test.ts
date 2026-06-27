import { describe, it, expect } from "vitest";
import {
  computeValidationScore,
  evaluateArtifact,
  PASS_THRESHOLD,
} from "@/lib/mockValidation";

describe("computeValidationScore", () => {
  it("is deterministic and within [70, 99]", () => {
    for (const seed of ["a", "task:artifact", "xyz", "123", "growth"]) {
      const s = computeValidationScore(seed);
      expect(s).toBe(computeValidationScore(seed));
      expect(s).toBeGreaterThanOrEqual(70);
      expect(s).toBeLessThanOrEqual(99);
    }
  });
});

describe("evaluateArtifact", () => {
  it("fails hard when no artifact body is present", () => {
    const r = evaluateArtifact({
      artifactId: "a1",
      taskId: "t1",
      hasArtifactBody: false,
      hasOutputSchema: true,
    });
    expect(r.status).toBe("failed");
    expect(r.score).toBe(0);
    expect(r.checkedSchema).toBe(false);
  });

  it("produces a deterministic verdict consistent with the threshold", () => {
    const args = {
      artifactId: "a1",
      taskId: "t1",
      hasArtifactBody: true,
      hasOutputSchema: true,
    } as const;
    const r = evaluateArtifact(args);
    const again = evaluateArtifact(args);
    expect(r.score).toBe(again.score);
    expect(r.score).toBeGreaterThanOrEqual(70);
    expect(r.status).toBe(r.score >= PASS_THRESHOLD ? "passed" : "failed");
    expect(r.checkedSchema).toBe(true);
  });

  it("records whether the output schema was checked", () => {
    const r = evaluateArtifact({
      artifactId: "a",
      taskId: "t",
      hasArtifactBody: true,
      hasOutputSchema: false,
    });
    expect(r.checkedSchema).toBe(false);
  });

  it("explains a hard failure in its notes when no body is present", () => {
    const r = evaluateArtifact({
      artifactId: "a1",
      taskId: "t1",
      hasArtifactBody: false,
      hasOutputSchema: true,
    });
    // The verdict notes carry the human-readable reason shown in the UI.
    expect(r.notes).toContain("No artifact content or URL was provided.");
  });

  it("still scores a present artifact heuristically when the contract has no output schema", () => {
    const r = evaluateArtifact({
      artifactId: "a2",
      taskId: "t2",
      hasArtifactBody: true,
      hasOutputSchema: false,
    });
    // A missing schema is NOT a hard failure — it downgrades to a heuristic
    // check and still produces a real score, never a short-circuit to 0.
    expect(r.score).toBeGreaterThanOrEqual(70);
    expect(r.checkedSchema).toBe(false);
    expect(r.notes).toContain(
      "No output schema on contract — running heuristic check only.",
    );
  });

  it("records human-readable notes for a schema-checked evaluation", () => {
    const args = {
      artifactId: "a3",
      taskId: "t3",
      hasArtifactBody: true,
      hasOutputSchema: true,
    } as const;
    const r = evaluateArtifact(args);
    expect(r.notes).toContain("Artifact present.");
    expect(r.notes).toContain(
      "Output schema found on contract — running schema compliance check.",
    );
    // The final note reports the actual score, whether it passed or failed.
    const expectedScore = computeValidationScore(`${args.taskId}:${args.artifactId}`);
    expect(r.notes.some((n) => n.includes(String(expectedScore)))).toBe(true);
  });
});
