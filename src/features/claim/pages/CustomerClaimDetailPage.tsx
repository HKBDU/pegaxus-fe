import { useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { Button } from "@/shared/components/ui/button"
import { CancelClaimDialog } from "@/features/claim/components/CancelClaimDialog"
import { ClaimProgress } from "@/features/claim/components/ClaimProgress"
import { ClaimStatusBadge, ClaimTypeBadge, dangerButtonClass, Field, panelClass, SectionTitle } from "@/features/claim/components/ClaimPrimitives"
import { RESOLUTION_TYPE_LABELS } from "@/features/claim/constants"
import { getClaimErrorMessage } from "@/features/claim/errors"
import { useClaim } from "@/features/claim/hooks"
import { formatInvoiceDateTime, formatMoney } from "@/features/invoice/utils"
import { cn } from "@/lib/utils"
import { ErrorState } from "@/shared/components/common"
import { PageHeader } from "@/shared/components/PageHeader"
import { Skeleton } from "@/shared/components/ui/skeleton"

/** screen §10, customer version of CL4: progress, the answer of the company and the cancel button while the claim is PENDING. */
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
      <div className="booking-page-enter mx-auto w-full max-w-[1152px] space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <PageHeader title="Claim details" backHref={backHref} backLabel="Back to booking" />
          {claim?.availableActions.includes("CANCEL") ? (
            <Button type="button" variant="outline" className={cn(dangerButtonClass, "sm:mb-1")} onClick={() => setCancelOpen(true)}>
              Cancel claim
            </Button>
          ) : null}
        </div>

        {query.isLoading ? <Skeleton className="h-64 w-full rounded-none bg-white" /> : null}
        {query.isError ? <ErrorState message={getClaimErrorMessage(query.error, "Unable to load this claim.")} onRetry={() => void query.refetch()} /> : null}

        {claim ? (
          <div className="space-y-2.5">
            <dl className={cn(panelClass, "grid grid-cols-2 gap-x-4 gap-y-2 px-4 py-3 lg:grid-cols-4")}>
              <Field label="Claim code"><span className="text-lg font-semibold">{claim.claimCode}</span></Field>
              <Field label="Status"><ClaimStatusBadge status={claim.status} /></Field>
              <Field label="Claim type"><ClaimTypeBadge type={claim.claimType} /></Field>
              <Field label="Submitted">{formatInvoiceDateTime(claim.submittedAt)}</Field>
            </dl>

            <section className={cn(panelClass, "space-y-3 p-4")} aria-label="Progress">
              <SectionTitle>Progress</SectionTitle>
              <ClaimProgress claim={claim} />
              {claim.status === "CANCELLED" && claim.cancellationReason ? (
                <p className="border border-[#e5e2d9] bg-[#faf9f6] px-3 py-2 text-xs text-gray-700"><span className="font-semibold">Cancellation reason: </span>{claim.cancellationReason}</p>
              ) : null}
            </section>

            {claim.resolution ? (
              <section className={cn(panelClass, "space-y-3 p-4")} aria-label="Outcome">
                <SectionTitle>{claim.status === "REJECTED" ? "Decision" : "Outcome"}</SectionTitle>
                <dl className="grid gap-x-4 gap-y-3 sm:grid-cols-3">
                  <Field label="Resolution type">{RESOLUTION_TYPE_LABELS[claim.resolution.resolutionType]}</Field>
                  <Field label="Approved compensation">{money(claim.resolution.approvedCompensationAmount)}</Field>
                  <Field label="Decided at">{formatInvoiceDateTime(claim.resolution.resolvedAt)}</Field>
                  <Field label="Summary" className="sm:col-span-3">{claim.resolution.resolutionSummary}</Field>
                </dl>
              </section>
            ) : null}

            <section className={cn(panelClass, "space-y-3 p-4")} aria-label="Claim information">
              <SectionTitle>Claim information</SectionTitle>
              <dl className="grid gap-x-4 gap-y-3 sm:grid-cols-3">
                <Field label="Title" className="sm:col-span-3"><span className="font-semibold">{claim.title}</span></Field>
                <Field label="Description" className="sm:col-span-2">{claim.description}</Field>
                <Field label="Requested compensation"><span className="text-lg font-semibold">{money(claim.requestedCompensationAmount)}</span></Field>
                <Field label="Your note" className="sm:col-span-3">{claim.customerNote}</Field>
                <Field label="Evidence note" className="sm:col-span-3">{claim.evidenceNote}</Field>
              </dl>
            </section>

            <section className={cn(panelClass, "space-y-3 p-4")} aria-label="Delivery record">
              <SectionTitle tone="dark">Delivery record</SectionTitle>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3 lg:grid-cols-4">
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
