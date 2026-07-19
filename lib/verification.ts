import "server-only";

import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { validateArtifactAgainstSchema } from "@/lib/validation";
import { onAgentVerified } from "@/lib/reputation";
import { signWebhookBody } from "@/lib/webhooks";

/**
 * The verification program — contract.
 *
 * Makes the "Verified" badge an earned, revocable status instead of a
 * hand-set boolean: `runAgentVerification` runs three independent checks
 * against an agent and only flips `verified`/`verificationStatus` based on
 * what they actually find. Every check writes a `VerificationCheck` row, so
 * the badge always has an audit trail behind it, not just a flag.
 *
 * (a) HEALTH — proves the agent's endpoint is live *and*, when
 *     VERIFICATION_SECRET is configured, that it holds the shared secret.
 *     Bids POSTs a random nonce (signed with the same HMAC-SHA256-hex style
 *     as lib/webhooks.ts's signWebhookBody, over the JSON body); the
 *     endpoint must reply within HEALTH_CHECK_TIMEOUT_MS with JSON that
 *     echoes the nonce and, if a secret is configured, an HMAC of that nonce
 *     computed with the same secret. No endpoint, a timeout, a non-2xx, a
 *     missing nonce echo, or a bad signature are all real, distinct
 *     failures — never silently treated as a pass. With no
 *     VERIFICATION_SECRET configured the check still runs (reachability +
 *     protocol-correctness only) and says so honestly in its detail text;
 *     it never fabricates a signature it can't compute.
 * (b) SCHEMA — confirms the agent's declared outputSchema is a real,
 *     compilable JSON Schema (not just any string) by round-tripping a
 *     synthetic sample through lib/validation.ts's
 *     validateArtifactAgainstSchema. A schema that compiles passes this
 *     check regardless of whether the *generic* synthetic sample happens to
 *     satisfy every constraint it declares (required fields, enums,
 *     patterns...) — real submissions are what those constraints exist to
 *     check, not a value guessed here. Only an actual compile failure
 *     (ajv.compile throwing — surfaced by validateArtifactAgainstSchema as
 *     an "Invalid output schema: ..." error) fails this check. Skipped
 *     honestly (passed:true, detail prefixed per SKIPPED_DETAIL_PREFIX) when
 *     the agent declares no schema at all.
 * (c) IDENTITY — confirms the owner is a real account: an email on file
 *     always, plus a linked Clerk identity when this deployment runs with
 *     Clerk configured (isClerkBackedDeployment()). Deliberately minimal —
 *     built to grow (KYC, org verification, ...) without changing its shape.
 *
 * Aggregation (aggregateVerificationChecks, kept pure/exported so the rule
 * is unit-testable without a database): every non-skipped check must pass.
 * All pass -> verified/verified/lastVerifiedAt=now, and onAgentVerified()
 * records the reputation event. Otherwise -> not verified/failed, with a
 * concise verificationError built from what actually failed.
 * lastVerifiedAt is intentionally left untouched on a failing run — it
 * tracks the last time the agent *actually* passed, which is exactly what
 * app/api/cron/verify/route.ts's staleness sweep needs to read.
 *
 * runAgentVerification never throws: a dead/misconfigured endpoint (or a DB
 * hiccup while recording a check) must never crash the caller — API route,
 * server action, or the cron sweep, which fans this out over many agents.
 *
 * Implementation owned by Team 1 (verification program).
 */

// ---------------------------------------------------------------------------
// Pure signing / nonce helpers — exported for direct unit testing.
// ---------------------------------------------------------------------------

/** Random hex nonce for a single health-check challenge. Never reused. */
export function generateVerificationNonce(): string {
  return randomBytes(16).toString("hex");
}

/**
 * HMAC-SHA256 hex digest proving possession of VERIFICATION_SECRET for a
 * given challenge nonce. Same primitive/style as lib/webhooks.ts's
 * signWebhookBody (HMAC-SHA256 hex over the exact string being proven) —
 * kept as its own export (rather than importing signWebhookBody for this
 * side of the handshake too) so the health-check challenge/response
 * contract has its own stable, independently-testable surface.
 */
export function signVerificationChallenge(nonce: string, secret: string): string {
  return createHmac("sha256", secret).update(nonce).digest("hex");
}

/** Constant-time hex-string comparison — the response signature is
 * attacker-influenced input, so a naive `===` would leak timing info about
 * how many leading bytes matched. Malformed (non-hex, wrong-length) input
 * fails closed rather than throwing. */
function safeEqualHex(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "hex");
  const bufB = Buffer.from(b, "hex");
  if (bufA.length === 0 || bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

/** Mirrors lib/auth.ts's isClerkEnabled() check. Duplicated (not imported)
 * so this module's dependency graph stays limited to crypto/prisma/
 * validation/reputation/webhooks — lib/auth.ts pulls in Clerk + next/headers
 * + next/navigation, which this pure verification core (and its unit tests)
 * has no other reason to depend on. */
function isClerkBackedDeployment(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY,
  );
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type VerificationCheckKind = "health" | "schema" | "identity";

export interface VerificationCheckResult {
  kind: VerificationCheckKind;
  passed: boolean;
  /** Human-readable, honest, and safe to show on a public agent profile
   * (never leaks PII like a raw email address). */
  detail: string;
  /** True for a check that was intentionally not run (currently: SCHEMA
   * with no declared outputSchema). Excluded from the required set —
   * neither passes nor fails the badge on its own. */
  skipped: boolean;
}

export interface VerificationOutcome {
  agentId: string;
  verified: boolean;
  verificationStatus: "verified" | "failed";
  /** Set to the run time on a pass; left as whatever the agent already had
   * on a failure (a failing re-check doesn't erase the last time the badge
   * was genuinely earned). */
  lastVerifiedAt: Date | null;
  verificationError: string | null;
  checks: VerificationCheckResult[];
}

/**
 * VerificationCheck.passed has no dedicated "skipped" state in the schema
 * (boolean only), so a skipped check is persisted as passed:true (it must
 * not block the badge) with its detail text prefixed like this — the only
 * signal a reader (e.g. components/agents/verification-detail.tsx) has to
 * tell "genuinely passed" apart from "not applicable here".
 */
export const SKIPPED_DETAIL_PREFIX = "Skipped —";

export function isSkippedCheckDetail(detail: string | null | undefined): boolean {
  return Boolean(detail && detail.startsWith(SKIPPED_DETAIL_PREFIX));
}

// ---------------------------------------------------------------------------
// (a) HEALTH
// ---------------------------------------------------------------------------

const HEALTH_CHECK_TIMEOUT_MS = 10_000;

interface HealthChallengeResponse {
  nonce?: unknown;
  signature?: unknown;
}

/**
 * POST a signed nonce challenge to `endpointUrl` and require the response to
 * echo the nonce (and, with VERIFICATION_SECRET configured, a matching HMAC)
 * within HEALTH_CHECK_TIMEOUT_MS. Exported standalone (rather than only
 * reachable through runAgentVerification) so it's directly testable with a
 * mocked global.fetch and no database at all.
 */
export async function runHealthCheck(endpointUrl: string | null): Promise<VerificationCheckResult> {
  if (!endpointUrl) {
    return {
      kind: "health",
      passed: false,
      skipped: false,
      detail: "No endpoint to verify — add an invocation endpoint to run a health check.",
    };
  }

  const secret = process.env.VERIFICATION_SECRET;
  const nonce = generateVerificationNonce();
  const body = JSON.stringify({
    type: "verification_challenge",
    nonce,
    sent_at: new Date().toISOString(),
  });
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "x-bids-event": "verification.challenge",
  };
  if (secret) {
    // Lets the endpoint confirm the challenge really came from Bids —
    // symmetric with the HMAC we require back (see below).
    headers["x-bids-signature"] = signWebhookBody(body, secret);
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), HEALTH_CHECK_TIMEOUT_MS);
  try {
    const res = await fetch(endpointUrl, {
      method: "POST",
      headers,
      body,
      signal: controller.signal,
    });

    if (!res.ok) {
      return {
        kind: "health",
        passed: false,
        skipped: false,
        detail: `Endpoint responded ${res.status} ${res.statusText}`.trim() + ".",
      };
    }

    let payload: HealthChallengeResponse;
    try {
      payload = (await res.json()) as HealthChallengeResponse;
    } catch {
      return {
        kind: "health",
        passed: false,
        skipped: false,
        detail: "Endpoint response was not valid JSON.",
      };
    }

    const echoedNonce = typeof payload.nonce === "string" ? payload.nonce : null;
    if (echoedNonce !== nonce) {
      return {
        kind: "health",
        passed: false,
        skipped: false,
        detail: "Endpoint did not echo the challenge nonce.",
      };
    }

    if (secret) {
      const expected = signVerificationChallenge(nonce, secret);
      const signature = typeof payload.signature === "string" ? payload.signature : "";
      if (!safeEqualHex(signature, expected)) {
        return {
          kind: "health",
          passed: false,
          skipped: false,
          detail: "Endpoint signature did not match — it may not hold the verification secret.",
        };
      }
      return {
        kind: "health",
        passed: true,
        skipped: false,
        detail: "Endpoint answered the signed challenge with a valid HMAC.",
      };
    }

    return {
      kind: "health",
      passed: true,
      skipped: false,
      detail:
        "Endpoint answered the challenge (unsigned — set VERIFICATION_SECRET to cryptographically verify identity).",
    };
  } catch (err) {
    const timedOut = err instanceof Error && err.name === "AbortError";
    return {
      kind: "health",
      passed: false,
      skipped: false,
      detail: timedOut
        ? `Endpoint did not respond within ${HEALTH_CHECK_TIMEOUT_MS / 1000}s.`
        : `Endpoint request failed: ${err instanceof Error ? err.message : String(err)}`,
    };
  } finally {
    clearTimeout(timer);
  }
}

// ---------------------------------------------------------------------------
// (b) SCHEMA
// ---------------------------------------------------------------------------

/** Best-effort synthetic sample for a JSON-schema-shaped outputSchema — good
 * enough to exercise ajv's compile step for real (this check's actual goal),
 * not an attempt to satisfy every constraint a strict schema might declare. */
function buildSyntheticSample(schema: unknown): unknown {
  if (!schema || typeof schema !== "object" || Array.isArray(schema)) return {};
  const root = schema as Record<string, unknown>;
  const properties = root.properties;
  if (properties && typeof properties === "object" && !Array.isArray(properties)) {
    const sample: Record<string, unknown> = {};
    for (const [key, propSchema] of Object.entries(properties as Record<string, unknown>)) {
      sample[key] = syntheticValueForType(propSchema);
    }
    return sample;
  }
  return syntheticValueForType(root);
}

function syntheticValueForType(propSchema: unknown): unknown {
  if (!propSchema || typeof propSchema !== "object" || Array.isArray(propSchema)) return "sample";
  const p = propSchema as Record<string, unknown>;
  if (Array.isArray(p.enum) && p.enum.length > 0) return p.enum[0];
  switch (p.type) {
    case "string":
      return "sample";
    case "number":
    case "integer":
      return 0;
    case "boolean":
      return true;
    case "array":
      return [];
    case "object":
      return {};
    default:
      return "sample";
  }
}

/** True only for a genuine ajv compile failure (validateArtifactAgainstSchema
 * prefixes that specific case with "Invalid output schema:") — never for a
 * synthetic sample simply not satisfying a validly-compiled schema. */
function isSchemaCompileFailure(errors: string[]): boolean {
  return errors.some((e) => e.startsWith("Invalid output schema:"));
}

/**
 * Confirms the agent's declared outputSchema actually compiles as JSON
 * Schema. Pure given its input (no DB/network), exported for direct testing.
 */
export async function runSchemaCheck(outputSchema: unknown): Promise<VerificationCheckResult> {
  const sample = buildSyntheticSample(outputSchema);
  const result = validateArtifactAgainstSchema(outputSchema, sample);

  if (result.skipped) {
    return {
      kind: "schema",
      passed: true,
      skipped: true,
      detail: `${SKIPPED_DETAIL_PREFIX} agent declares no output schema.`,
    };
  }

  if (!result.valid && isSchemaCompileFailure(result.errors)) {
    return {
      kind: "schema",
      passed: false,
      skipped: false,
      detail: result.errors[0] ?? "Declared output schema does not compile.",
    };
  }

  return {
    kind: "schema",
    passed: true,
    skipped: false,
    detail: "Declared output schema compiles and is ready to validate submissions.",
  };
}

// ---------------------------------------------------------------------------
// (c) IDENTITY
// ---------------------------------------------------------------------------

export interface VerificationOwner {
  email: string;
  clerkId: string | null;
}

/**
 * Confirms the agent's owner is a real account — lightweight by design
 * (email on file, plus a linked Clerk identity when Clerk is configured)
 * but its own standalone check so future signals (KYC, org verification,
 * payout method on file, ...) can be added without touching the other two.
 */
export async function runIdentityCheck(owner: VerificationOwner | null): Promise<VerificationCheckResult> {
  if (!owner || !owner.email || !owner.email.trim()) {
    return {
      kind: "identity",
      passed: false,
      skipped: false,
      detail: "Owner account has no email on file.",
    };
  }

  if (isClerkBackedDeployment() && !owner.clerkId) {
    return {
      kind: "identity",
      passed: false,
      skipped: false,
      detail: "Owner is not linked to a signed-in account.",
    };
  }

  return {
    kind: "identity",
    passed: true,
    skipped: false,
    detail: isClerkBackedDeployment()
      ? "Owner identity confirmed via a signed-in account."
      : "Owner identity confirmed (verified email on file).",
  };
}

// ---------------------------------------------------------------------------
// Aggregation — pure, exported for unit testing without a database.
// ---------------------------------------------------------------------------

const CHECK_LABEL: Record<VerificationCheckKind, string> = {
  health: "Health",
  schema: "Schema",
  identity: "Identity",
};

/** Concise, multi-check-aware summary for Agent.verificationError. */
function summarizeFailure(checks: VerificationCheckResult[]): string {
  const failed = checks.filter((c) => !c.skipped && !c.passed);
  if (failed.length === 0) return "Verification did not pass.";
  return failed.map((c) => `${CHECK_LABEL[c.kind]}: ${c.detail}`).join(" ");
}

export interface VerificationAggregate {
  verified: boolean;
  verificationStatus: "verified" | "failed";
  verificationError: string | null;
}

/**
 * The badge rule: every non-skipped check must pass. Split out from
 * runAgentVerification so this decision is unit-testable on hand-built
 * VerificationCheckResult[] fixtures, with no Prisma/network involved.
 */
export function aggregateVerificationChecks(checks: VerificationCheckResult[]): VerificationAggregate {
  const required = checks.filter((c) => !c.skipped);
  const allPass = required.length > 0 && required.every((c) => c.passed);

  if (allPass) {
    return { verified: true, verificationStatus: "verified", verificationError: null };
  }
  return { verified: false, verificationStatus: "failed", verificationError: summarizeFailure(checks) };
}

// ---------------------------------------------------------------------------
// Orchestrator
// ---------------------------------------------------------------------------

function fetchAgentForVerification(agentId: string) {
  return prisma.agent.findUnique({
    where: { id: agentId },
    select: {
      id: true,
      endpointUrl: true,
      outputSchema: true,
      lastVerifiedAt: true,
      owner: { select: { email: true, clerkId: true } },
    },
  });
}

async function safeCheck(
  kind: VerificationCheckKind,
  fn: () => Promise<VerificationCheckResult>,
): Promise<VerificationCheckResult> {
  try {
    return await fn();
  } catch (err) {
    console.error(`[runAgentVerification] ${kind} check threw`, err);
    return {
      kind,
      passed: false,
      skipped: false,
      detail: "Check failed to run due to an internal error.",
    };
  }
}

/**
 * Run the full verification program for one agent: health, schema, identity
 * — persist a VerificationCheck row per check, aggregate, and update the
 * agent's verified/verificationStatus/lastVerifiedAt/verificationError
 * fields accordingly. Never throws (see file header).
 */
export async function runAgentVerification(agentId: string): Promise<VerificationOutcome> {
  let agent: Awaited<ReturnType<typeof fetchAgentForVerification>> = null;
  try {
    agent = await fetchAgentForVerification(agentId);
    if (!agent) {
      return {
        agentId,
        verified: false,
        verificationStatus: "failed",
        lastVerifiedAt: null,
        verificationError: "Agent not found.",
        checks: [],
      };
    }
    const verifiedAgent = agent;

    // Mark the run in-flight so a concurrent reader (profile page render,
    // another cron batch) never sees a stale verified/failed badge while the
    // health probe (up to HEALTH_CHECK_TIMEOUT_MS) is outstanding. Best
    // effort — failing to write "pending" must not abort the actual checks.
    try {
      await prisma.agent.update({ where: { id: agentId }, data: { verificationStatus: "pending" } });
    } catch (err) {
      console.error("[runAgentVerification] failed to mark pending", err);
    }

    const checks = await Promise.all([
      safeCheck("health", () => runHealthCheck(verifiedAgent.endpointUrl)),
      safeCheck("schema", () => runSchemaCheck(verifiedAgent.outputSchema)),
      safeCheck("identity", () => runIdentityCheck(verifiedAgent.owner)),
    ]);

    // Audit trail first, unconditionally — even a run that errors out below
    // still leaves a record of what each check found.
    try {
      await prisma.verificationCheck.createMany({
        data: checks.map((c) => ({
          agentId,
          kind: c.kind,
          passed: c.passed,
          detail: c.detail,
        })),
      });
    } catch (err) {
      console.error("[runAgentVerification] failed to persist checks", err);
    }

    const aggregate = aggregateVerificationChecks(checks);
    const lastVerifiedAt = aggregate.verified ? new Date() : verifiedAgent.lastVerifiedAt;

    // The aggregate write is the one thing this function does NOT swallow
    // locally: if it fails, the outer catch below reports an honest
    // "internal error" outcome rather than returning `verified` as if the
    // new status had actually been persisted.
    await prisma.agent.update({
      where: { id: agentId },
      data: {
        verified: aggregate.verified,
        verificationStatus: aggregate.verificationStatus,
        verificationError: aggregate.verificationError,
        ...(aggregate.verified ? { lastVerifiedAt } : {}),
      },
    });

    if (aggregate.verified) {
      // Reputation credit is a side effect of an already-persisted pass —
      // its failure shouldn't un-verify an agent that genuinely passed.
      try {
        await onAgentVerified(agentId);
      } catch (err) {
        console.error("[runAgentVerification] onAgentVerified failed", err);
      }
    }

    return { agentId, lastVerifiedAt, checks, ...aggregate };
  } catch (err) {
    console.error("[runAgentVerification] unexpected failure", err);
    return {
      agentId,
      verified: false,
      verificationStatus: "failed",
      lastVerifiedAt: agent?.lastVerifiedAt ?? null,
      verificationError: "Verification could not complete due to an internal error.",
      checks: [],
    };
  }
}
