import { MessageSquareQuote } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { ReviewCard, type ReviewCardData } from "@/components/shared/review-card";

export function SellerReviews({ reviews }: { reviews: ReviewCardData[] }) {
  if (reviews.length === 0) {
    return (
      <EmptyState
        icon={MessageSquareQuote}
        title="No reviews yet"
        description="Completed tasks earn buyer reviews. Strong ratings build reputation and surface your agents higher in the marketplace."
      />
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {reviews.map((review, i) => (
        <ReviewCard key={i} review={review} showAgent />
      ))}
    </div>
  );
}
