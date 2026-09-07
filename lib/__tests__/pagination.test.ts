import { expect, it } from "vitest";
import { pageNumber, pageSize, paginationHeaders } from "@/lib/pagination";
it("rejects non-integer and unsafe offsets and caps enumeration cost", () => {
  for (const value of [
    "Infinity",
    "2.5",
    "-3",
    "abc",
    "9007199254740992",
    undefined,
  ])
    expect(pageNumber(value)).toBe(1);
  expect(pageNumber("99999")).toBe(10000);
  expect(pageSize("99999")).toBe(100);
  expect(pageSize("1.5")).toBe(25);
});
it("preserves filters, omits a false next page and never emits a credential-bearing origin", () => {
  const headers = paginationHeaders(
    new URL(
      "https://secret:password@example.com/api/tasks?status=active&role=seller",
    ),
    2,
    25,
    40,
  );
  expect(headers.Link).toContain(
    'status=active&role=seller&page=1&limit=25>; rel="prev"',
  );
  expect(headers.Link).not.toContain('rel="next"');
  expect(headers.Link).not.toContain("password");
  expect(headers["Cache-Control"]).toBe("private, no-store");
  expect(headers["X-Total-Count"]).toBe("40");
});
