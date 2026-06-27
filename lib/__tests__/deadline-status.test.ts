import { describe, it, expect } from "vitest";
import { deadlineStatus } from "@/lib/utils";

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

// A fixed reference instant keeps every verdict deterministic.
const now = new Date("2026-06-01T12:00:00.000Z").getTime();

describe("deadlineStatus", () => {
  it("marks a past deadline as overdue", () => {
    const r = deadlineStatus(now - HOUR, now);
    expect(r.tone).toBe("overdue");
    expect(r.label).toMatch(/^Overdue by/);
  });

  it("treats the exact current instant as overdue (diff <= 0)", () => {
    expect(deadlineStatus(now, now).tone).toBe("overdue");
  });

  it("flags a deadline well within 24h as soon", () => {
    const r = deadlineStatus(now + 2 * HOUR, now);
    expect(r.tone).toBe("soon");
    expect(r.label).toMatch(/^Due/);
  });

  it("includes the exact 24h boundary in soon", () => {
    // diff === DAY_MS is still "soon" (the check is `<= DAY_MS`).
    expect(deadlineStatus(now + DAY, now).tone).toBe("soon");
  });

  it("treats anything past 24h as normal", () => {
    expect(deadlineStatus(now + DAY + 60_000, now).tone).toBe("normal");
  });

  it("marks a deadline several days out as normal", () => {
    const r = deadlineStatus(now + 5 * DAY, now);
    expect(r.tone).toBe("normal");
    expect(r.label).toMatch(/^Due/);
  });

  it("accepts Date, string, and number inputs equivalently", () => {
    const due = now + 3 * HOUR;
    const asNum = deadlineStatus(due, now);
    const asDate = deadlineStatus(new Date(due), new Date(now));
    const asStr = deadlineStatus(
      new Date(due).toISOString(),
      new Date(now).toISOString(),
    );
    expect(asNum.tone).toBe("soon");
    expect(asDate.tone).toBe("soon");
    expect(asStr.tone).toBe("soon");
  });
});
