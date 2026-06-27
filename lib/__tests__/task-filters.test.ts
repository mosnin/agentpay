import { describe, it, expect } from "vitest";
import {
  TASK_FILTERS,
  statusesForFilter,
  TASK_STATUS_CONFIG,
} from "@/lib/constants";

// The in-progress statuses the "Active" tab must resolve to, in order.
const ACTIVE = ["pending", "accepted", "running", "submitted", "validating"];

describe("statusesForFilter", () => {
  it("returns undefined (no constraint) for 'all' and for no key", () => {
    expect(statusesForFilter("all")).toBeUndefined();
    expect(statusesForFilter()).toBeUndefined();
    expect(statusesForFilter(undefined)).toBeUndefined();
  });

  it("maps 'active' to exactly the in-progress statuses", () => {
    expect(statusesForFilter("active")).toEqual(ACTIVE);
  });

  it("maps single-status tabs 1:1", () => {
    expect(statusesForFilter("completed")).toEqual(["completed"]);
    expect(statusesForFilter("disputed")).toEqual(["disputed"]);
    expect(statusesForFilter("cancelled")).toEqual(["cancelled"]);
  });

  it("resolves every TASK_FILTERS key to known statuses", () => {
    for (const f of TASK_FILTERS) {
      const result = statusesForFilter(f.key);
      if (f.key === "all") {
        expect(result).toBeUndefined();
        continue;
      }
      expect(result).toBeDefined();
      // Every status a tab queries must be a real, configured lifecycle status.
      for (const s of result ?? []) {
        expect(TASK_STATUS_CONFIG[s]).toBeDefined();
      }
    }
  });

  it("treats an unknown key as a raw lifecycle status", () => {
    expect(statusesForFilter("draft")).toEqual(["draft"]);
  });

  it("returns a fresh array — mutating it can't corrupt the filter config", () => {
    const a = statusesForFilter("active");
    expect(a).toBeDefined();
    a?.push("draft");
    expect(statusesForFilter("active")).toEqual(ACTIVE);
  });
});
