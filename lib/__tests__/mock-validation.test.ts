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
});
