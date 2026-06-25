import { PrismaClient, type Agent } from "@prisma/client";

const prisma = new PrismaClient();

// --- local helpers (no @/ alias under tsx) ---------------------------------
function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
function hashString(input: string) {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}
function mockHash(prefix: string, seed: string) {
  const a = hashString(seed).toString(16).padStart(8, "0");
  const b = hashString(seed.split("").reverse().join("")).toString(16).padStart(8, "0");
  return `${prefix}_${a}${b}`;
}
function daysAgo(n: number, hour = 12) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(hour, 0, 0, 0);
  return d;
}

async function main() {
  console.log("🌱 Seeding Agent Market…");

  // Clear (respect FK order)
  await prisma.reputationEvent.deleteMany();
  await prisma.review.deleteMany();
  await prisma.dispute.deleteMany();
  await prisma.artifact.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.taskContract.deleteMany();
  await prisma.task.deleteMany();
  await prisma.agentCapability.deleteMany();
  await prisma.capability.deleteMany();
  await prisma.agent.deleteMany();
  await prisma.user.deleteMany();
  await prisma.organization.deleteMany();

  // --- Organizations -------------------------------------------------------
  const northwind = await prisma.organization.create({
    data: { name: "Northwind Labs", slug: "northwind-labs", description: "Autonomous growth & ops agents." },
  });
  const helix = await prisma.organization.create({
    data: { name: "Helix Systems", slug: "helix-systems", description: "Engineering & security agents." },
  });
  const vertex = await prisma.organization.create({
    data: { name: "Vertex AI Collective", slug: "vertex-ai-collective", description: "Research & data agents." },
  });

  // --- Users ---------------------------------------------------------------
  const ada = await prisma.user.create({
    data: { email: "operator@agentmarket.dev", name: "Ada Operator", role: "operator", organizationId: northwind.id },
  });
  const leo = await prisma.user.create({
    data: { email: "leo@helix.dev", name: "Leo Tran", role: "operator", organizationId: helix.id },
  });
  const priya = await prisma.user.create({
    data: { email: "priya@vertex.ai", name: "Priya Shah", role: "operator", organizationId: vertex.id },
  });

  // --- Capabilities --------------------------------------------------------
  const capabilityCache = new Map<string, string>();
  async function ensureCapability(name: string, category: string) {
    const slug = slugify(name);
    if (capabilityCache.has(slug)) return capabilityCache.get(slug)!;
    const cap = await prisma.capability.create({
      data: { name, slug, category, description: `${name} capability` },
    });
    capabilityCache.set(slug, cap.id);
    return cap.id;
  }

  // --- Agents --------------------------------------------------------------
  type AgentSpec = {
    name: string;
    category: string;
    capabilities: string[];
    startingPrice: number;
    reputationScore: number;
    ownerId: string;
    organizationId: string;
    verified: boolean;
    averageRating: number;
    completionRate: number;
    averageLatencyMinutes: number;
    schemaComplianceScore: number;
    disputeRate: number;
    totalTasksCompleted: number;
    pricingModel: "per_task" | "subscription" | "bounty" | "hourly";
    short: string;
    long: string;
  };

  const agentSpecs: AgentSpec[] = [
    {
      name: "Growth Research Agent", category: "Growth",
      capabilities: ["lead research", "competitor mapping", "market scan"],
      startingPrice: 25, reputationScore: 94, ownerId: ada.id, organizationId: northwind.id, verified: true,
      averageRating: 4.9, completionRate: 0.98, averageLatencyMinutes: 14, schemaComplianceScore: 97, disputeRate: 0.01, totalTasksCompleted: 312,
      pricingModel: "per_task",
      short: "Finds qualified leads, maps competitors, and scans markets with cited sources.",
      long: "The Growth Research Agent runs structured discovery across the public web and private data sources to build enriched lead lists, competitor matrices, and market landscape briefs. Every output ships with confidence scores and source provenance so downstream agents can trust the data.",
    },
    {
      name: "Code Review Agent", category: "Coding",
      capabilities: ["code review", "test generation", "bug detection"],
      startingPrice: 15, reputationScore: 91, ownerId: leo.id, organizationId: helix.id, verified: true,
      averageRating: 4.8, completionRate: 0.96, averageLatencyMinutes: 9, schemaComplianceScore: 95, disputeRate: 0.02, totalTasksCompleted: 528,
      pricingModel: "per_task",
      short: "Reviews diffs, writes tests, and flags bugs with severity-ranked findings.",
      long: "The Code Review Agent ingests a diff or repository, performs static and semantic analysis, and returns ranked findings with suggested fixes plus generated unit tests. It is tuned for high precision to keep false positives low in automated CI pipelines.",
    },
    {
      name: "SEO Audit Agent", category: "Growth",
      capabilities: ["technical SEO", "content gap analysis", "metadata generation"],
      startingPrice: 20, reputationScore: 88, ownerId: ada.id, organizationId: northwind.id, verified: true,
      averageRating: 4.7, completionRate: 0.95, averageLatencyMinutes: 22, schemaComplianceScore: 92, disputeRate: 0.02, totalTasksCompleted: 187,
      pricingModel: "per_task",
      short: "Audits technical SEO, finds content gaps, and generates optimized metadata.",
      long: "The SEO Audit Agent crawls a site, surfaces technical issues (Core Web Vitals, indexability, schema markup), benchmarks content against competitors, and produces ready-to-ship metadata. Results are prioritized by estimated traffic impact.",
    },
    {
      name: "Data Cleaning Agent", category: "Data",
      capabilities: ["CSV cleanup", "deduplication", "schema mapping"],
      startingPrice: 10, reputationScore: 86, ownerId: priya.id, organizationId: vertex.id, verified: false,
      averageRating: 4.6, completionRate: 0.94, averageLatencyMinutes: 7, schemaComplianceScore: 90, disputeRate: 0.03, totalTasksCompleted: 421,
      pricingModel: "per_task",
      short: "Normalizes messy CSVs, removes duplicates, and maps to your target schema.",
      long: "The Data Cleaning Agent handles the unglamorous-but-critical work of turning messy spreadsheets into clean, typed, deduplicated datasets that conform to a target schema. It reports a per-column quality score and a changelog of every transformation applied.",
    },
    {
      name: "Security Scan Agent", category: "Security",
      capabilities: ["dependency audit", "secret detection", "vulnerability report"],
      startingPrice: 35, reputationScore: 92, ownerId: leo.id, organizationId: helix.id, verified: true,
      averageRating: 4.85, completionRate: 0.97, averageLatencyMinutes: 18, schemaComplianceScore: 96, disputeRate: 0.01, totalTasksCompleted: 264,
      pricingModel: "per_task",
      short: "Audits dependencies, detects leaked secrets, and ships a prioritized risk report.",
      long: "The Security Scan Agent inspects a codebase or dependency manifest for known CVEs, leaked credentials, and risky patterns. It returns a CVSS-ranked report with remediation steps and a machine-readable SBOM delta.",
    },
    {
      name: "Research Synthesis Agent", category: "Research",
      capabilities: ["source gathering", "citations", "executive brief"],
      startingPrice: 30, reputationScore: 90, ownerId: priya.id, organizationId: vertex.id, verified: true,
      averageRating: 4.8, completionRate: 0.96, averageLatencyMinutes: 26, schemaComplianceScore: 94, disputeRate: 0.02, totalTasksCompleted: 156,
      pricingModel: "per_task",
      short: "Gathers sources, synthesizes findings, and writes a cited executive brief.",
      long: "The Research Synthesis Agent runs multi-source research, cross-checks claims, and produces an executive brief with inline citations and a confidence-rated key-findings list. Built for analysts who need defensible, source-backed conclusions.",
    },
    {
      name: "Landing Page Critique Agent", category: "Design",
      capabilities: ["UX audit", "conversion review", "copy critique"],
      startingPrice: 18, reputationScore: 84, ownerId: ada.id, organizationId: northwind.id, verified: false,
      averageRating: 4.5, completionRate: 0.92, averageLatencyMinutes: 16, schemaComplianceScore: 88, disputeRate: 0.04, totalTasksCompleted: 98,
      pricingModel: "per_task",
      short: "Audits UX, reviews conversion funnels, and critiques landing-page copy.",
      long: "The Landing Page Critique Agent evaluates a page against conversion best-practices, accessibility heuristics, and messaging clarity. It returns prioritized, screenshot-anchored recommendations with an estimated conversion-lift score.",
    },
    {
      name: "CRM Update Agent", category: "Operations",
      capabilities: ["CRM sync", "lead routing", "data entry"],
      startingPrice: 8, reputationScore: 82, ownerId: leo.id, organizationId: helix.id, verified: false,
      averageRating: 4.4, completionRate: 0.91, averageLatencyMinutes: 5, schemaComplianceScore: 86, disputeRate: 0.03, totalTasksCompleted: 640,
      pricingModel: "per_task",
      short: "Keeps your CRM clean: syncs records, routes leads, and handles data entry.",
      long: "The CRM Update Agent connects to your CRM, reconciles duplicate and stale records, routes inbound leads by your rules, and performs structured data entry. It is the high-volume back-office workhorse of the marketplace.",
    },
    {
      name: "Support Triage Agent", category: "Customer Support",
      capabilities: ["ticket classification", "response drafting", "sentiment tagging"],
      startingPrice: 12, reputationScore: 87, ownerId: priya.id, organizationId: vertex.id, verified: true,
      averageRating: 4.7, completionRate: 0.95, averageLatencyMinutes: 4, schemaComplianceScore: 91, disputeRate: 0.02, totalTasksCompleted: 503,
      pricingModel: "subscription",
      short: "Classifies tickets, tags sentiment, and drafts on-brand responses.",
      long: "The Support Triage Agent reads inbound tickets, classifies and prioritizes them, tags sentiment, and drafts responses that match your tone guidelines. It hands off cleanly to humans for anything outside its confidence threshold.",
    },
    {
      name: "Financial Analysis Agent", category: "Finance",
      capabilities: ["transaction categorization", "cash flow report", "variance analysis"],
      startingPrice: 28, reputationScore: 89, ownerId: ada.id, organizationId: northwind.id, verified: true,
      averageRating: 4.8, completionRate: 0.96, averageLatencyMinutes: 19, schemaComplianceScore: 93, disputeRate: 0.02, totalTasksCompleted: 211,
      pricingModel: "per_task",
      short: "Categorizes transactions and produces cash-flow and variance reports.",
      long: "The Financial Analysis Agent ingests transaction data, categorizes it against your chart of accounts, and produces cash-flow statements and budget-vs-actual variance analysis with narrative explanations of the largest swings.",
    },
    {
      name: "Infra Monitor Agent", category: "Infrastructure",
      capabilities: ["uptime checks", "log summary", "incident report"],
      startingPrice: 22, reputationScore: 85, ownerId: leo.id, organizationId: helix.id, verified: false,
      averageRating: 4.5, completionRate: 0.93, averageLatencyMinutes: 3, schemaComplianceScore: 89, disputeRate: 0.03, totalTasksCompleted: 372,
      pricingModel: "subscription",
      short: "Runs uptime checks, summarizes logs, and writes incident reports.",
      long: "The Infra Monitor Agent watches endpoints and log streams, detects anomalies, and produces concise incident reports with timelines and probable-cause analysis. Designed to be the first responder that pages a human only when needed.",
    },
    {
      name: "Outbound Personalization Agent", category: "Growth",
      capabilities: ["cold email personalization", "prospect research", "sequence generation"],
      startingPrice: 16, reputationScore: 93, ownerId: ada.id, organizationId: northwind.id, verified: true,
      averageRating: 4.85, completionRate: 0.97, averageLatencyMinutes: 11, schemaComplianceScore: 95, disputeRate: 0.01, totalTasksCompleted: 289,
      pricingModel: "per_task",
      short: "Researches prospects and writes personalized cold-email sequences.",
      long: "The Outbound Personalization Agent researches each prospect, identifies relevant hooks, and generates multi-step email sequences personalized at scale. Output includes per-contact rationale so revops teams can audit quality.",
    },
  ];

  const agents: Agent[] = [];
  for (const spec of agentSpecs) {
    const capIds: string[] = [];
    for (const cap of spec.capabilities) {
      capIds.push(await ensureCapability(cap, spec.category));
    }
    const agent = await prisma.agent.create({
      data: {
        name: spec.name,
        slug: slugify(spec.name),
        shortDescription: spec.short,
        longDescription: spec.long,
        category: spec.category,
        status: "active",
        verified: spec.verified,
        endpointUrl: `https://api.agentmarket.dev/agents/${slugify(spec.name)}/invoke`,
        mcpServerUrl: spec.verified ? `https://mcp.agentmarket.dev/${slugify(spec.name)}` : null,
        pricingModel: spec.pricingModel,
        startingPrice: spec.startingPrice,
        currency: "USD",
        averageRating: spec.averageRating,
        reputationScore: spec.reputationScore,
        completionRate: spec.completionRate,
        averageLatencyMinutes: spec.averageLatencyMinutes,
        schemaComplianceScore: spec.schemaComplianceScore,
        disputeRate: spec.disputeRate,
        totalTasksCompleted: spec.totalTasksCompleted,
        inputSchema: {
          objective: "string",
          constraints: "string[]",
          context: "object",
        },
        outputSchema: {
          result: "object",
          summary: "string",
          confidence: "number",
        },
        ownerId: spec.ownerId,
        organizationId: spec.organizationId,
        capabilities: { create: capIds.map((capabilityId) => ({ capabilityId })) },
      },
    });
    agents.push(agent);
  }

  const A = (i: number) => agents[i];

  // --- Tasks ---------------------------------------------------------------
  type TaskSpec = {
    title: string;
    objective: string;
    agentIndex: number;
    buyerId: string;
    status: string;
    budget: number;
    paymentMode: "mock_escrow" | "pay_per_task" | "subscription_access" | "bounty";
    createdDaysAgo: number;
    withArtifact?: "pending" | "passed" | "failed";
    review?: { rating: number; comment: string; byId: string };
    dispute?: { reason: string; byId: string };
  };

  const taskSpecs: TaskSpec[] = [
    {
      title: "Enrich 500 Shopify leads with founder emails",
      objective: "Enrich 500 Shopify store leads with verified founder emails and company domains, returning a confidence score per record.",
      agentIndex: 0, buyerId: leo.id, status: "completed", budget: 25, paymentMode: "mock_escrow", createdDaysAgo: 12,
      withArtifact: "passed", review: { rating: 5, comment: "Clean data, every founder email verified. Exactly the schema we asked for.", byId: leo.id },
    },
    {
      title: "Review authentication refactor PR #412",
      objective: "Review the authentication refactor diff for security issues and generate regression tests for the new session logic.",
      agentIndex: 1, buyerId: ada.id, status: "completed", budget: 15, paymentMode: "mock_escrow", createdDaysAgo: 10,
      withArtifact: "passed", review: { rating: 5, comment: "Caught a token-fixation bug we missed. Tests merged as-is.", byId: ada.id },
    },
    {
      title: "Quarterly variance analysis for FY budget",
      objective: "Categorize Q3 transactions and produce a budget-vs-actual variance report with narrative on the top 5 swings.",
      agentIndex: 9, buyerId: leo.id, status: "completed", budget: 28, paymentMode: "pay_per_task", createdDaysAgo: 8,
      withArtifact: "passed", review: { rating: 4, comment: "Solid analysis. Would love deeper commentary on COGS next time.", byId: leo.id },
    },
    {
      title: "Technical SEO audit for marketing site",
      objective: "Audit the marketing site for technical SEO issues and produce optimized metadata for the top 20 pages.",
      agentIndex: 2, buyerId: priya.id, status: "completed", budget: 20, paymentMode: "mock_escrow", createdDaysAgo: 6,
      withArtifact: "passed", review: { rating: 5, comment: "Prioritized by traffic impact — very actionable.", byId: priya.id },
    },
    {
      title: "Dependency & secret audit before launch",
      objective: "Run a full dependency vulnerability audit and secret scan across the monorepo and produce a prioritized risk report.",
      agentIndex: 4, buyerId: ada.id, status: "validating", budget: 35, paymentMode: "mock_escrow", createdDaysAgo: 2,
      withArtifact: "pending",
    },
    {
      title: "Clean and dedupe Q2 event leads CSV",
      objective: "Normalize the Q2 event leads CSV, remove duplicates, and map to our HubSpot import schema.",
      agentIndex: 3, buyerId: ada.id, status: "submitted", budget: 10, paymentMode: "mock_escrow", createdDaysAgo: 3,
      withArtifact: "pending",
    },
    {
      title: "Competitive landscape brief: AI observability",
      objective: "Produce a cited executive brief on the AI observability market: top players, positioning, and pricing.",
      agentIndex: 5, buyerId: ada.id, status: "running", budget: 30, paymentMode: "mock_escrow", createdDaysAgo: 1,
    },
    {
      title: "Personalized outbound sequence for 50 prospects",
      objective: "Research 50 named prospects and generate a 4-step personalized cold-email sequence for each.",
      agentIndex: 11, buyerId: priya.id, status: "accepted", budget: 16, paymentMode: "mock_escrow", createdDaysAgo: 1,
    },
    {
      title: "Market scan: vertical SaaS in logistics",
      objective: "Scan the vertical-SaaS logistics market and return a ranked list of 30 companies with funding and ICP fit.",
      agentIndex: 0, buyerId: priya.id, status: "pending", budget: 25, paymentMode: "bounty", createdDaysAgo: 0,
    },
    {
      title: "Conversion review of pricing page",
      objective: "Audit the pricing page for conversion blockers and critique the copy with prioritized recommendations.",
      agentIndex: 6, buyerId: priya.id, status: "disputed", budget: 18, paymentMode: "mock_escrow", createdDaysAgo: 5,
      withArtifact: "failed", dispute: { reason: "Recommendations were generic and didn't reflect our actual funnel data.", byId: priya.id },
    },
    {
      title: "Sync and route inbound demo requests",
      objective: "Sync this week's inbound demo requests into the CRM and route them by territory rules.",
      agentIndex: 7, buyerId: ada.id, status: "cancelled", budget: 8, paymentMode: "mock_escrow", createdDaysAgo: 7,
    },
    {
      title: "Draft triage playbook for support backlog",
      objective: "Classify the current support backlog, tag sentiment, and draft responses for the top 40 tickets.",
      agentIndex: 8, buyerId: ada.id, status: "draft", budget: 12, paymentMode: "subscription_access", createdDaysAgo: 0,
    },
  ];

  let createdTasks = 0;
  for (const t of taskSpecs) {
    const agent = A(t.agentIndex);
    const created = daysAgo(t.createdDaysAgo);
    const paymentStatus =
      t.status === "completed" ? "released"
      : t.status === "cancelled" ? "refunded"
      : t.status === "draft" ? "pending"
      : "escrowed";

    const task = await prisma.task.create({
      data: {
        title: t.title,
        objective: t.objective,
        category: agent.category,
        status: t.status as never,
        visibility: "public",
        budget: t.budget,
        currency: "USD",
        deadline: daysAgo(t.createdDaysAgo - 7),
        buyerId: t.buyerId,
        sellerAgentId: agent.id,
        createdAt: created,
        updatedAt: created,
        contract: {
          create: {
            inputPayload: { objective: t.objective, instructions: "Follow the output schema exactly.", data_url: null },
            outputSchema: { result: "object", summary: "string", confidence: "number" },
            validationRules: { rules: "Output must be valid JSON and satisfy the output schema; confidence in [0,1]." },
            paymentMode: t.paymentMode,
            successCriteria: "Artifact passes validation (score ≥ 80) and satisfies the output schema.",
            contractHash: mockHash("contract", t.title),
          },
        },
        payment: {
          create: {
            amount: t.budget,
            currency: "USD",
            status: paymentStatus as never,
            mode: t.paymentMode,
            provider: "x402_mock",
            transactionHash: paymentStatus === "released" ? mockHash("0xtx", task_id_seed(t.title)) : null,
          },
        },
      },
    });
    createdTasks++;

    if (t.withArtifact) {
      const score = t.withArtifact === "passed" ? 88 + (hashString(t.title) % 10) : t.withArtifact === "failed" ? 72 : null;
      await prisma.artifact.create({
        data: {
          taskId: task.id,
          title: `${agent.name} — deliverable`,
          type: "json",
          content: JSON.stringify(
            { summary: `Completed: ${t.title}`, result: { items: 42 }, confidence: 0.92 },
            null,
            2,
          ),
          validationStatus: (t.withArtifact === "pending" ? "pending" : t.withArtifact) as never,
          validationScore: score ?? undefined,
          createdAt: daysAgo(t.createdDaysAgo - 1),
        },
      });
    }

    if (t.review) {
      await prisma.review.create({
        data: {
          taskId: task.id,
          agentId: agent.id,
          userId: t.review.byId,
          rating: t.review.rating,
          comment: t.review.comment,
          createdAt: daysAgo(t.createdDaysAgo - 2),
        },
      });
    }

    if (t.dispute) {
      await prisma.dispute.create({
        data: {
          taskId: task.id,
          openedById: t.dispute.byId,
          reason: t.dispute.reason,
          status: "open",
          createdAt: daysAgo(t.createdDaysAgo - 1),
        },
      });
    }

    // Reputation events tied to lifecycle
    if (t.status === "completed") {
      await prisma.reputationEvent.create({
        data: { agentId: agent.id, taskId: task.id, type: "task_completed", scoreDelta: 2, reason: "Task completed", createdAt: daysAgo(t.createdDaysAgo - 2) },
      });
      if (t.review) {
        await prisma.reputationEvent.create({
          data: {
            agentId: agent.id, taskId: task.id,
            type: t.review.rating >= 4 ? "positive_review" : "negative_review",
            scoreDelta: t.review.rating >= 4 ? 3 : -3,
            reason: `${t.review.rating}★ review`,
            createdAt: daysAgo(t.createdDaysAgo - 2, 14),
          },
        });
      }
    }
    if (t.dispute) {
      await prisma.reputationEvent.create({
        data: { agentId: agent.id, taskId: task.id, type: "dispute_opened", scoreDelta: -6, reason: "Dispute opened", createdAt: daysAgo(t.createdDaysAgo - 1) },
      });
    }
  }

  // Standalone reputation events (verification + schema compliance) for trend
  for (let i = 0; i < agents.length; i++) {
    const agent = agents[i];
    if (agent.verified) {
      await prisma.reputationEvent.create({
        data: { agentId: agent.id, type: "verification", scoreDelta: 4, reason: "Agent passed verification", createdAt: daysAgo(13) },
      });
    }
    await prisma.reputationEvent.create({
      data: { agentId: agent.id, type: "schema_compliance", scoreDelta: 1, reason: "Schema compliance check", createdAt: daysAgo(9 - (i % 5)) },
    });
    await prisma.reputationEvent.create({
      data: { agentId: agent.id, type: "sla_met", scoreDelta: 1, reason: "SLA met", createdAt: daysAgo(4 - (i % 4)) },
    });
  }

  console.log(`✅ Seeded ${agents.length} agents, ${createdTasks} tasks, ${capabilityCache.size} capabilities, 3 orgs, 3 users.`);
}

function task_id_seed(title: string) {
  return `task:${slugify(title)}`;
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
