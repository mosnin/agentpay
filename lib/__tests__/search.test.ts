import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Prisma } from "@prisma/client";

// lib/search.ts (and its lib/search-indexes.ts dependency) are server-only
// modules: both start with `import "server-only"` (which throws outside a
// "react-server" bundler condition) and import the real Prisma client at
// module scope (which requires a live datasource). Neither concern applies
// to the pure query-normalization/ranking/where-clause-building helpers
// under test here, so both are stubbed before importing the module below —
// `vi.mock` calls are hoisted above imports, so this runs before
// `@/lib/search` (and its imports) ever evaluate. See lib/__tests__/api-keys.test.ts
// for the same pattern elsewhere in this codebase.
const { queryRawMock, executeRawMock, findManyMock } = vi.hoisted(() => ({
  queryRawMock: vi.fn(),
  executeRawMock: vi.fn(),
  findManyMock: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    $queryRaw: queryRawMock,
    $executeRaw: executeRawMock,
    agent: { findMany: findManyMock },
  },
}));

import {
  sanitizeSearchQuery,
  tokenizeQuery,
  buildIlikeWhere,
  compareSearchHits,
  nameMatchRelevance,
  searchAgents,
  type RankableHit,
} from "@/lib/search";

// ===========================================================================
// Pure helpers — no mocking beyond the module-load stubs above, no DB.
// ===========================================================================

describe("sanitizeSearchQuery", () => {
  it("trims leading/trailing whitespace", () => {
    expect(sanitizeSearchQuery("  csv dedupe  ")).toBe("csv dedupe");
  });

  it("collapses internal whitespace runs to a single space", () => {
    expect(sanitizeSearchQuery("csv    dedupe\tagent")).toBe("csv dedupe agent");
  });

  it("caps length at 200 characters", () => {
    const long = "a".repeat(500);
    expect(sanitizeSearchQuery(long)).toHaveLength(200);
  });

  it("returns an empty string for whitespace-only input", () => {
    expect(sanitizeSearchQuery("   \n\t  ")).toBe("");
  });

  it("leaves an already-clean query untouched", () => {
    expect(sanitizeSearchQuery("data cleaning")).toBe("data cleaning");
  });
});

describe("tokenizeQuery", () => {
  it("splits on whitespace", () => {
    expect(tokenizeQuery("csv dedupe agent")).toEqual(["csv", "dedupe", "agent"]);
  });

  it("drops single-character tokens as noise", () => {
    expect(tokenizeQuery("a csv b")).toEqual(["csv"]);
  });

  it("caps the token count at 6", () => {
    const many = "one two three four five six seven eight";
    expect(tokenizeQuery(many)).toEqual(["one", "two", "three", "four", "five", "six"]);
  });

  it("returns an empty array for empty or whitespace-only input", () => {
    expect(tokenizeQuery("")).toEqual([]);
    expect(tokenizeQuery("   ")).toEqual([]);
  });

  it("collapses repeated whitespace between tokens", () => {
    expect(tokenizeQuery("csv    dedupe")).toEqual(["csv", "dedupe"]);
  });
});

describe("buildIlikeWhere", () => {
  it("scopes to active agents only", () => {
    expect(buildIlikeWhere(["csv"]).status).toBe("active");
  });

  it("requires every token to match somewhere (AND across tokens)", () => {
    const where = buildIlikeWhere(["csv", "dedupe"]);
    expect(where.AND).toHaveLength(2);
  });

  it("lets a single token match name, either description, category, or a capability (OR within a token)", () => {
    const where = buildIlikeWhere(["csv"]);
    const [clause] = where.AND as Prisma.AgentWhereInput[];
    expect(clause.OR).toEqual([
      { name: { contains: "csv", mode: "insensitive" } },
      { shortDescription: { contains: "csv", mode: "insensitive" } },
      { longDescription: { contains: "csv", mode: "insensitive" } },
      { category: { contains: "csv", mode: "insensitive" } },
      {
        capabilities: {
          some: { capability: { name: { contains: "csv", mode: "insensitive" } } },
        },
      },
    ]);
  });

  it("produces one AND clause per token, each scoped to that token's text", () => {
    const where = buildIlikeWhere(["csv", "dedupe"]);
    const [first, second] = where.AND as Prisma.AgentWhereInput[];
    const firstOr = first.OR as Prisma.AgentWhereInput[];
    const secondOr = second.OR as Prisma.AgentWhereInput[];
    expect(firstOr[0]).toEqual({ name: { contains: "csv", mode: "insensitive" } });
    expect(secondOr[0]).toEqual({ name: { contains: "dedupe", mode: "insensitive" } });
  });

  it("applies no token constraint for an empty token list, but stays scoped to active", () => {
    const where = buildIlikeWhere([]);
    expect(where.status).toBe("active");
    expect(where.AND).toEqual([]);
  });
});

describe("nameMatchRelevance", () => {
  it("scores an exact (case-insensitive) name match highest", () => {
    expect(
      nameMatchRelevance("Data Cleaning Agent", "data cleaning agent", [
        "data",
        "cleaning",
        "agent",
      ]),
    ).toBe(3);
  });

  it("scores a substring name match above a bare-token match", () => {
    expect(nameMatchRelevance("Data Cleaning Agent", "cleaning", ["cleaning"])).toBe(2);
  });

  it("scores a bare token match when the full query isn't a substring of the name", () => {
    expect(nameMatchRelevance("Data Cleaning Agent", "cleaning csv", ["cleaning", "csv"])).toBe(
      1,
    );
  });

  it("scores 0 when nothing in the name matches", () => {
    expect(nameMatchRelevance("Data Cleaning Agent", "security scan", ["security", "scan"])).toBe(
      0,
    );
  });
});

describe("compareSearchHits", () => {
  const hit = (overrides: Partial<RankableHit>): RankableHit => ({
    verified: false,
    reputationScore: 50,
    relevance: 0,
    ...overrides,
  });

  it("ranks higher relevance first, regardless of verified/reputation", () => {
    const lessRelevantButStrong = hit({ relevance: 1, verified: true, reputationScore: 99 });
    const moreRelevantButWeak = hit({ relevance: 2, verified: false, reputationScore: 10 });
    expect(compareSearchHits(lessRelevantButStrong, moreRelevantButWeak)).toBeGreaterThan(0);
  });

  it("breaks a relevance tie by verified desc", () => {
    const unverified = hit({ relevance: 1, verified: false, reputationScore: 99 });
    const verified = hit({ relevance: 1, verified: true, reputationScore: 1 });
    expect(compareSearchHits(unverified, verified)).toBeGreaterThan(0);
  });

  it("breaks a relevance+verified tie by reputationScore desc", () => {
    const lowerRep = hit({ relevance: 1, verified: true, reputationScore: 40 });
    const higherRep = hit({ relevance: 1, verified: true, reputationScore: 90 });
    expect(compareSearchHits(lowerRep, higherRep)).toBeGreaterThan(0);
  });

  it("returns 0 for fully-tied hits", () => {
    const a = hit({ relevance: 1, verified: true, reputationScore: 50 });
    const b = hit({ relevance: 1, verified: true, reputationScore: 50 });
    expect(compareSearchHits(a, b)).toBe(0);
  });

  it("sorts a mixed list into relevance, then verified, then reputation order", () => {
    const list: RankableHit[] = [
      hit({ relevance: 0, verified: true, reputationScore: 99 }),
      hit({ relevance: 2, verified: false, reputationScore: 10 }),
      hit({ relevance: 2, verified: true, reputationScore: 50 }),
    ];
    const sorted = [...list].sort(compareSearchHits);
    expect(sorted.map((h) => h.reputationScore)).toEqual([50, 10, 99]);
  });
});

// ===========================================================================
// searchAgents — shape/wiring tests against a mocked Prisma client.
// ===========================================================================

describe("searchAgents", () => {
  beforeEach(() => {
    queryRawMock.mockReset();
    executeRawMock.mockReset();
    findManyMock.mockReset();
    executeRawMock.mockResolvedValue(undefined);
  });

  it("returns [] for an empty/whitespace query without touching the database", async () => {
    await expect(searchAgents("   ")).resolves.toEqual([]);
    expect(queryRawMock).not.toHaveBeenCalled();
    expect(findManyMock).not.toHaveBeenCalled();
  });

  it("returns the FTS query's rows verbatim on the happy path", async () => {
    const rows = [
      { id: "a1", slug: "data-cleaning-agent", name: "Data Cleaning Agent", category: "Data", verified: false, reputationScore: 86 },
    ];
    queryRawMock.mockResolvedValue(rows);

    await expect(searchAgents("csv dedupe")).resolves.toEqual(rows);
    expect(queryRawMock).toHaveBeenCalledTimes(1);
    expect(findManyMock).not.toHaveBeenCalled();
  });

  it("clamps an out-of-range limit and still queries once", async () => {
    queryRawMock.mockResolvedValue([]);
    await searchAgents("growth", { limit: 10_000 });
    expect(queryRawMock).toHaveBeenCalledTimes(1);
  });

  it("falls back to an ILIKE lookup when the raw FTS query throws", async () => {
    queryRawMock.mockRejectedValue(new Error('function similarity(text, text) does not exist'));
    const hit = {
      id: "a1",
      slug: "data-cleaning-agent",
      name: "Data Cleaning Agent",
      category: "Data",
      verified: false,
      reputationScore: 86,
    };
    findManyMock.mockResolvedValue([hit]);

    const result = await searchAgents("data cleanup");

    expect(queryRawMock).toHaveBeenCalledTimes(1);
    expect(findManyMock).toHaveBeenCalledTimes(1);
    expect(result).toEqual([hit]);

    // The fallback queries only active agents via the tokenized where clause.
    const call = findManyMock.mock.calls[0][0] as { where: Prisma.AgentWhereInput };
    expect(call.where.status).toBe("active");
  });

  it("never surfaces the raw FTS error to the caller (degrades to [] rather than throwing)", async () => {
    queryRawMock.mockRejectedValue(new Error("connection terminated"));
    findManyMock.mockResolvedValue([]);

    await expect(searchAgents("anything")).resolves.toEqual([]);
  });
});
