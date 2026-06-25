import { MessageSquare } from "lucide-react";
import { Card } from "@/components/ui/card";
import { ReviewCard } from "@/components/shared/review-card";
import { StarRating } from "@/components/shared/star-rating";
import { EmptyState } from "@/components/shared/empty-state";
import { formatNumber } from "@/lib/utils";
import type { AgentDetail } from "@/lib/types";

export function AgentReviews({
  reviews,
  averageRating,
  reviewCount,
}: {
  reviews: AgentDetail["reviews"];
  averageRating: number;
  reviewCount: number;
}) {
  if (reviews.length === 0) {
    return (
      <EmptyState
        icon={MessageSquare}
        title="No reviews yet"
        description="Once buyers complete tasks with this agent, their reviews will appear here."
      />
    );
  }

  // Rating distribution (5 → 1)
  const buckets = [5, 4, 3, 2, 1].map((stars) => ({
    stars,
    count: reviews.filter((r) => r.rating === stars).length,
  }));
  const max = Math.max(1, ...buckets.map((b) => b.count));

  return (
    <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
      <Card className="h-fit p-6">
        <div className="flex flex-col items-center gap-1 text-center">
          <div className="text-4xl font-semibold tracking-tight tabular-nums text-foreground">
            {averageRating.toFixed(1)}
          </div>
          <StarRating rating={averageRating} size="md" />
          <div className="mt-1 text-xs text-muted-foreground">
            Based on {formatNumber(reviewCount)} review{reviewCount === 1 ? "" : "s"}
          </div>
        </div>
        <div className="mt-5 space-y-2">
          {buckets.map((b) => (
            <div key={b.stars} className="flex items-center gap-2 text-xs">
              <span className="w-3 tabular-nums text-muted-foreground">{b.stars}</span>
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-amber-400/80"
                  style={{ width: `${(b.count / max) * 100}%` }}
                />
              </div>
              <span className="w-6 text-right tabular-nums text-muted-foreground">{b.count}</span>
            </div>
          ))}
        </div>
      </Card>

      <div className="space-y-3">
        {reviews.map((review) => (
          <ReviewCard key={review.id} review={review} />
        ))}
      </div>
    </div>
  );
}
