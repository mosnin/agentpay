import { FileCode2, ShieldCheck, Target } from "lucide-react";
import { JsonViewer } from "@/components/shared/json-viewer";
import { Badge } from "@/components/ui/badge";
import { PAYMENT_MODES } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface ContractLike {
  title?: string;
  inputPayload?: unknown;
  outputSchema?: unknown;
  validationRules?: unknown;
  successCriteria?: string | null;
  paymentMode?: string | null;
  contractHash?: string | null;
}

function renderValidationRules(rules: unknown) {
  if (!rules) return null;
  if (Array.isArray(rules)) {
    return (
      <ul className="space-y-1.5">
        {rules.map((r, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
            <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
            <span>{String(r)}</span>
          </li>
        ))}
      </ul>
    );
  }
  if (typeof rules === "object" && rules !== null && "rules" in (rules as object)) {
    const value = (rules as { rules: unknown }).rules;
    return <p className="text-sm text-muted-foreground">{String(value)}</p>;
  }
  return <JsonViewer data={rules} title="validation_rules" />;
}

export function TaskContractPreview({
  contract,
  className,
}: {
  contract: ContractLike;
  className?: string;
}) {
  const paymentLabel = PAYMENT_MODES.find((m) => m.value === contract.paymentMode)?.label;

  return (
    <div className={cn("space-y-5", className)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <FileCode2 className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold text-foreground">
            {contract.title ?? "Task contract"}
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          {paymentLabel && <Badge variant="secondary">{paymentLabel}</Badge>}
          {contract.contractHash && (
            <span className="break-all font-mono text-muted-foreground">{contract.contractHash}</span>
          )}
        </div>
      </div>

      {contract.inputPayload != null && (
        <div className="space-y-2">
          <h4 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Input payload
          </h4>
          <JsonViewer data={contract.inputPayload} title="input_payload" />
        </div>
      )}

      {contract.outputSchema != null && (
        <div className="space-y-2">
          <h4 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Output schema
          </h4>
          <JsonViewer data={contract.outputSchema} title="output_schema" />
        </div>
      )}

      {contract.validationRules != null && (
        <div className="space-y-2">
          <h4 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Validation rules
          </h4>
          {renderValidationRules(contract.validationRules)}
        </div>
      )}

      {contract.successCriteria && (
        <div className="flex items-start gap-2 rounded-lg border border-border/60 bg-muted/20 p-3">
          <Target className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <div>
            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Success criteria
            </div>
            <p className="mt-1 text-sm text-foreground">{contract.successCriteria}</p>
          </div>
        </div>
      )}
    </div>
  );
}
