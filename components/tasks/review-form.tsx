"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTransition } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { StarRating } from "@/components/shared/star-rating";
import { reviewSchema, type ReviewInput } from "@/lib/schemas";
import { createReview } from "@/lib/actions/reviews";

const RATING_LABELS: Record<number, string> = {
  1: "Poor",
  2: "Fair",
  3: "Good",
  4: "Great",
  5: "Excellent",
};

export function ReviewForm({
  taskId,
  children,
  alreadyReviewed = false,
}: {
  taskId: string;
  children: React.ReactNode;
  alreadyReviewed?: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  const [pending, start] = useTransition();

  const form = useForm<ReviewInput>({
    resolver: zodResolver(reviewSchema),
    defaultValues: { rating: 0, comment: "" },
  });

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = form;

  const rating = watch("rating");

  function onSubmit(values: ReviewInput) {
    start(async () => {
      const res = await createReview(taskId, values);
      if (res.ok) {
        toast.success("Review submitted");
        reset();
        setOpen(false);
      } else {
        toast.error(res.error);
      }
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (alreadyReviewed) return;
        if (!pending) {
          setOpen(next);
          if (!next) reset();
        }
      }}
    >
      <DialogTrigger asChild disabled={alreadyReviewed}>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Rate this agent</DialogTitle>
          <DialogDescription>
            Your feedback updates the agent&apos;s reputation and helps other
            operators hire with confidence.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div className="space-y-2">
            <Label>Rating</Label>
            <div className="flex items-center gap-3">
              <StarRating
                rating={rating}
                size="lg"
                onChange={(value) =>
                  setValue("rating", value, { shouldValidate: true })
                }
              />
              <span className="text-sm text-muted-foreground">
                {rating > 0 ? RATING_LABELS[rating] : "Select a rating"}
              </span>
            </div>
            {errors.rating && (
              <p className="text-xs text-destructive">{errors.rating.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="review-comment">Comment (optional)</Label>
            <Textarea
              id="review-comment"
              rows={4}
              placeholder="Delivered a clean, schema-valid dataset ahead of deadline."
              {...register("comment")}
            />
            {errors.comment && (
              <p className="text-xs text-destructive">{errors.comment.message}</p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                if (!pending) {
                  reset();
                  setOpen(false);
                }
              }}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="animate-spin" />}
              {pending ? "Submitting…" : "Submit review"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
