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
      {/* bg-code is a fixed dark surface in both themes (Stripe-docs style),
          so its text must be fixed light shades — not theme tokens. */}
      <div className="flex items-center justify-between border-b border-white/10 bg-white/[0.03] px-3 py-2">
        <span className="font-mono text-xs text-zinc-400">{title}</span>
        <CopyButton
          value={text}
          className="border-white/10 bg-white/[0.04] text-zinc-400 hover:bg-white/10 hover:text-zinc-200"
        />
      </div>
      <pre
        className={cn(
          "overflow-auto p-4 text-xs leading-relaxed text-zinc-200",
          maxHeight && "max-h-80",
        )}
      >
        <code className="font-mono">{text}</code>
      </pre>
    </div>
  );
}
