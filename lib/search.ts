import "server-only";
import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { ensureSearchIndexes } from "./search-indexes";

// ===========================================================================
// Marketplace search — Postgres full-text + trigram
// ===========================================================================
// The ⌘K command palette (components/layout/search-command.tsx) and
// GET /api/search both call searchAgents() below. Unlike lib/queries.ts's
// searchAgentsQuick (plain `contains` substring matching — cheap, but blind
// to synonyms/typos and to anything not a literal substring), this module
// runs a single ranked query per search that combines two Postgres
// primitives:
//
//   - Full-text search (to_tsvector/websearch_to_tsquery): matches by
//     lexeme, not substring, over the agent's name, descriptions, category,
//     and — via a per-row LATERAL join — its capability names. This is what
//     lets "csv cleanup" match a capability literally named "CSV cleanup"
//     even split across words/stems.
//   - Trigram similarity (pg_trgm's similarity()): typo- and near-miss
//     tolerant scoring over the agent name and the same capability-name
//     blob. This is what lets "csv dedupe" match a capability named
//     "deduplication" — not a literal substring of "dedupe", but a strong
//     trigram match (empirically ~0.21 similarity for that exact pair,
//     comfortably above the threshold below).
//
// Both live behind a single try/catch: if the required extension/indexes
// can't be provisioned, or the raw query itself throws for any other reason
// (e.g. a Postgres fork without pg_trgm support at all), searchAgents()
// transparently falls back to the same tokenized ILIKE strategy
// lib/queries.ts already uses elsewhere — degraded relevance, but it always
// returns *something* sensible rather than a 500.

export interface AgentSearchHit {
  id: string;
  slug: string;
  name: string;
  category: string;
  verified: boolean;
  reputationScore: number;
}

export interface SearchAgentsOptions {
  /** Max hits to return. Clamped to [1, MAX_LIMIT]; defaults to DEFAULT_LIMIT. */
  limit?: number;
}

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

// A pathological query (a pasted document, a script kiddie probing for
// injection) shouldn't be handed to websearch_to_tsquery/similarity()
// verbatim — cap it well above any real search-box input.
const MAX_QUERY_LENGTH = 200;

// Minimum trigram similarity (0..1) to count as a fuzzy match. Calibrated
// against this app's seed data: unrelated name/query pairs score ~0–0.03,
// genuine typos ("finantial" vs "Financial Analysis Agent") score 0.5+, and
// the tightest legitimate case found — "csv dedupe" against the capability
// blob "CSV cleanup deduplication schema mapping" — scores ~0.214. 0.15
// keeps that comfortably inside the threshold without going so low it
// surfaces noise.
const TRIGRAM_THRESHOLD = 0.15;

// --- Query normalization -----------------------------------------------------

/**
 * Normalize free-text search input before handing it to Postgres: trim,
 * collapse internal whitespace runs, and cap length. websearch_to_tsquery
 * and similarity() both tolerate arbitrary/malformed input without erroring
 * (unlike to_tsquery's strict operator syntax), so this is a defensive cap
 * rather than a correctness requirement.
 */
export function sanitizeSearchQuery(raw: string): string {
  return raw.trim().replace(/\s+/g, " ").slice(0, MAX_QUERY_LENGTH);
}

const MAX_SEARCH_TOKENS = 6;
const MIN_TOKEN_LENGTH = 2;

/**
 * Split a query into whitespace-delimited tokens for the ILIKE fallback's
 * AND-of-ORs matching (mirrors lib/queries.ts's tokenizer, reimplemented
 * here since that one isn't exported). Single-character tokens are dropped
 * as noise, and the token list is capped so a pathological query can't blow
 * up the generated WHERE clause.
 */
export function tokenizeQuery(query: string): string[] {
  return query
    .trim()
    .split(/\s+/)
    .filter((token) => token.length >= MIN_TOKEN_LENGTH)
    .slice(0, MAX_SEARCH_TOKENS);
}

function clampLimit(limit: number | undefined): number {
  if (!limit || !Number.isFinite(limit) || limit < 1) return DEFAULT_LIMIT;
  return Math.min(Math.floor(limit), MAX_LIMIT);
}

// --- Ranking ------------------------------------------------------------------

export interface RankableHit {
  verified: boolean;
  reputationScore: number;
  /** Higher = more relevant. Only meaningful within a single search's results. */
  relevance: number;
}

/**
 * Shared ordering: relevance desc, then verified desc, then reputationScore
 * desc — the same precedence the primary FTS query expresses in SQL
 * (`ORDER BY rank DESC, verified DESC, "reputationScore" DESC`). Exposed so
 * the ILIKE fallback (which has no ts_rank to lean on) can apply the exact
 * same tie-break rules in JS after a cheap relevance heuristic.
 */
export function compareSearchHits(a: RankableHit, b: RankableHit): number {
  if (a.relevance !== b.relevance) return b.relevance - a.relevance;
  if (a.verified !== b.verified) return a.verified ? -1 : 1;
  return b.reputationScore - a.reputationScore;
}

/**
 * Cheap relevance heuristic for the ILIKE fallback, where Postgres isn't
 * computing a real ts_rank for us: an exact name match ranks highest, then a
 * substring name match, then a match that only landed on a secondary field
 * (description/category/capability) via some other token, then nothing.
 */
export function nameMatchRelevance(name: string, query: string, tokens: string[]): number {
  const nameLower = name.toLowerCase();
  const queryLower = query.toLowerCase();
  if (nameLower === queryLower) return 3;
  if (nameLower.includes(queryLower)) return 2;
  if (tokens.some((token) => nameLower.includes(token.toLowerCase()))) return 1;
  return 0;
}

// --- ILIKE fallback -------------------------------------------------------

/** A single token must match at least one of these fields (case-insensitive substring). */
function agentTokenMatch(token: string): Prisma.AgentWhereInput {
  return {
    OR: [
      { name: { contains: token, mode: "insensitive" } },
      { shortDescription: { contains: token, mode: "insensitive" } },
      { longDescription: { contains: token, mode: "insensitive" } },
      { category: { contains: token, mode: "insensitive" } },
      {
        capabilities: {
          some: { capability: { name: { contains: token, mode: "insensitive" } } },
        },
      },
    ],
  };
}

/**
 * Build the fallback WHERE clause: active agents only, every token must
 * match somewhere (AND across tokens), a given token may match any of name /
 * shortDescription / longDescription / category / a capability name (OR
 * within a token). Pure and Prisma-free — safe to unit test directly.
 */
export function buildIlikeWhere(tokens: string[]): Prisma.AgentWhereInput {
  return {
    status: "active",
    AND: tokens.map(agentTokenMatch),
  };
}

async function ilikeSearch(query: string, take: number): Promise<AgentSearchHit[]> {
  const tokens = tokenizeQuery(query);
  if (tokens.length === 0) return [];

  const candidates = await prisma.agent.findMany({
    where: buildIlikeWhere(tokens),
    select: {
      id: true,
      slug: true,
      name: true,
      category: true,
      verified: true,
      reputationScore: true,
    },
    orderBy: [{ verified: "desc" }, { reputationScore: "desc" }],
    // Over-fetch relative to `take`: the DB-level ordering above is a
    // reasonable baseline, but the relevance re-rank below (favoring a name
    // match over a description/category/capability-only match) can promote
    // a row that wouldn't have made the cut on verified/reputation alone.
    take: Math.min(take * 4, 200),
  });

  return candidates
    .map((hit) => ({ ...hit, relevance: nameMatchRelevance(hit.name, query, tokens) }))
    .sort(compareSearchHits)
    .slice(0, take)
    .map(({ relevance: _relevance, ...hit }) => hit);
}

// --- Full-text + trigram search ------------------------------------------

async function ftsSearch(query: string, take: number): Promise<AgentSearchHit[]> {
  // Combined search surface: the agent's own text columns plus, via a
  // per-row LATERAL join, its capability names aggregated into one blob.
  // Capability names can't be folded into a static expression index (they
  // live in a related table), so this half of the match is index-assisted
  // only through agent_name_trgm_idx / capability_name_trgm_idx, not a
  // single covering index — an accepted tradeoff for not denormalizing
  // capability text onto Agent (see lib/search-indexes.ts).
  const tsvectorExpr = Prisma.sql`
    to_tsvector('english',
      coalesce(a.name, '') || ' ' ||
      coalesce(a."shortDescription", '') || ' ' ||
      coalesce(a."longDescription", '') || ' ' ||
      coalesce(a.category, '') || ' ' ||
      coalesce(caps.names, '')
    )
  `;
  const tsQuery = Prisma.sql`websearch_to_tsquery('english', ${query})`;

  return prisma.$queryRaw<AgentSearchHit[]>(Prisma.sql`
    SELECT
      a.id,
      a.slug,
      a.name,
      a.category,
      a.verified,
      a."reputationScore" AS "reputationScore"
    FROM "Agent" a
    LEFT JOIN LATERAL (
      SELECT string_agg(c.name, ' ') AS names
      FROM "AgentCapability" ac
      JOIN "Capability" c ON c.id = ac."capabilityId"
      WHERE ac."agentId" = a.id
    ) caps ON true
    WHERE a.status = 'active'::"AgentStatus"
      AND (
        ${tsvectorExpr} @@ ${tsQuery}
        OR similarity(a.name, ${query}) > ${TRIGRAM_THRESHOLD}
        OR similarity(coalesce(caps.names, ''), ${query}) > ${TRIGRAM_THRESHOLD}
      )
    ORDER BY
      GREATEST(
        ts_rank(${tsvectorExpr}, ${tsQuery}),
        similarity(a.name, ${query}),
        similarity(coalesce(caps.names, ''), ${query})
      ) DESC,
      a.verified DESC,
      a."reputationScore" DESC
    LIMIT ${take}
  `);
}

// --- Public entry point -----------------------------------------------------

let warnedFallback = false;
function logFallbackOnce(err: unknown): void {
  if (warnedFallback) return;
  warnedFallback = true;
  console.error(
    "[search] Postgres full-text/trigram search unavailable — falling back to ILIKE matching " +
      "for this and future queries in this process.",
    err,
  );
}

/**
 * Rank agents by relevance to a free-text query using Postgres full-text
 * search combined with trigram similarity (typo tolerance), scoped to
 * active agents. Never throws: any failure provisioning the required
 * extension/indexes, or from the raw query itself, degrades to a safe
 * ILIKE-based match over the same fields so the caller always gets a
 * sensible (if lower-quality) result set instead of an error.
 */
export async function searchAgents(
  query: string,
  { limit }: SearchAgentsOptions = {},
): Promise<AgentSearchHit[]> {
  const q = sanitizeSearchQuery(query);
  if (!q) return [];
  const take = clampLimit(limit);

  try {
    await ensureSearchIndexes();
    return await ftsSearch(q, take);
  } catch (err) {
    logFallbackOnce(err);
    return ilikeSearch(q, take);
  }
}
