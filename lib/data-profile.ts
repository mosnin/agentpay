/** Bounded, deterministic data quality service. Processes the actual supplied rows. */
export function profileRecords(rows: Record<string, unknown>[]) {
  const keys = [...new Set(rows.flatMap((r) => Object.keys(r)))].sort();
  const seen = new Set<string>();
  let duplicates = 0;
  for (const row of rows) {
    const canonical = JSON.stringify(
      Object.fromEntries(
        Object.entries(row).sort(([a], [b]) => a.localeCompare(b)),
      ),
    );
    if (seen.has(canonical)) duplicates++;
    seen.add(canonical);
  }
  return {
    rowCount: rows.length,
    duplicateRows: duplicates,
    fields: keys.map((name) => ({
      name,
      missing: rows.filter(
        (r) => r[name] === null || r[name] === undefined || r[name] === "",
      ).length,
      types: [
        ...new Set(
          rows
            .filter((r) => r[name] != null)
            .map((r) => (Array.isArray(r[name]) ? "array" : typeof r[name])),
        ),
      ],
    })),
    method:
      "Exact duplicate objects; null, absent and empty strings count as missing.",
    version: 1,
  };
}
