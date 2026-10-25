import { useEffect } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { toast } from "sonner"
import { customerClaimDetail } from "@/app/route-config"
import { ClaimCountdown, useRemainingSeconds } from "@/features/claim/components/ClaimCountdown"
import { Field, panelClass, SectionTitle } from "@/features/claim/components/ClaimPrimitives"
import { ClaimSubmitForm } from "@/features/claim/components/ClaimSubmitForm"
import { CLAIM_ERROR_MESSAGES } from "@/features/claim/constants"
import { getClaimErrorCode, getClaimErrorMessage } from "@/features/claim/errors"
import { useBookingHorses, useClaimEligibility, useSubmitClaim } from "@/features/claim/hooks"
import { formatInvoiceDateTime } from "@/features/invoice/utils"
import { cn } from "@/lib/utils"
import { ErrorState, LoadingState } from "@/shared/components/common"
import { PageHeader } from "@/shared/components/PageHeader"

/** screen §9: the customer files a claim within 24 hours of the signed delivery record. */
export default function CustomerClaimNewPage() {
  const { bookingId = "" } = useParams()
  const navigate = useNavigate()
  const eligibility = useClaimEligibility(bookingId)
  const horses = useBookingHorses(bookingId)
  const submit = useSubmitClaim(bookingId)
  const data = eligibility.data
  const remaining = useRemainingSeconds(data?.remainingSeconds, eligibility.dataUpdatedAt)
  const backHref = `/bookings/${encodeURIComponent(bookingId)}`
  const expiredLocally = remaining === 0 && data?.canSubmit === true
  const refetchEligibility = eligibility.refetch

  // The countdown only hints; once it reaches zero the BE is asked again, and it decides.
  useEffect(() => {
    if (expiredLocally) void refetchEligibility()
  }, [expiredLocally, refetchEligibility])

  const blockedByCode = getClaimErrorCode(submit.error)
  const blocked = !data?.canSubmit || expiredLocally || blockedByCode === "CLAIM_WINDOW_EXPIRED" || blockedByCode === "HANDOVER_NOT_COMPLETED"
  const blockedReason = blockedByCode ?? data?.blockedReason ?? "CLAIM_WINDOW_EXPIRED"

  return (
    <div className="min-h-[70dvh] bg-[#f4f2ed] px-5 pt-5 pb-8 sm:px-6 lg:px-10">
      <div className="booking-page-enter mx-auto w-full max-w-[1152px] space-y-3">
        <PageHeader title="Submit handover claim" backHref={backHref} backLabel="Return to booking" />

        {eligibility.isLoading ? <LoadingState /> : null}
        {eligibility.isError ? (
          <ErrorState message={getClaimErrorMessage(eligibility.error, "Unable to load the claim eligibility of this booking.")} onRetry={() => void eligibility.refetch()} />
        ) : null}

        {data ? (
          <>
            <section aria-label="Handover manifest" className="overflow-hidden border border-gray-900">
              <p className="flex items-center justify-between bg-gray-900 px-3 py-1.5 font-heading text-[10px] font-bold uppercase tracking-[0.08em] text-white">
                <span className="flex items-center gap-2"><span aria-hidden="true" className="size-1.5 bg-[#ef8f00]" />Verified handover manifest data</span>
                <span>{data.transport?.status === "COMPLETED" ? "Consignment discharged" : "Delivery pending"}</span>
              </p>
              <dl className="grid grid-cols-2 gap-px bg-[#e5e2d9] lg:grid-cols-5">
                <ManifestCell label="Handover code" value={data.handover?.handoverCode} />
                <ManifestCell label="Transport waybill" value={data.transport?.transportCode} />
                <ManifestCell label="Master booking ID" value={data.booking.bookingCode} />
                <ManifestCell label="Signed at" value={data.handover ? formatInvoiceDateTime(data.handover.completedAt) : undefined} />
                <div className={cn("p-3", blocked ? "bg-red-50" : "bg-amber-50")}>
                  <dt className="font-heading text-[10px] font-medium uppercase tracking-[0.06em] text-gray-500">Claim deadline</dt>
                  <dd className="mt-0.5 text-sm font-semibold text-gray-900">{formatInvoiceDateTime(data.claimDeadline)}</dd>
                  <ClaimCountdown seconds={remaining} />
                </div>
              </dl>
            </section>

            {blocked ? (
              <div className="border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
                {CLAIM_ERROR_MESSAGES[blockedReason] ?? "A claim cannot be submitted for this booking."}
              </div>
            ) : null}

            <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
              <ClaimSubmitForm
                disabled={blocked}
                submitting={submit.isPending}
                error={blockedByCode === "CLAIM_WINDOW_EXPIRED" || blockedByCode === "HANDOVER_NOT_COMPLETED" ? undefined : submit.error}
                cancelHref={backHref}
                onSubmit={(payload) =>
                  submit.mutate(payload, {
                    onSuccess: (claim) => {
                      toast.success(`Claim ${claim.claimCode} submitted`)
                      navigate(customerClaimDetail(bookingId, claim.claimId), { replace: true })
                    },
                    onError: (error) => {
                      const code = getClaimErrorCode(error)
                      if (code === "CLAIM_WINDOW_EXPIRED" || code === "HANDOVER_NOT_COMPLETED") void eligibility.refetch()
                    },
                  })
                }
              />

              <aside aria-label="Booking horses" className={cn(panelClass, "p-4")}>
                <SectionTitle>Equine subjects</SectionTitle>
                {horses.isLoading ? <p className="mt-3 text-xs text-gray-500">Loading horses...</p> : null}
                {horses.data?.length ? (
                  <ul className="mt-3 space-y-3">
                    {horses.data.map((horse) => (
                      <li key={horse.horseId} className="border border-[#e5e2d9] bg-[#faf9f6] p-3">
                        <dl className="space-y-1.5">
                          <Field label="Horse">{horse.horseName}</Field>
                          <Field label="Microchip">{horse.microchipNumber}</Field>
                        </dl>
                      </li>
                    ))}
                  </ul>
                ) : horses.isSuccess ? (
                  <p className="mt-3 text-xs text-gray-500">No horses are listed for this booking.</p>
                ) : null}
                <p className="mt-4 text-[11px] leading-4 text-gray-500">
                  {data.claimCount > 0 ? `You already filed ${data.claimCount} claim${data.claimCount === 1 ? "" : "s"} for this booking. ` : ""}
                  Several claims can be filed for the same delivery, as long as the 24-hour window is open.
                </p>
              </aside>
            </div>
          </>
        ) : null}
      </div>
    </div>
  )
}

function ManifestCell({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="bg-white p-3">
      <dt className="font-heading text-[10px] font-medium uppercase tracking-[0.06em] text-gray-500">{label}</dt>
      <dd className="mt-0.5 truncate text-sm font-semibold text-gray-900">{value || "—"}</dd>
    </div>
  )
}
