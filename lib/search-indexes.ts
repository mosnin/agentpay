import "server-only";
import { prisma } from "./prisma";

// ===========================================================================
// Search index provisioning
// ===========================================================================
// lib/search.ts's primary query leans on two Postgres capabilities that
// aren't guaranteed to exist on a freshly-provisioned database:
//   1. the pg_trgm extension (trigram similarity, for typo tolerance), and
//   2. a GIN index over the full-text expression + a couple of trigram
//      indexes, so the query doesn't degrade into a sequential scan as the
//      catalog grows.
//
// Rather than requiring a hand-run migration/psql step, ensureSearchIndexes()
// provisions both idempotently (CREATE EXTENSION/INDEX IF NOT EXISTS) the
// first time it's called in this process. It is NOT part of `prisma migrate`
// on purpose — schema migrations are out of scope for this module (see the
// mission's "do not edit prisma/schema.prisma" boundary) and DDL here is
// additive/idempotent, safe to (re)run against an already-migrated database.

let ensured = false;
let ensuring: Promise<void> | null = null;

/**
 * Idempotently provisions pg_trgm + the search indexes. Safe to call before
 * every query: after the very first attempt (success OR failure) it resolves
 * immediately, so a database role that permanently lacks CREATE privileges
 * doesn't retry DDL on every request.
 *
 * A failure on that first attempt still propagates (this function can
 * reject) so the caller — lib/search.ts — can fall back for that specific
 * request. Note that a missing *index* alone would not normally break the
 * query (Postgres just sequential-scans instead), but a missing pg_trgm
 * *extension* does: the query's similarity()/gin_trgm_ops usage would raise
 * "function similarity(text, text) does not exist", which is exactly the
 * case this module exists to degrade gracefully from.
 */
export async function ensureSearchIndexes(): Promise<void> {
  if (ensured) return;
  if (!ensuring) {
    ensuring = setup().finally(() => {
      ensured = true;
    });
  }
  return ensuring;
}

async function setup(): Promise<void> {
  // Trusted since Postgres 13 — installable by a non-superuser role that
  // owns the database, which covers every managed Postgres provider this
  // app is likely to run against. If the role truly can't create
  // extensions, this throws and the caller falls back to ILIKE.
  await prisma.$executeRaw`CREATE EXTENSION IF NOT EXISTS pg_trgm`;

  // Expression GIN index backing the to_tsvector(...) @@ websearch_to_tsquery(...)
  // match in lib/search.ts. Must mirror that expression exactly (same columns,
  // same "english" config) for Postgres to actually use it. Capability names
  // are intentionally not part of this expression — they live in a related
  // table (Capability, via AgentCapability) and are pulled in per-query
  // through a LATERAL join, which a plain expression index on Agent can't
  // reach. That join is the accepted cost of not denormalizing capability
  // text onto Agent just for search.
  await prisma.$executeRaw`
    CREATE INDEX IF NOT EXISTS agent_search_fts_idx ON "Agent"
    USING GIN (
      to_tsvector('english',
        coalesce(name, '') || ' ' ||
        coalesce("shortDescription", '') || ' ' ||
        coalesce("longDescription", '') || ' ' ||
        coalesce(category, '')
      )
    )
  `;

  // Trigram indexes backing similarity()-based typo tolerance: the agent's
  // own name, and capability names (joined in per-query) — the latter is
  // what lets a query like "csv dedupe" surface an agent whose capability is
  // literally named "deduplication" (not a substring match, but a strong
  // trigram match).
  await prisma.$executeRaw`
    CREATE INDEX IF NOT EXISTS agent_name_trgm_idx ON "Agent"
    USING GIN (name gin_trgm_ops)
  `;
  await prisma.$executeRaw`
    CREATE INDEX IF NOT EXISTS capability_name_trgm_idx ON "Capability"
    USING GIN (name gin_trgm_ops)
  `;
}
