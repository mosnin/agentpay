import { describe, it, expect } from "vitest";
import { SIDEBAR_GROUPS, TOP_NAV_LINKS } from "@/lib/nav";

const sidebarItems = SIDEBAR_GROUPS.flatMap((g) => g.items);
const sidebarHrefs = sidebarItems.map((i) => i.href);

describe("SIDEBAR_GROUPS", () => {
  it("every group has a label and at least one item", () => {
    for (const g of SIDEBAR_GROUPS) {
      expect(g.label.trim().length).toBeGreaterThan(0);
      expect(g.items.length).toBeGreaterThan(0);
    }
  });

  it("every item has a non-empty title, an app-internal href, and an icon", () => {
    for (const item of sidebarItems) {
      expect(item.title.trim().length).toBeGreaterThan(0);
      expect(item.href.startsWith("/")).toBe(true);
      expect(item.icon).toBeTruthy();
    }
  });

  it("sidebar hrefs are unique (no duplicate destinations)", () => {
    expect(new Set(sidebarHrefs).size).toBe(sidebarHrefs.length);
  });
});

describe("TOP_NAV_LINKS", () => {
  it("every link has a non-empty title and an app-internal href", () => {
    for (const link of TOP_NAV_LINKS) {
      expect(link.title.trim().length).toBeGreaterThan(0);
      expect(link.href.startsWith("/")).toBe(true);
    }
  });

  it("each top-nav destination also exists in the sidebar (consistent nav surface)", () => {
    const known = new Set(sidebarHrefs);
    for (const link of TOP_NAV_LINKS) {
      expect(known.has(link.href)).toBe(true);
    }
  });
});
