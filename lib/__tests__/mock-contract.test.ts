import { describe, it, expect } from "vitest";
import { generateStructuredContract } from "@/lib/mockContract";

describe("generateStructuredContract", () => {
  it("derives a capitalized title from the objective", () => {
    const c = generateStructuredContract({
      objective: "enrich 500 shopify leads with founder emails.",
    });
    expect(c.title.startsWith("Enrich")).toBe(true);
  });

  it("selects the category output schema and is deterministic", () => {
    const a = generateStructuredContract({ objective: "enrich leads", category: "Growth" });
    const b = generateStructuredContract({ objective: "enrich leads", category: "Growth" });
    expect(a).toEqual(b);
    expect(a.outputSchema).toHaveProperty("records");
  });

  it("falls back to the default schema for an unknown category", () => {
    const c = generateStructuredContract({ objective: "do something", category: "Nope" });
    expect(c.outputSchema).toMatchObject({
      result: "object",
      summary: "string",
      confidence: "number",
    });
  });

  it("derives constraints from the objective text", () => {
    const c = generateStructuredContract({
      objective: "find 500 emails and cite every source",
    });
    const joined = c.validationRules.join(" ").toLowerCase();
    expect(joined).toContain("500");
    expect(joined).toContain("email");
    expect(joined).toContain("source");
  });

  it("handles an empty objective", () => {
    const c = generateStructuredContract({ objective: "" });
    expect(c.title).toBe("Untitled task contract");
  });
});
