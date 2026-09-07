#!/usr/bin/env node
// -----------------------------------------------------------------------------
// CI bundle budget guard.
//
// Reads the App Router build manifest that `next build` already produced
// (this script must run AFTER the build — see the "Check bundle budget" step
// in .github/workflows/ci.yml, wired directly after "Build") and re-derives
// the same "First Load JS" figure `next build`'s own CLI tree view prints for
// a route: the gzip size (level 9 — matching the `gzip-size` package Next
// uses internally, see node_modules/next/dist/compiled/gzip-size) of the
// union of every JS chunk that route's manifest entry references, deduped.
//
// Fails the build (exit 1) and prints a table if any configured route's
// First Load JS exceeds its budget. Sizes are reported in SI kilobytes
// (bytes / 1000) — the same unit `next build` itself prints via the
// `pretty-bytes` package's default decimal mode, not 1024-based KiB.
//
// Usage: node scripts/check-bundle-budget.mjs   (run from the repo root,
// after `next build` has produced a `.next/` directory.)
// -----------------------------------------------------------------------------

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { gzipSync } from "node:zlib";

const NEXT_DIR = path.join(process.cwd(), ".next");
const SI_KB = 1000; // matches next build's own "kB" unit (pretty-bytes, decimal mode)

// -----------------------------------------------------------------------------
// Budgets — the "heaviest routes" this workstream audited for lazy-loading
// opportunities (recharts + framer-motion in the critical path). Each budget
// has real headroom over the size measured against this tree's .next build
// on 2026-07-19:
//
//   route          measured   budget   headroom
//   /dashboard      206.2 kB   300 kB    ~45%
//   /tasks/new      306.2 kB   420 kB    ~37%
//   /tasks/[id]     307.0 kB   420 kB    ~37%
//
// The headroom is intentionally generous: this repo is being worked on by
// several parallel workstreams, so legitimate growth (new deps, new
// features, this team's own layout-level PWA/analytics additions) can land
// between now and any given CI run without flaking a red build. The budget
// still catches an egregious regression — e.g. an un-lazy-loaded recharts or
// framer-motion reintroduction on one of these routes would roughly double
// its number and trip the check well before it reached the next route's
// budget.
//
// `manifestKey` is the route's literal key in .next/app-build-manifest.json
// — the App Router's file path including the trailing "/page" segment
// (e.g. "/tasks/[id]/page"), NOT the URL pattern.
// -----------------------------------------------------------------------------
const BUDGETS = [
  { route: "/dashboard", manifestKey: "/dashboard/page", budgetKb: 300 },
  { route: "/tasks/new", manifestKey: "/tasks/new/page", budgetKb: 420 },
  { route: "/tasks/[id]", manifestKey: "/tasks/[id]/page", budgetKb: 420 },
];

function die(message) {
  console.error(`\n✖ ${message}\n`);
  process.exit(1);
}

/** gzip size in bytes, level 9 — matches Next's own "First Load JS" computation. */
function gzipSizeOf(absPath) {
  return gzipSync(readFileSync(absPath), { level: 9 }).length;
}

/**
 * Sum of the gzip sizes of every unique .js file the route's manifest entry
 * references (shared/root chunks + route-specific chunks alike — the
 * manifest already lists both together per route). Mirrors
 * `getJsPageSizeInKb`'s `allFilesSize` in next/dist/build/utils.js for the
 * App Router case (no pages-router `/_app` merge applies here).
 *
 * Returns null when the route isn't in the manifest at all (renamed/removed
 * route). Throws when the manifest references a file that doesn't exist on
 * disk (stale/incomplete build).
 */
function firstLoadJsBytes(manifest, manifestKey) {
  const files = manifest.pages?.[manifestKey];
  if (!files) return null;

  const jsFiles = [...new Set(files.filter((f) => f.endsWith(".js")))];
  let total = 0;
  for (const relFile of jsFiles) {
    const absFile = path.join(NEXT_DIR, relFile);
    if (!existsSync(absFile)) {
      throw new Error(
        `"${manifestKey}" references "${relFile}", which is missing from .next/. ` +
          "The build may be stale or incomplete — re-run `npm run build`.",
      );
    }
    total += gzipSizeOf(absFile);
  }
  return total;
}

function formatKb(kb) {
  return `${kb.toFixed(1)} kB`;
}

function main() {
  const manifestPath = path.join(NEXT_DIR, "app-build-manifest.json");
  if (!existsSync(manifestPath)) {
    die(
      `Could not find ${path.relative(process.cwd(), manifestPath)}. This script reads Next's ` +
        "build output and must run AFTER `next build` — run `npm run build` first, or check that " +
        "this step is wired after the Build step in ci.yml.",
    );
  }

  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));

  const results = [];
  let anyOverBudget = false;
  let anyErrored = false;
  let anyMissing = false;

  for (const budget of BUDGETS) {
    let bytes;
    try {
      bytes = firstLoadJsBytes(manifest, budget.manifestKey);
    } catch (err) {
      console.error(`✖ ${err instanceof Error ? err.message : String(err)}`);
      anyErrored = true;
      continue;
    }
    if (bytes === null) {
      console.warn(
        `⚠ "${budget.manifestKey}" was not found in app-build-manifest.json — skipping ` +
          "(route renamed or removed?).",
      );
      anyMissing = true;
      continue;
    }
    const kb = bytes / SI_KB;
    const pass = kb <= budget.budgetKb;
    if (!pass) anyOverBudget = true;
    results.push({ ...budget, kb, pass });
  }

  if (results.length > 0) {
    const nameWidth = Math.max("Route".length, ...results.map((r) => r.route.length));
    console.log("\nBundle budget — First Load JS (gzip, SI kB)\n");
    console.log(
      `  ${"Route".padEnd(nameWidth)}   ${"Actual".padEnd(9)}   ${"Budget".padEnd(9)}   ${"Used".padEnd(5)}   Status`,
    );
    console.log(`  ${"-".repeat(nameWidth)}   ${"-".repeat(9)}   ${"-".repeat(9)}   ${"-".repeat(5)}   ------`);
    for (const r of results) {
      const used = `${Math.round((r.kb / r.budgetKb) * 100)}%`;
      console.log(
        `  ${r.route.padEnd(nameWidth)}   ${formatKb(r.kb).padEnd(9)}   ${formatKb(r.budgetKb).padEnd(9)}   ${used.padEnd(5)}   ${r.pass ? "PASS" : "FAIL"}`,
      );
    }
    console.log("");
  }

  if (anyErrored) {
    die("Failed to measure one or more budgeted routes — see errors above.");
  }

  if (anyOverBudget) {
    die(
      "One or more routes exceeded their bundle budget. If a next/dynamic split is possible, do " +
        "that first; only raise the relevant budgetKb in scripts/check-bundle-budget.mjs alongside " +
        "the PR that caused the growth if the increase is genuinely expected.",
    );
  }

  if (anyMissing) {
    // A missing route is surfaced above but doesn't itself fail CI — a
    // renamed/removed route is a refactor concern for whoever owns that
    // page, not a bundle-size regression this check exists to catch.
    console.warn("Some configured routes were skipped — see warnings above.\n");
  }

  console.log("✓ All checked routes are within budget.\n");
}

main();
