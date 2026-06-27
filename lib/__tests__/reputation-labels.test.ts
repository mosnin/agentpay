import { describe, it, expect } from "vitest";
import {
  REPUTATION_EVENT_LABELS,
  reputationEventLabel,
} from "@/lib/constants";

describe("reputationEventLabel", () => {
  it("returns the curated label for every known event type", () => {
    for (const [type, label] of Object.entries(REPUTATION_EVENT_LABELS)) {
      expect(reputationEventLabel(type)).toBe(label);
    }
  });

  it("humanizes an unknown snake_case type (underscores -> spaces, first letter capitalized)", () => {
    // The fallback is sentence case — only the first character is uppercased.
    expect(reputationEventLabel("some_new_event")).toBe("Some new event");
  });

  it("capitalizes a single unknown word", () => {
    expect(reputationEventLabel("refunded")).toBe("Refunded");
  });

  it("always returns a non-empty string for any non-empty type", () => {
    for (const type of ["task_completed", "mystery_event", "x", "a_b_c_d"]) {
      const label = reputationEventLabel(type);
      expect(typeof label).toBe("string");
      expect(label.length).toBeGreaterThan(0);
    }
  });
});
