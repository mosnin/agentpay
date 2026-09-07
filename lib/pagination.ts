/** Shared, bounded pagination for UI and machine clients. */
export const MAX_PAGE = 10_000;
export const MAX_PAGE_SIZE = 100;
export function pageNumber(value: unknown): number {
  const n = Number(value);
  return Number.isSafeInteger(n) && n > 0 ? Math.min(n, MAX_PAGE) : 1;
}
export function pageSize(value: unknown, fallback = 25): number {
  const n = Number(value);
  return Number.isSafeInteger(n) && n > 0
    ? Math.min(n, MAX_PAGE_SIZE)
    : fallback;
}
export function paginationHeaders(
  url: URL,
  page: number,
  limit: number,
  total: number,
) {
  const pages = Math.max(1, Math.ceil(total / limit));
  const link = (p: number, rel: string) => {
    const next = new URL(url);
    next.searchParams.set("page", String(p));
    next.searchParams.set("limit", String(limit));
    return `<${next.pathname}${next.search}>; rel="${rel}"`;
  };
  return {
    "X-Total-Count": String(total),
    "X-Page": String(page),
    "X-Page-Size": String(limit),
    "Cache-Control": "private, no-store",
    Link: [
      link(1, "first"),
      ...(page > 1 ? [link(page - 1, "prev")] : []),
      ...(page < pages ? [link(page + 1, "next")] : []),
      link(Math.min(pages, MAX_PAGE), "last"),
    ].join(", "),
  };
}
