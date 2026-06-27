import { ExternalLink, FileText, Package } from "lucide-react";
import { ValidationStatusBadge } from "@/components/shared/status-badge";
import { JsonViewer } from "@/components/shared/json-viewer";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { cn, formatDateTime, safeJsonParse } from "@/lib/utils";
import { PASS_THRESHOLD } from "@/lib/mockValidation";

interface ArtifactLike {
  id: string;
  title: string;
  type: string;
  url: string | null;
  content: string | null;
  validationStatus: string;
  validationScore: number | null;
  createdAt: Date | string;
}

function scoreTone(score: number) {
  if (score >= 80) return "[&>div]:bg-emerald-500";
  if (score >= 50) return "[&>div]:bg-amber-500";
  return "[&>div]:bg-red-500";
}

export function ArtifactCard({ artifact }: { artifact: ArtifactLike }) {
  const score =
    typeof artifact.validationScore === "number"
      ? artifact.validationScore
      : null;
  const parsed = artifact.content ? safeJsonParse(artifact.content) : null;
  const isJson = parsed !== null && typeof parsed === "object";

  return (
    <div className="rounded-xl border border-border/60 bg-card/40 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-muted/40 text-muted-foreground">
            <Package className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="truncate text-sm font-medium text-foreground">
                {artifact.title}
              </span>
              <Badge variant="outline" className="font-mono text-[10px] uppercase">
                {artifact.type}
              </Badge>
            </div>
            <div className="mt-0.5 text-xs text-muted-foreground">
              Submitted {formatDateTime(artifact.createdAt)}
            </div>
          </div>
        </div>
        <ValidationStatusBadge status={artifact.validationStatus} />
      </div>

      {score !== null && (
        <div className="mt-4 space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Validation score</span>
            <span className="font-medium text-foreground">{score}/100</span>
          </div>
          <Progress
            value={score}
            className={cn("h-1.5 bg-muted", scoreTone(score))}
          />
          {(artifact.validationStatus === "passed" ||
            artifact.validationStatus === "failed") && (
            <p className="text-xs text-muted-foreground">
              {artifact.validationStatus === "passed"
                ? `Meets the ${PASS_THRESHOLD}/100 pass threshold.`
                : `Below the ${PASS_THRESHOLD}/100 pass threshold.`}
            </p>
          )}
        </div>
      )}

      {artifact.url && (
        <a
          href={artifact.url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex max-w-full items-center gap-1.5 truncate rounded text-xs font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ExternalLink className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{artifact.url}</span>
        </a>
      )}

      {artifact.content && (
        <div className="mt-3">
          {isJson ? (
            <JsonViewer
              data={parsed}
              title={`${artifact.type}_artifact`}
              maxHeight
            />
          ) : (
            <div className="rounded-lg border border-border/60 bg-code p-3">
              <div className="mb-1.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <FileText className="h-3 w-3" />
                preview
              </div>
              <p className="max-h-48 overflow-auto whitespace-pre-wrap break-words text-xs leading-relaxed text-foreground/90">
                {artifact.content}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
