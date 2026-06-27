import { formatJson, cn } from "@/lib/utils";
import { CopyButton } from "./copy-button";

export function JsonViewer({
  data,
  title = "json",
  className,
  maxHeight = true,
}: {
  data: unknown;
  title?: string;
  className?: string;
  maxHeight?: boolean;
}) {
  const text = typeof data === "string" ? data : formatJson(data);

  return (
    <div
      className={cn(
        "overflow-hidden rounded-lg border border-border/60 bg-code",
        className,
      )}
    >
      <div className="flex items-center justify-between border-b border-border/60 bg-muted/20 px-3 py-2">
        <span className="font-mono text-xs text-muted-foreground">{title}</span>
        <CopyButton value={text} />
      </div>
      <pre
        className={cn(
          "overflow-auto p-4 text-xs leading-relaxed text-foreground/90",
          maxHeight && "max-h-80",
        )}
      >
        <code className="font-mono">{text}</code>
      </pre>
    </div>
  );
}
