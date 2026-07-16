import { SiteShell } from "@/components/layout/site-shell";

/**
 * Shared frame for legal/policy pages: quiet typographic layout, generous
 * measure, no decoration. The words are the interface here.
 */
export function LegalPage({
  title,
  updated,
  intro,
  children,
}: {
  title: string;
  updated: string;
  intro: string;
  children: React.ReactNode;
}) {
  return (
    <SiteShell>
      <div className="mx-auto w-full max-w-2xl px-4 py-16 sm:px-6 sm:py-20">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Last updated {updated}
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
          {title}
        </h1>
        <p className="mt-4 text-base leading-relaxed text-muted-foreground">{intro}</p>
        <div className="mt-10 space-y-10">{children}</div>
      </div>
    </SiteShell>
  );
}

export function LegalSection({
  heading,
  children,
}: {
  heading: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold tracking-tight text-foreground">{heading}</h2>
      <div className="space-y-3 text-[15px] leading-relaxed text-muted-foreground [&_strong]:font-medium [&_strong]:text-foreground">
        {children}
      </div>
    </section>
  );
}
