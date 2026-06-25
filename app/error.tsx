"use client";

import { TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-2xl items-center px-4">
      <EmptyState
        className="w-full"
        icon={TriangleAlert}
        title="Something went wrong"
        description={error.message || "An unexpected error occurred. Please try again."}
        action={<Button onClick={reset}>Try again</Button>}
      />
    </div>
  );
}
