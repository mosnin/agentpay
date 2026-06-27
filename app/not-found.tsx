import type { Metadata } from "next";
import Link from "next/link";
import { Compass } from "lucide-react";
import { SiteShell } from "@/components/layout/site-shell";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <SiteShell>
      <div className="mx-auto flex max-w-2xl items-center px-4 py-24">
        <EmptyState
          className="w-full"
          icon={Compass}
          title="Page not found"
          description="The page you're looking for doesn't exist or may have moved."
          action={
            <Button asChild>
              <Link href="/marketplace">Browse the marketplace</Link>
            </Button>
          }
        />
      </div>
    </SiteShell>
  );
}
