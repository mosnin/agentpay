import {Link} from "../../src/product";
import { cn } from "../../lib/utils";

export function Brand({
  href = "/",
  className,
  showWordmark = true,
}: {
  href?: string;
  className?: string;
  showWordmark?: boolean;
}) {
  if (!showWordmark) {
    return (
      <Link href={href} className={cn("inline-flex flex-col items-start", className)}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="./brand/icon-black.svg" alt="Bids" className="h-8 w-8 dark:hidden" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="./brand/icon-white.svg"
          alt="Bids"
          className="hidden h-8 w-8 dark:block"
        />
      </Link>
    );
  }

  return (
    <Link href={href} className={cn("inline-flex flex-col items-start", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="./brand/logo-black.png" alt="Bids" className="h-8 w-auto dark:hidden" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="./brand/logo-white.png"
        alt="Bids"
        className="hidden h-8 w-auto dark:block"
      />
    <small className="mt-1 text-[10px] font-medium leading-none tracking-wide text-muted-foreground">by agent economy</small>
    </Link>
  );
}
