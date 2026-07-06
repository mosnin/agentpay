// Central catalog of marketplace taxonomy + status display config.
// Icons are referenced by lucide-react name (string) and resolved by
// components/shared/category-icon.tsx so this file stays serializable.

export type StatusConfig = {
  label: string;
  description?: string;
  /** Tailwind classes for a badge surface (border + bg + text). */
  className: string;
  /** Tailwind class for a small status dot. */
  dot: string;
};

export const CATEGORIES = [
  { value: "Growth", label: "Growth", icon: "TrendingUp", description: "Demand gen, outbound, and pipeline." },
  { value: "Research", label: "Research", icon: "Microscope", description: "Synthesis, briefs, and citations." },
  { value: "Coding", label: "Coding", icon: "Code2", description: "Review, tests, and bug detection." },
  { value: "Data", label: "Data", icon: "Database", description: "Cleaning, mapping, and enrichment." },
  { value: "Design", label: "Design", icon: "Palette", description: "UX audits and conversion review." },
  { value: "Operations", label: "Operations", icon: "Workflow", description: "Back-office automation." },
  { value: "Finance", label: "Finance", icon: "Landmark", description: "Analysis and reconciliation." },
  { value: "Security", label: "Security", icon: "ShieldCheck", description: "Audits and vulnerability scans." },
  { value: "Customer Support", label: "Customer Support", icon: "LifeBuoy", description: "Triage and response drafting." },
  { value: "Infrastructure", label: "Infrastructure", icon: "Server", description: "Monitoring and incident response." },
] as const;

export const CATEGORY_VALUES = CATEGORIES.map((c) => c.value);
export type CategoryValue = (typeof CATEGORIES)[number]["value"];

export const PRICING_MODELS = [
  { value: "per_task", label: "Per task", description: "Flat price per completed task." },
  { value: "subscription", label: "Subscription", description: "Recurring access to the agent." },
  { value: "bounty", label: "Bounty", description: "Pay on accepted result." },
  { value: "hourly", label: "Hourly", description: "Metered by execution time." },
] as const;

export const PAYMENT_MODES = [
  { value: "mock_escrow", label: "Mock escrow", description: "Funds held until validation passes." },
  { value: "pay_per_task", label: "Pay per task", description: "Charged on task creation." },
  { value: "subscription_access", label: "Subscription access", description: "Covered by an active plan." },
  { value: "bounty", label: "Bounty", description: "Released to the first valid artifact." },
] as const;

export const VISIBILITY_OPTIONS = [
  { value: "public", label: "Public", description: "Listed and discoverable." },
  { value: "private", label: "Private", description: "Only you can see it." },
  { value: "unlisted", label: "Unlisted", description: "Reachable by direct link." },
] as const;

/** Task lifecycle in canonical order (used by timeline + progress UI). */
export const TASK_LIFECYCLE = [
  "draft",
  "pending",
  "accepted",
  "running",
  "submitted",
  "validating",
  "completed",
] as const;

export const TASK_STATUS_CONFIG: Record<string, StatusConfig> = {
  draft: { label: "Draft", className: "border-zinc-500/30 bg-zinc-500/10 text-zinc-700 dark:text-zinc-300", dot: "bg-zinc-500 dark:bg-zinc-400" },
  pending: { label: "Pending", className: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300", dot: "bg-amber-500 dark:bg-amber-400" },
  accepted: { label: "Accepted", className: "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300", dot: "bg-blue-500 dark:bg-blue-400" },
  running: { label: "Running", className: "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300", dot: "bg-sky-500 dark:bg-sky-400 animate-pulse" },
  submitted: { label: "Submitted", className: "border-cyan-500/30 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300", dot: "bg-cyan-500 dark:bg-cyan-400" },
  validating: { label: "Validating", className: "border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-300", dot: "bg-violet-500 dark:bg-violet-400 animate-pulse" },
  completed: { label: "Completed", className: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300", dot: "bg-emerald-500 dark:bg-emerald-400" },
  disputed: { label: "Disputed", className: "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300", dot: "bg-red-500 dark:bg-red-400" },
  cancelled: { label: "Cancelled", className: "border-zinc-600/30 bg-zinc-600/10 text-zinc-600 dark:text-zinc-400", dot: "bg-zinc-500" },
};

/**
 * Curated task-status filter buckets — one source of truth for the `/tasks` page
 * pills and the `GET /api/tasks` filter, so the UI and API can't drift.
 */
export const TASK_FILTERS = [
  { key: "all", label: "All" },
  {
    key: "active",
    label: "Active",
    statuses: ["pending", "accepted", "running", "submitted", "validating"],
  },
  { key: "completed", label: "Completed", statuses: ["completed"] },
  { key: "disputed", label: "Disputed", statuses: ["disputed"] },
  { key: "cancelled", label: "Cancelled", statuses: ["cancelled"] },
] as const;

export type TaskFilterKey = (typeof TASK_FILTERS)[number]["key"];

/**
 * Resolve a filter key to the lifecycle statuses to query. Returns `undefined`
 * for "all" (no filter); an unknown key is treated as a raw lifecycle status.
 */
export function statusesForFilter(key?: string): string[] | undefined {
  if (!key || key === "all") return undefined;
  const found = TASK_FILTERS.find((f) => f.key === key);
  if (found && "statuses" in found) return [...found.statuses];
  return [key];
}

/** Human labels for reputation event types — one source for the dashboard feed and admin. */
export const REPUTATION_EVENT_LABELS: Record<string, string> = {
  task_completed: "Task completed",
  positive_review: "Positive review",
  negative_review: "Negative review",
  dispute_opened: "Dispute opened",
  dispute_resolved: "Dispute resolved",
  verification: "Verified",
  schema_compliance: "Schema compliance",
  sla_met: "SLA met",
  sla_missed: "SLA missed",
};

export function reputationEventLabel(type: string): string {
  return (
    REPUTATION_EVENT_LABELS[type] ??
    type.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase())
  );
}

export const PAYMENT_STATUS_CONFIG: Record<string, StatusConfig> = {
  pending: { label: "Pending", className: "border-zinc-500/30 bg-zinc-500/10 text-zinc-700 dark:text-zinc-300", dot: "bg-zinc-500 dark:bg-zinc-400" },
  escrowed: { label: "Escrowed", className: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300", dot: "bg-amber-500 dark:bg-amber-400" },
  released: { label: "Released", className: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300", dot: "bg-emerald-500 dark:bg-emerald-400" },
  refunded: { label: "Refunded", className: "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300", dot: "bg-blue-500 dark:bg-blue-400" },
  failed: { label: "Failed", className: "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300", dot: "bg-red-500 dark:bg-red-400" },
};

export const VALIDATION_STATUS_CONFIG: Record<string, StatusConfig> = {
  pending: { label: "Not validated", className: "border-zinc-500/30 bg-zinc-500/10 text-zinc-700 dark:text-zinc-300", dot: "bg-zinc-500 dark:bg-zinc-400" },
  passed: { label: "Passed", className: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300", dot: "bg-emerald-500 dark:bg-emerald-400" },
  failed: { label: "Failed", className: "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300", dot: "bg-red-500 dark:bg-red-400" },
};

export const AGENT_STATUS_CONFIG: Record<string, StatusConfig> = {
  draft: { label: "Draft", className: "border-zinc-500/30 bg-zinc-500/10 text-zinc-700 dark:text-zinc-300", dot: "bg-zinc-500 dark:bg-zinc-400" },
  active: { label: "Active", className: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300", dot: "bg-emerald-500 dark:bg-emerald-400" },
  paused: { label: "Paused", className: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300", dot: "bg-amber-500 dark:bg-amber-400" },
  suspended: { label: "Suspended", className: "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300", dot: "bg-red-500 dark:bg-red-400" },
};

export const DISPUTE_STATUS_CONFIG: Record<string, StatusConfig> = {
  open: { label: "Open", className: "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300", dot: "bg-red-500 dark:bg-red-400" },
  reviewing: { label: "Reviewing", className: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300", dot: "bg-amber-500 dark:bg-amber-400" },
  resolved: { label: "Resolved", className: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300", dot: "bg-emerald-500 dark:bg-emerald-400" },
  rejected: { label: "Rejected", className: "border-zinc-500/30 bg-zinc-500/10 text-zinc-600 dark:text-zinc-400", dot: "bg-zinc-500" },
};

export const MARKETPLACE_SORTS = [
  { value: "reputation", label: "Top reputation" },
  { value: "rating", label: "Highest rated" },
  { value: "completion", label: "Completion rate" },
  { value: "price_asc", label: "Price: low to high" },
  { value: "price_desc", label: "Price: high to low" },
  { value: "newest", label: "Newest" },
] as const;

export type MarketplaceSort = (typeof MARKETPLACE_SORTS)[number]["value"];

export function getStatusConfig(
  map: Record<string, StatusConfig>,
  key: string | null | undefined,
): StatusConfig {
  if (key && map[key]) return map[key];
  return { label: key ?? "Unknown", className: "border-zinc-500/30 bg-zinc-500/10 text-zinc-700 dark:text-zinc-300", dot: "bg-zinc-500 dark:bg-zinc-400" };
}

export const CURRENCY = "USD";
export const APP_NAME = "Bids";
export const APP_TAGLINE = "The marketplace for autonomous agent labor";
