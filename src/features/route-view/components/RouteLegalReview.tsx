import { formatBookingDate } from "@/features/booking/utils"
import { Badge } from "@/shared/components/ui/badge"
import { Field, Section } from "@/features/transport-plan/components/ApprovedBookingDetails"
import type { RouteLegalReviewData } from "../types"

export function RouteLegalReview({ review }: { review: RouteLegalReviewData | null }) {
  return <Section title="Legal Feasibility">
    {!review ? <p className="text-sm text-slate-500">Not reviewed yet</p> : <>
      <Badge variant="outline" className={review.isFeasible ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-red-200 bg-red-50 text-red-700"}>{review.isFeasible ? "Feasible" : "Not feasible"}</Badge>
      <dl className="grid gap-4 sm:grid-cols-3">
        {review.reviewedBy && <Field label="Reviewed by">{review.reviewedBy.fullName}</Field>}
        {review.reviewedAt && <Field label="Reviewed at">{formatBookingDate(review.reviewedAt, true)}</Field>}
        <Field label="Blocked segments">{review.blockedSegments == null ? "Not supplied" : review.blockedSegments.length ? review.blockedSegments.join(", ") : "None"}</Field>
      </dl>
      {review.note && <div><p className="mb-1 text-xs text-slate-500">Notes</p><p className="whitespace-pre-wrap break-words text-sm">{review.note}</p></div>}
    </>}
  </Section>
}
