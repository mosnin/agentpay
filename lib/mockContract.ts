// ---------------------------------------------------------------------------
// "Generate structured contract" — deterministic, local AI-assist mock.
//
// Transforms a free-text objective into a structured task contract preview.
// Pure + deterministic (no network, no randomness) so it is safe to run on the
// client. Replace generateStructuredContract() with a real LLM call later; the
// return shape feeds straight into the TaskContract model.
// ---------------------------------------------------------------------------

export interface StructuredContract {
  title: string;
  inputPayload: Record<string, unknown>;
  outputSchema: Record<string, unknown>;
  validationRules: string[];
  successCriteria: string;
}

const OUTPUT_SCHEMAS_BY_CATEGORY: Record<string, Record<string, unknown>> = {
  Growth: {
    records: [
      {
        company: "string",
        domain: "string",
        contact_email: "string",
        confidence: "number",
      },
    ],
    total: "number",
  },
  Research: {
    summary: "string",
    key_findings: ["string"],
    sources: [{ title: "string", url: "string" }],
  },
  Coding: {
    issues: [{ file: "string", severity: "string", description: "string" }],
    suggested_fixes: ["string"],
    tests_added: "number",
  },
  Data: {
    rows_processed: "number",
    schema: "object",
    sample: ["object"],
    quality_score: "number",
  },
  Design: {
    findings: [{ area: "string", issue: "string", recommendation: "string" }],
    conversion_score: "number",
  },
  Finance: {
    categories: [{ name: "string", total: "number" }],
    net_cash_flow: "number",
    variance: "number",
  },
  Security: {
    vulnerabilities: [{ id: "string", severity: "string", remediation: "string" }],
    risk_score: "number",
  },
  Operations: {
    records_updated: "number",
    routed: "number",
    errors: ["string"],
  },
  "Customer Support": {
    tickets: [{ id: "string", category: "string", sentiment: "string", draft_reply: "string" }],
  },
  Infrastructure: {
    checks: [{ target: "string", status: "string", latency_ms: "number" }],
    incidents: ["object"],
  },
};

const DEFAULT_SCHEMA: Record<string, unknown> = {
  result: "object",
  summary: "string",
  confidence: "number",
};

function deriveTitle(objective: string): string {
  const trimmed = objective.trim().replace(/\s+/g, " ");
  if (!trimmed) return "Untitled task contract";
  const firstSentence = trimmed.split(/[.!?\n]/)[0];
  const words = firstSentence.split(" ").slice(0, 9).join(" ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

function deriveConstraints(objective: string): string[] {
  const lower = objective.toLowerCase();
  const constraints: string[] = [];
  const numberMatch = objective.match(/\b(\d{2,6})\b/);
  if (numberMatch) constraints.push(`Target volume: ${numberMatch[1]} items`);
  if (lower.includes("email")) constraints.push("Validate and de-duplicate email addresses");
  if (lower.includes("csv") || lower.includes("spreadsheet")) constraints.push("Return a normalized tabular dataset");
  if (lower.includes("cite") || lower.includes("source")) constraints.push("Every claim must include a source URL");
  if (lower.includes("report")) constraints.push("Deliver an executive summary up top");
  if (constraints.length === 0) constraints.push("Follow the output schema exactly");
  return constraints;
}

export function generateStructuredContract(input: {
  objective: string;
  category?: string;
  expectedOutputFormat?: string;
}): StructuredContract {
  const objective = input.objective ?? "";
  const category = input.category ?? "Growth";
  const outputSchema =
    OUTPUT_SCHEMAS_BY_CATEGORY[category] ?? DEFAULT_SCHEMA;

  const constraints = deriveConstraints(objective);

  return {
    title: deriveTitle(objective),
    inputPayload: {
      objective: objective.trim(),
      category,
      constraints,
      expected_format: input.expectedOutputFormat?.trim() || "JSON matching output_schema",
    },
    outputSchema,
    validationRules: [
      "Output MUST be valid JSON conforming to output_schema",
      "All required fields must be present and non-null",
      "Numeric confidence/score fields must be between 0 and 1",
      ...constraints.map((c) => `Constraint: ${c}`),
    ],
    successCriteria:
      "Artifact passes mock validation with a score ≥ 80 and fully satisfies the declared output schema.",
  };
}
