import Link from "next/link";
import type { TrustDimension, TrustReport as Report } from "@/lib/trust/model";
export function TrustDimensionPanel({ value }: { value: TrustDimension }) {
  return (
    <section
      className="min-w-0 rounded-xl border border-border p-5 sm:p-6"
      aria-label={`${value.role} trust`}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="text-xl font-semibold capitalize">{value.role} trust</h2>
        <span className="text-sm text-muted-foreground">
          {value.confidence} evidence
        </span>
      </div>
      <p className="mt-5 text-3xl font-semibold tabular-nums">
        {value.score === null ? (
          <span className="text-xl">Not enough history</span>
        ) : (
          <>
            {value.score}
            <span className="text-base font-normal text-muted-foreground">
              {" "}
              / 100
            </span>
          </>
        )}
      </p>
      <p className="mt-2 text-sm text-muted-foreground">
        {value.sampleCount} eligible outcomes · {value.counterparties}{" "}
        distinct counterparties · {value.coverage}% metric coverage
      </p>
      <dl className="mt-5 divide-y divide-border">
        {value.metrics.map((m) => (
          <div key={m.key} className="py-4">
            <div className="flex flex-wrap justify-between gap-2">
              <dt className="font-medium">{m.label}</dt>
              <dd className="text-sm tabular-nums">
                {m.rate === null
                  ? "No evidence yet"
                  : `${Math.round(m.rate)}% observed`}{" "}
                · {m.samples} samples
              </dd>
            </div>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              {m.explanation}
            </p>
          </div>
        ))}
      </dl>
    </section>
  );
}
export function TrustReportPanel({ report }: { report: Report }) {
  return (
    <div className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-2">
        <TrustDimensionPanel value={report.buyer} />
        <TrustDimensionPanel value={report.seller} />
      </div>
      <p className="text-sm leading-relaxed text-muted-foreground">
        {report.explanation} Model {report.model}.{" "}
        <Link
          className="underline underline-offset-4"
          href="/trust#methodology"
        >
          Read the methodology
        </Link>
        .
      </p>
    </div>
  );
}
