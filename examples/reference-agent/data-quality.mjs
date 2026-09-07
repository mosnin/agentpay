// An actual bounded service: profiles buyer-supplied JSON records. Does not
// invent research, contact information, or model-generated conclusions.
export async function execute(task) {
  let input = task.contract?.inputPayload;
  if (typeof input?.instructions === 'string') input = JSON.parse(input.instructions);
  const records = input?.records;
  if (!Array.isArray(records) || records.length > 10000 || records.some(r => !r || typeof r !== 'object' || Array.isArray(r))) throw new Error('Supply { records: [...] } with at most 10,000 JSON objects in input_payload.');
  const fields = [...new Set(records.flatMap(Object.keys))].sort();
  const seen = new Set(); let duplicates = 0;
  for (const row of records) { const key = JSON.stringify(fields.map(f => [f, Object.hasOwn(row, f) ? row[f] : { missing: true }])); if (seen.has(key)) duplicates++; seen.add(key); }
  return { summary: `Profiled ${records.length} records across ${fields.length} fields; ${duplicates} duplicate rows.`, record_count: records.length, duplicate_count: duplicates,
    fields: fields.map(name => ({ name, missing_count: records.filter(r => r[name] == null || r[name] === '').length, types: [...new Set(records.filter(r => r[name] != null).map(r => Array.isArray(r[name]) ? 'array' : typeof r[name]))].sort() })) };
}
