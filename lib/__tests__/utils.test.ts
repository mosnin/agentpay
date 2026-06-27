import { describe, it, expect } from "vitest";
import {
  formatCurrency,
  formatPercent,
  formatLatency,
  slugify,
  initials,
  truncate,
  safeJsonParse,
  hashString,
  clamp,
  mockHash,
  deadlineStatus,
  formatNumber,
  formatCompactNumber,
  formatRelativeTime,
} from "@/lib/utils";

describe("formatCurrency", () => {
  it("renders whole numbers without decimals", () => {
    expect(formatCurrency(25)).toBe("$25");
  });
  it("renders fractional amounts with two decimals", () => {
    expect(formatCurrency(25.5)).toBe("$25.50");
  });
});

describe("formatPercent", () => {
  it("converts a 0..1 ratio to a percentage", () => {
    expect(formatPercent(0.92)).toBe("92%");
    expect(formatPercent(1)).toBe("100%");
  });
});

describe("formatNumber", () => {
  it("groups thousands", () => {
    expect(formatNumber(1234567)).toBe("1,234,567");
    expect(formatNumber(0)).toBe("0");
  });
});

describe("formatCompactNumber", () => {
  it("uses compact notation for large values", () => {
    expect(formatCompactNumber(1200)).toBe("1.2K");
    expect(formatCompactNumber(3400000)).toBe("3.4M");
    expect(formatCompactNumber(42)).toBe("42");
  });
});

describe("formatRelativeTime", () => {
  it("returns a human, suffixed string for past and future", () => {
    const now = Date.now();
    expect(formatRelativeTime(now - 3 * 86400000)).toMatch(/ago$/);
    expect(formatRelativeTime(now + 3 * 86400000)).toMatch(/^in /);
  });
});

describe("formatLatency", () => {
  it("handles sub-minute, minutes, hours, and days", () => {
    expect(formatLatency(0.5)).toBe("<1 min");
    expect(formatLatency(30)).toBe("30 min");
    expect(formatLatency(120)).toBe("2 hr");
    expect(formatLatency(2880)).toBe("2 d");
  });
});

describe("slugify", () => {
  it("lowercases, strips punctuation, and hyphenates", () => {
    expect(slugify("  Growth Research Agent! ")).toBe("growth-research-agent");
  });
});

describe("initials", () => {
  it("takes up to two uppercase initials", () => {
    expect(initials("Growth Research Agent")).toBe("GR");
    expect(initials("solo")).toBe("S");
  });
});

describe("truncate", () => {
  it("leaves short strings untouched and ellipsizes long ones", () => {
    expect(truncate("hello", 10)).toBe("hello");
    expect(truncate("hello world", 5)).toBe("hello…");
  });
});

describe("safeJsonParse", () => {
  it("parses valid JSON and returns null on invalid", () => {
    expect(safeJsonParse('{"a":1}')).toEqual({ a: 1 });
    expect(safeJsonParse("not json")).toBeNull();
  });
});

describe("deadlineStatus", () => {
  const now = new Date("2026-06-27T12:00:00Z");
  it("flags past deadlines as overdue", () => {
    const r = deadlineStatus(new Date("2026-06-25T12:00:00Z"), now);
    expect(r.tone).toBe("overdue");
    expect(r.label).toMatch(/^Overdue by /);
  });
  it("flags deadlines within 24h as soon", () => {
    const r = deadlineStatus(new Date("2026-06-27T18:00:00Z"), now);
    expect(r.tone).toBe("soon");
    expect(r.label).toMatch(/^Due /);
  });
  it("treats deadlines further out as normal", () => {
    const r = deadlineStatus(new Date("2026-07-04T12:00:00Z"), now);
    expect(r.tone).toBe("normal");
    expect(r.label).toMatch(/^Due /);
  });
});

describe("hashString / clamp / mockHash", () => {
  it("hashString is deterministic", () => {
    expect(hashString("seed")).toBe(hashString("seed"));
  });
  it("clamp bounds values", () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-1, 0, 10)).toBe(0);
    expect(clamp(99, 0, 10)).toBe(10);
  });
  it("mockHash is deterministic and prefixed", () => {
    const a = mockHash("tx", "abc");
    expect(a).toBe(mockHash("tx", "abc"));
    expect(a.startsWith("tx_")).toBe(true);
  });
});
