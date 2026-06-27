import { describe, it, expect } from "vitest";
import {
  CATEGORIES,
  CATEGORY_VALUES,
  PRICING_MODELS,
  PAYMENT_MODES,
  VISIBILITY_OPTIONS,
  MARKETPLACE_SORTS,
  TASK_LIFECYCLE,
  TASK_STATUS_CONFIG,
  PAYMENT_STATUS_CONFIG,
  VALIDATION_STATUS_CONFIG,
  AGENT_STATUS_CONFIG,
  DISPUTE_STATUS_CONFIG,
  TASK_FILTERS,
  statusesForFilter,
  REPUTATION_EVENT_LABELS,
  reputationEventLabel,
  getStatusConfig,
} from "@/lib/constants";
import { SIDEBAR_GROUPS, TOP_NAV_LINKS } from "@/lib/nav";

function expectWellFormedOptions(
  options: ReadonlyArray<{ value: string; label: string }>,
) {
  expect(options.length).toBeGreaterThan(0);
  const values = options.map((o) => o.value);
  expect(new Set(values).size).toBe(values.length); // values are unique
  for (const o of options) {
    expect(o.value.length).toBeGreaterThan(0);
    expect(o.label.length).toBeGreaterThan(0);
  }
}

describe("option lists are well-formed", () => {
  it("categories carry value/label/icon/description", () => {
    expectWellFormedOptions(CATEGORIES);
    for (const c of CATEGORIES) {
      expect(c.icon.length).toBeGreaterThan(0);
      expect(c.description.length).toBeGreaterThan(0);
    }
  });

  it("CATEGORY_VALUES mirrors CATEGORIES", () => {
    expect(CATEGORY_VALUES).toEqual(CATEGORIES.map((c) => c.value));
  });

  it("pricing / payment / visibility / sort lists are well-formed", () => {
    expectWellFormedOptions(PRICING_MODELS);
    expectWellFormedOptions(PAYMENT_MODES);
    expectWellFormedOptions(VISIBILITY_OPTIONS);
    expectWellFormedOptions(MARKETPLACE_SORTS);
  });
});

describe("status config maps", () => {
  const maps = {
    TASK_STATUS_CONFIG,
    PAYMENT_STATUS_CONFIG,
    VALIDATION_STATUS_CONFIG,
    AGENT_STATUS_CONFIG,
    DISPUTE_STATUS_CONFIG,
  };

  it("every entry has a label, className, and dot", () => {
    for (const map of Object.values(maps)) {
      for (const cfg of Object.values(map)) {
        expect(cfg.label.length).toBeGreaterThan(0);
        expect(cfg.className.length).toBeGreaterThan(0);
        expect(cfg.dot.length).toBeGreaterThan(0);
      }
    }
  });

  it("every lifecycle status has a task-status config", () => {
    for (const status of TASK_LIFECYCLE) {
      expect(TASK_STATUS_CONFIG[status]).toBeDefined();
    }
  });
});

describe("getStatusConfig", () => {
  it("returns the config for a known key and a safe fallback otherwise", () => {
    expect(getStatusConfig(TASK_STATUS_CONFIG, "completed").label).toBe("Completed");
    const fallback = getStatusConfig(TASK_STATUS_CONFIG, "nope");
    expect(fallback.label).toBe("nope");
    expect(fallback.className.length).toBeGreaterThan(0);
    expect(getStatusConfig(TASK_STATUS_CONFIG, null).label).toBe("Unknown");
  });
});

describe("navigation config", () => {
  const navHrefs = SIDEBAR_GROUPS.flatMap((g) => g.items).map((i) => i.href);

  it("sidebar items have non-empty titles and rooted, unique hrefs", () => {
    for (const group of SIDEBAR_GROUPS) {
      expect(group.label.length).toBeGreaterThan(0);
      for (const item of group.items) {
        expect(item.title.length).toBeGreaterThan(0);
        expect(item.href.startsWith("/")).toBe(true);
      }
    }
    expect(new Set(navHrefs).size).toBe(navHrefs.length);
  });

  it("top-nav links are rooted and non-empty", () => {
    for (const link of TOP_NAV_LINKS) {
      expect(link.title.length).toBeGreaterThan(0);
      expect(link.href.startsWith("/")).toBe(true);
    }
  });
});

describe("TASK_FILTERS / statusesForFilter", () => {
  const validStatuses = new Set([
    ...TASK_LIFECYCLE,
    "disputed",
    "cancelled",
  ]);

  it("has an 'all' bucket and unique keys with labels", () => {
    const keys = TASK_FILTERS.map((f) => f.key);
    expect(new Set(keys).size).toBe(keys.length);
    expect(keys).toContain("all");
    for (const f of TASK_FILTERS) expect(f.label.length).toBeGreaterThan(0);
  });

  it("every bucket's statuses are real lifecycle states; 'all' has none", () => {
    for (const f of TASK_FILTERS) {
      if (f.key === "all") {
        expect("statuses" in f).toBe(false);
      } else {
        const statuses = (f as { statuses: readonly string[] }).statuses;
        expect(statuses.length).toBeGreaterThan(0);
        for (const s of statuses) expect(validStatuses.has(s)).toBe(true);
      }
    }
  });

  it("the 'active' bucket is exactly the five in-progress statuses", () => {
    const active = TASK_FILTERS.find((f) => f.key === "active");
    expect(active && "statuses" in active ? [...active.statuses] : []).toEqual([
      "pending",
      "accepted",
      "running",
      "submitted",
      "validating",
    ]);
  });

  it("statusesForFilter resolves keys, all→undefined, unknown→raw", () => {
    expect(statusesForFilter()).toBeUndefined();
    expect(statusesForFilter("all")).toBeUndefined();
    expect(statusesForFilter("completed")).toEqual(["completed"]);
    expect(statusesForFilter("active")).toHaveLength(5);
    expect(statusesForFilter("running")).toEqual(["running"]);
  });
});

describe("reputationEventLabel", () => {
  it("labels every known event type non-trivially", () => {
    for (const [type, label] of Object.entries(REPUTATION_EVENT_LABELS)) {
      expect(label.length).toBeGreaterThan(0);
      expect(reputationEventLabel(type)).toBe(label);
    }
  });
  it("covers the dispute lifecycle types", () => {
    expect(reputationEventLabel("dispute_opened")).toBe("Dispute opened");
    expect(reputationEventLabel("dispute_resolved")).toBe("Dispute resolved");
    expect(reputationEventLabel("sla_met")).toBe("SLA met");
  });
  it("falls back to a humanized label for unknown types", () => {
    expect(reputationEventLabel("some_new_event")).toBe("Some new event");
  });
});
