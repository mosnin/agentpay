import { z } from "zod";
import { CATEGORY_VALUES } from "./constants";

const categoryEnum = z.enum(CATEGORY_VALUES as [string, ...string[]], {
  errorMap: () => ({ message: "Select a category" }),
});

/** Optional string that, when present, must be valid JSON. */
const jsonString = z
  .string()
  .refine(
    (val) => {
      if (!val || val.trim() === "") return true;
      try {
        JSON.parse(val);
        return true;
      } catch {
        return false;
      }
    },
    { message: "Must be valid JSON" },
  )
  .optional()
  .or(z.literal(""));

const optionalUrl = z
  .string()
  .url("Must be a valid URL")
  .optional()
  .or(z.literal(""));

// ---------------------------------------------------------------------------
// Agent
// ---------------------------------------------------------------------------

export const createAgentSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters").max(80),
  shortDescription: z
    .string()
    .min(10, "Add a short description (10+ chars)")
    .max(180, "Keep the short description under 180 characters"),
  longDescription: z
    .string()
    .min(20, "Describe what this agent does (20+ chars)")
    .max(6000),
  category: categoryEnum,
  capabilities: z
    .array(z.string().min(1))
    .min(1, "Add at least one capability")
    .max(12, "Up to 12 capabilities"),
  pricingModel: z.enum(["per_task", "subscription", "bounty", "hourly"]),
  startingPrice: z.coerce
    .number({ invalid_type_error: "Enter a price" })
    .min(0, "Price must be ≥ 0")
    .max(1_000_000),
  currency: z.string().default("USD"),
  endpointUrl: optionalUrl,
  mcpServerUrl: optionalUrl,
  inputSchema: jsonString,
  outputSchema: jsonString,
  organizationId: z.string().optional(),
  verified: z.boolean().default(false),
});

export type CreateAgentInput = z.infer<typeof createAgentSchema>;

export const updateAgentSchema = createAgentSchema.partial().extend({
  id: z.string().min(1),
});
export type UpdateAgentInput = z.infer<typeof updateAgentSchema>;

// ---------------------------------------------------------------------------
// Task
// ---------------------------------------------------------------------------

export const createTaskSchema = z.object({
  title: z.string().min(3, "Add a title").max(140),
  objective: z.string().min(10, "Describe the objective (10+ chars)").max(6000),
  category: categoryEnum,
  sellerAgentId: z.string().min(1, "Select a target agent"),
  inputInstructions: z.string().max(6000).optional().or(z.literal("")),
  inputDataUrl: optionalUrl,
  expectedOutputFormat: z.string().max(4000).optional().or(z.literal("")),
  budget: z.coerce
    .number({ invalid_type_error: "Enter a budget" })
    .min(0, "Budget must be ≥ 0")
    .max(1_000_000),
  deadline: z.string().optional().or(z.literal("")),
  validationRules: z.string().max(4000).optional().or(z.literal("")),
  paymentMode: z.enum([
    "mock_escrow",
    "pay_per_task",
    "subscription_access",
    "bounty",
  ]),
  visibility: z.enum(["public", "private", "unlisted"]).default("public"),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;

// ---------------------------------------------------------------------------
// Artifact / Review / Dispute
// ---------------------------------------------------------------------------

export const submitArtifactSchema = z.object({
  title: z.string().min(2, "Add an artifact title").max(180),
  type: z
    .enum(["json", "file", "url", "text", "report", "dataset"])
    .default("json"),
  url: optionalUrl,
  content: z.string().max(40000).optional().or(z.literal("")),
});
export type SubmitArtifactInput = z.infer<typeof submitArtifactSchema>;

export const reviewSchema = z.object({
  rating: z.coerce.number().int().min(1, "Pick a rating").max(5),
  comment: z.string().max(2000).optional().or(z.literal("")),
});
export type ReviewInput = z.infer<typeof reviewSchema>;

export const disputeSchema = z.object({
  reason: z.string().min(10, "Explain the issue (10+ chars)").max(2000),
});
export type DisputeInput = z.infer<typeof disputeSchema>;

// ---------------------------------------------------------------------------
// Developer API: POST /api/tasks structured contract
// ---------------------------------------------------------------------------

export const apiCreateTaskSchema = z.object({
  objective: z.string().min(3),
  title: z.string().optional(),
  category: z.string().default("Growth"),
  budget: z.coerce.number().min(0).default(0),
  seller_agent_id: z.string().optional(),
  agent_id: z.string().optional(),
  input_payload: z.record(z.unknown()).optional(),
  output_schema: z.record(z.unknown()).optional(),
  validation_rules: z.record(z.unknown()).optional(),
  payment_mode: z
    .enum(["mock_escrow", "pay_per_task", "subscription_access", "bounty"])
    .default("mock_escrow"),
});
export type ApiCreateTaskInput = z.infer<typeof apiCreateTaskSchema>;
