import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { StarRating } from "./star-rating";
import { initials, formatRelativeTime, cn } from "@/lib/utils";

export interface ReviewCardData {
  rating: number;
  comment: string | null;
  createdAt: Date | string;
  user: { name: string | null; image: string | null; email: string };
  agent?: { name: string } | null;
}

export function ReviewCard({
  review,
  showAgent = false,
  className,
}: {
  review: ReviewCardData;
  showAgent?: boolean;
  className?: string;
}) {
  const displayName = review.user.name ?? review.user.email;
  return (
    <div className={cn("rounded-xl border border-border/60 bg-card/40 p-4", className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9">
            {review.user.image && <AvatarImage src={review.user.image} alt={displayName} />}
            <AvatarFallback className="bg-muted text-xs">{initials(displayName)}</AvatarFallback>
          </Avatar>
          <div className="leading-tight">
            <div className="text-sm font-medium text-foreground">{displayName}</div>
            <div className="text-xs text-muted-foreground">
              {formatRelativeTime(review.createdAt)}
              {showAgent && review.agent && <span> · reviewed {review.agent.name}</span>}
            </div>
          </div>
        </div>
        <StarRating rating={review.rating} size="sm" />
      </div>
      {review.comment && (
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{review.comment}</p>
      )}
    </div>
  );
}
