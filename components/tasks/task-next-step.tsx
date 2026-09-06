import { taskExperience } from "@/lib/task-experience";

export function TaskNextStep({ status }: { status: string }) {
  const step = taskExperience(status);
  return <section aria-label="What happens next" className="mb-6 border-y border-border py-5 sm:py-6">
    <div className="flex flex-wrap items-baseline justify-between gap-2">
      <h2 className="text-xl font-semibold tracking-tight">{step.title}</h2>
      {step.actor && <span className="text-sm text-muted-foreground">Next action: <span className="font-medium text-foreground">{step.actor}</span></span>}
    </div>
    <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">{step.description}</p>
  </section>;
}
