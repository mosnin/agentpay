import { TopNav } from "./top-nav";
import { SiteFooter } from "./site-footer";
import { cn } from "@/lib/utils";

export function SiteShell({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <a
        href="#main"
        className="sr-only z-50 focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:rounded-md focus:border focus:border-border focus:bg-background focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-foreground focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-ring"
      >
        Skip to content
      </a>
      <TopNav />
      <main id="main" tabIndex={-1} className={cn("flex-1 focus:outline-none", className)}>
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
