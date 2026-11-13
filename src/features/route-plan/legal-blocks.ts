type ReviewedPlan = {
  updatedAt?: string | null;
  legalReview?: {
    isFeasible: boolean;
    blockedSegments?: number[] | null;
    reviewedAt?: string | null;
  } | null;
};

// The review stamps the plan's updatedAt itself; allow for rounding between the two timestamps.
const REVIEW_STAMP_SLACK_MS = 1000;

/** True when the plan was saved after its latest legal review, so that review no longer describes its segments. */
export function isLegalReviewOutdated(plan: ReviewedPlan): boolean {
  const reviewedAt = plan.legalReview?.reviewedAt ? Date.parse(plan.legalReview.reviewedAt) : NaN;
  const updatedAt = plan.updatedAt ? Date.parse(plan.updatedAt) : NaN;
  return Number.isFinite(reviewedAt) && Number.isFinite(updatedAt) && updatedAt - reviewedAt > REVIEW_STAMP_SLACK_MS;
}

/**
 * Sequence numbers the Transport Specialist blocked in the latest legal review, while they still describe the plan.
 * The backend keeps only sequence numbers and recreates every segment on save, so once the coordinator saves the plan the
 * old numbers point at new segments. They are dropped until the specialist reviews the plan again.
 */
export function currentBlockedSegments(plan: ReviewedPlan): number[] {
  const review = plan.legalReview;
  if (!review || review.isFeasible !== false || !review.blockedSegments?.length) return [];
  return isLegalReviewOutdated(plan) ? [] : review.blockedSegments;
}
