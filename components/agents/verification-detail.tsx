import {
  ShieldCheck,
  ShieldAlert,
  ShieldQuestion,
  Loader2,
  CheckCircle2,
  XCircle,
  MinusCircle,
  Info,
  type LucideIcon,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/status-badge";
import { isSkippedCheckDetail } from "@/lib/verification";
import { cn, formatRelativeTime, formatDateTime } from "@/lib/utils";
import type { StatusConfig } from "@/lib/constants";

/**
 * Presentational only — no data fetching, no server actions. The integrator
 * mounts this on the agent profile with props read straight off the Agent
 * row (verificationStatus/verified/lastVerifiedAt/verificationError) and its
 * verificationChecks relation (checks). See lib/verification.ts for what
 * actually earns/revokes the badge this renders.
 */

export interface VerificationCheckItem {
  id: string;
  /** "health" | "schema" | "identity" today; kept as `string` so this
   * accepts a raw Prisma VerificationCheck row with no adapter/cast, and
   * so an unrecognized future kind renders (generically) instead of
   * disappearing. */
  kind: string;
  passed: boolean;
  detail: string | null;
  createdAt: Date | string;
}

export interface VerificationDetailProps {
  /** "unverified" | "pending" | "verified" | "failed" (Agent.verificationStatus). */
  verificationStatus: string;
  /** Agent.verified — the effective badge every other surface reads. */
  verified: boolean;
  lastVerifiedAt: Date | string | null;
  error: string | null;
  /** Any number of historical VerificationCheck rows, any order — this
   * component keeps only the most recent row per `kind` itself, so passing
   * either "just the latest run" or a longer history both render correctly. */
  checks: VerificationCheckItem[];
  className?: string;
}

const STATUS_CONFIG: Record<string, StatusConfig> = {
  unverified: {
    label: "Not verified",
    className: "border-zinc-500/30 bg-zinc-500/10 text-zinc-700 dark:text-zinc-300",
    dot: "bg-zinc-500 dark:bg-zinc-400",
  },
  pending: {
    label: "Verifying…",
    className: "border-primary/30 bg-primary/10 text-primary",
    dot: "bg-primary animate-pulse",
  },
  verified: {
    label: "Verified",
    className: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    dot: "bg-emerald-500 dark:bg-emerald-400",
  },
  failed: {
    label: "Failed",
    className: "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300",
    dot: "bg-red-500 dark:bg-red-400",
  },
};

const HEADER_ICON: Record<string, LucideIcon> = {
  unverified: ShieldQuestion,
  pending: Loader2,
  verified: ShieldCheck,
  failed: ShieldAlert,
};

const HEADER_TONE: Record<string, string> = {
  unverified: "text-muted-foreground",
  pending: "text-primary",
  verified: "text-success",
  failed: "text-destructive",
};

const KIND_LABEL: Record<string, string> = {
  health: "Endpoint health",
  schema: "Output schema",
  identity: "Owner identity",
};

const KIND_ORDER = ["health", "schema", "identity"];

/** Most recent row per kind, in canonical order (health, schema, identity),
 * with any other/future kind appended after. Defensive against receiving
 * either just-the-latest-run or a longer history in `checks`. */
function latestPerKind(checks: VerificationCheckItem[]): VerificationCheckItem[] {
  const latest = new Map<string, VerificationCheckItem>();
  for (const check of checks) {
    const existing = latest.get(check.kind);
    if (!existing || new Date(check.createdAt).getTime() > new Date(existing.createdAt).getTime()) {
      latest.set(check.kind, check);
    }
  }
  const ordered = KIND_ORDER.map((kind) => latest.get(kind)).filter(
    (c): c is VerificationCheckItem => Boolean(c),
  );
  const extra = Array.from(latest.values()).filter((c) => !KIND_ORDER.includes(c.kind));
  return [...ordered, ...extra];
}

function buildHeadline(props: {
  verificationStatus: string;
  verified: boolean;
  lastVerifiedAt: Date | string | null;
  error: string | null;
}): string {
  const { verificationStatus, verified, lastVerifiedAt, error } = props;

  if (verificationStatus === "verified" && lastVerifiedAt) {
    return `Verified ${formatRelativeTime(lastVerifiedAt)}.`;
  }
  if (verificationStatus === "pending") {
    return "Verification in progress…";
  }
  if (verificationStatus === "failed") {
    return error ? `Verification failed: ${error}` : "Verification failed.";
  }
  if (verified) {
    // A badge set by the old manual admin toggle, before this agent ever
    // went through the automated program — surfaced honestly rather than
    // implied to be the same thing as an earned "verified" status.
    return "Marked verified — the automated program hasn't run for this agent yet.";
  }
  return "Not yet verified.";
}

function CheckRow({ check }: { check: VerificationCheckItem }) {
  const skipped = isSkippedCheckDetail(check.detail);
  const Icon = skipped ? MinusCircle : check.passed ? CheckCircle2 : XCircle;
  const tone = skipped ? "text-muted-foreground" : check.passed ? "text-success" : "text-destructive";

  return (
    <li className="flex items-start gap-2.5 rounded-lg border border-border/60 bg-muted/20 p-3">
      <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", tone)} aria-hidden />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-0.5">
          <span className="text-sm font-medium text-foreground">
            {KIND_LABEL[check.kind] ?? check.kind}
          </span>
          <span
            className="shrink-0 text-[11px] text-muted-foreground"
            title={formatDateTime(check.createdAt)}
          >
            {formatRelativeTime(check.createdAt)}
          </span>
        </div>
        <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
          {check.detail ?? (check.passed ? "Passed." : "Failed.")}
        </p>
      </div>
    </li>
  );
}

export function VerificationDetail({
  verificationStatus,
  verified,
  lastVerifiedAt,
  error,
  checks,
  className,
}: VerificationDetailProps) {
  const config = STATUS_CONFIG[verificationStatus] ?? STATUS_CONFIG.unverified;
  const StatusIcon = HEADER_ICON[verificationStatus] ?? ShieldQuestion;
  const headerTone = HEADER_TONE[verificationStatus] ?? HEADER_TONE.unverified;
  const headline = buildHeadline({ verificationStatus, verified, lastVerifiedAt, error });
  const visibleChecks = latestPerKind(checks);

  return (
    <Card className={className}>
      <CardHeader className="flex-row items-start justify-between gap-4 space-y-0">
        <div className="space-y-1.5">
          <CardTitle className="flex items-center gap-2 text-base">
            <StatusIcon
              className={cn("h-4 w-4", headerTone, verificationStatus === "pending" && "animate-spin")}
              aria-hidden
            />
            Verification
          </CardTitle>
          <CardDescription>{headline}</CardDescription>
        </div>
        <StatusBadge config={config} />
      </CardHeader>
      <CardContent className="space-y-4">
        {visibleChecks.length > 0 ? (
          <ul className="space-y-2">
            {visibleChecks.map((check) => (
              <CheckRow key={check.id} check={check} />
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">No verification checks have run yet.</p>
        )}

        <div className="flex items-start gap-2 rounded-lg border border-border/60 bg-muted/20 p-3 text-xs leading-relaxed text-muted-foreground">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
          <span>
            Verified is earned automatically — endpoint health, output schema, and owner identity
            are re-checked on a schedule, and the badge is revoked the moment a check stops
            passing.
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
