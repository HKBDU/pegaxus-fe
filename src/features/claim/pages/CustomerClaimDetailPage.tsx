import { useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { Button } from "@/shared/components/ui/button"
import { CancelClaimDialog } from "@/features/claim/components/CancelClaimDialog"
import { ClaimProgress } from "@/features/claim/components/ClaimProgress"
import { CardTitle, ClaimStatusBadge, ClaimTypeBadge, dangerButtonClass, Field, panelClass, SummaryCell } from "@/features/claim/components/ClaimPrimitives"
import { RESOLUTION_TYPE_LABELS } from "@/features/claim/constants"
import { getClaimErrorMessage } from "@/features/claim/errors"
import { useClaim } from "@/features/claim/hooks"
import { formatInvoiceDateTime, formatMoney } from "@/features/invoice/utils"
import { cn } from "@/lib/utils"
import { ErrorState } from "@/shared/components/common"
import { PageHeader } from "@/shared/components/PageHeader"
import { Skeleton } from "@/shared/components/ui/skeleton"

/** screen §10, customer version of CL4: progress, the answer of the company and the cancel button while the claim is PENDING. Laid out like Booking Details. */
export default function CustomerClaimDetailPage() {
  const { bookingId = "", claimId = "" } = useParams()
  const navigate = useNavigate()
  const query = useClaim(claimId)
  const [cancelOpen, setCancelOpen] = useState(false)
  const claim = query.data
  const backHref = `/bookings/${encodeURIComponent(bookingId)}?claimId=${encodeURIComponent(claimId)}`
  const money = (amount: number | null) => (amount == null ? "—" : formatMoney(amount))

  return (
    <div className="min-h-[70dvh] bg-[#f4f2ed] px-5 pt-5 pb-8 sm:px-6 lg:px-10">
      <div className="booking-page-enter mx-auto w-full max-w-[1152px]">
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <PageHeader title="CLAIM DETAILS" backHref={backHref} backLabel="BACK TO BOOKING" />
          {claim?.availableActions.includes("CANCEL") ? (
            <div className="flex w-full sm:w-auto sm:shrink-0 sm:pb-0.5">
              <Button type="button" variant="outline" className={cn(dangerButtonClass, "flex-1 sm:flex-none")} onClick={() => setCancelOpen(true)}>
                Cancel claim
              </Button>
            </div>
          ) : null}
        </div>

        {query.isLoading ? <Skeleton className="h-64 w-full rounded-none bg-white" /> : null}
        {query.isError ? <ErrorState message={getClaimErrorMessage(query.error, "Unable to load this claim.")} onRetry={() => void query.refetch()} /> : null}

        {claim ? (
          <div className="booking-stagger space-y-2.5">
            <dl className={cn(panelClass, "grid grid-cols-2 gap-x-4 px-4 lg:grid-cols-4 lg:gap-x-0 lg:pr-0")}>
              <SummaryCell first label="Claim code"><span className="text-lg leading-5 font-semibold text-gray-900">{claim.claimCode}</span></SummaryCell>
              <SummaryCell label="Status"><ClaimStatusBadge status={claim.status} /></SummaryCell>
              <SummaryCell label="Claim type"><ClaimTypeBadge type={claim.claimType} /></SummaryCell>
              <SummaryCell label="Submitted">{formatInvoiceDateTime(claim.submittedAt)}</SummaryCell>
            </dl>

            <section className={cn(panelClass, "p-4")} aria-label="Progress">
              <CardTitle>Progress</CardTitle>
              <div className="mt-3">
                <ClaimProgress claim={claim} />
              </div>
              {claim.status === "CANCELLED" && claim.cancellationReason ? (
                <p className="mt-3 border border-[#e5e2d9] bg-[#faf9f6] px-3 py-2 text-xs text-gray-700"><span className="font-semibold">Cancellation reason: </span>{claim.cancellationReason}</p>
              ) : null}
            </section>

            {claim.resolution ? (
              <section className={cn(panelClass, "p-4")} aria-label="Outcome">
                <CardTitle>{claim.status === "REJECTED" ? "Decision" : "Outcome"}</CardTitle>
                <dl className="mt-3 grid gap-x-4 gap-y-3 sm:grid-cols-3">
                  <Field label="Resolution type">{RESOLUTION_TYPE_LABELS[claim.resolution.resolutionType]}</Field>
                  <Field label="Approved compensation">{money(claim.resolution.approvedCompensationAmount)}</Field>
                  <Field label="Decided at">{formatInvoiceDateTime(claim.resolution.resolvedAt)}</Field>
                  <Field label="Summary" className="sm:col-span-3">{claim.resolution.resolutionSummary}</Field>
                </dl>
              </section>
            ) : null}

            <section className={cn(panelClass, "p-4")} aria-label="Claim information">
              <CardTitle>Claim information</CardTitle>
              <dl className="mt-3 grid gap-x-4 gap-y-3 sm:grid-cols-3">
                <Field label="Title" className="sm:col-span-3"><span className="font-semibold">{claim.title}</span></Field>
                <Field label="Description" className="sm:col-span-2">{claim.description}</Field>
                <Field label="Requested compensation"><span className="text-sm font-semibold">{money(claim.requestedCompensationAmount)}</span></Field>
                <Field label="Your note" className="sm:col-span-3">{claim.customerNote}</Field>
                <Field label="Evidence note" className="sm:col-span-3">{claim.evidenceNote}</Field>
              </dl>
            </section>

            <section className={cn(panelClass, "p-4")} aria-label="Delivery record">
              <CardTitle>Delivery record</CardTitle>
              <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 lg:grid-cols-4">
                <Field label="Handover code">{claim.handover.handoverCode}</Field>
                <Field label="Transport">{claim.transport.transportCode}</Field>
                <Field label="Booking">{claim.booking.bookingCode}</Field>
                <Field label="Signed at">{formatInvoiceDateTime(claim.handover.completedAt)}</Field>
              </dl>
            </section>
          </div>
        ) : null}
      </div>

      {claim ? (
        <CancelClaimDialog
          claim={claim}
          open={cancelOpen}
          onOpenChange={setCancelOpen}
          onStale={() => void query.refetch()}
          onCancelled={() => navigate(backHref, { replace: true })}
        />
      ) : null}
    </div>
  )
}
