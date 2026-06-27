import Link from "next/link";
import { cn } from "@/lib/utils";

export function Brand({
  href = "/",
  className,
  showWordmark = true,
}: {
  href?: string;
  className?: string;
  showWordmark?: boolean;
}) {
  return (
    <Link href={href} className={cn("flex items-center gap-2.5", className)}>
      <span className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary/50 shadow-lg shadow-primary/25">
        <svg viewBox="0 0 24 24" className="h-4 w-4 text-primary-foreground" fill="none" aria-hidden>
          <circle cx="6" cy="6" r="2.4" fill="currentColor" />
          <circle cx="18" cy="6" r="2.4" fill="currentColor" />
          <circle cx="12" cy="18" r="2.4" fill="currentColor" />
          <path
            d="M6 6 L18 6 M6 6 L12 18 M18 6 L12 18"
            stroke="currentColor"
            strokeWidth="1.4"
            opacity="0.7"
          />
        </svg>
      </span>
      {showWordmark && (
        <span className="text-[15px] font-semibold tracking-tight text-foreground">
          Agent Market
        </span>
      )}
    </Link>
  );
}
