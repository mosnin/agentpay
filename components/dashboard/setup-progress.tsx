import Link from "next/link";
import type { SetupStep } from "@/lib/activation";
import { Button } from "@/components/ui/button";
export function SetupProgress({
  title,
  steps,
}: {
  title: string;
  steps: SetupStep[];
}) {
  const done = steps.filter((s) => s.complete).length;
  return (
    <section aria-label={title} className="border-y py-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
        <p className="text-sm text-muted-foreground">
          {done} of {steps.length} steps complete
        </p>
      </div>
      <ol className="mt-4 divide-y">
        {steps.map((step, i) => (
          <li
            key={step.id}
            className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium">
                {i + 1}. {step.title}
                <span className="ml-2 text-xs font-normal text-muted-foreground">
                  {step.complete ? "Complete" : "Next step"}
                </span>
              </p>
              <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                {step.detail}
              </p>
            </div>
            <Button
              asChild
              variant={step.complete ? "ghost" : "outline"}
              className="self-start sm:shrink-0"
            >
              <Link href={step.href}>
                {step.complete ? "View" : "Continue"}
                <span className="sr-only">: {step.title}</span>
              </Link>
            </Button>
          </li>
        ))}
      </ol>
    </section>
  );
}
