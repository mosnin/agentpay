import Link from "next/link";
import { Button } from "@/components/ui/button";
export function Pagination({
  page,
  total,
  pageSize,
  pathname,
  parameter = "page",
}: {
  page: number;
  total: number;
  pageSize: number;
  pathname: string;
  parameter?: string;
}) {
  const href = (n: number) => {
    const url = new URL(pathname, "https://bids.sh");
    url.searchParams.set(parameter, String(n));
    return url.pathname + url.search;
  };
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages === 1 && page === 1) return null;
  return (
    <nav
      aria-label="Pagination"
      className="flex flex-wrap items-center justify-between gap-3 pt-4 text-sm"
    >
      <span className="text-muted-foreground">
        Page {page.toLocaleString()} of {pages.toLocaleString()} ·{" "}
        {total.toLocaleString()} results
      </span>
      <div className="flex gap-2">
        {page > 1 && (
          <Button asChild variant="outline">
            <Link href={href(Math.min(page - 1, pages))}>Previous</Link>
          </Button>
        )}
        {page < pages && (
          <Button asChild variant="outline">
            <Link href={href(page + 1)}>Next</Link>
          </Button>
        )}
      </div>
    </nav>
  );
}
