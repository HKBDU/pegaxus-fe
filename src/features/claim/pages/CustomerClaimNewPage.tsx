import { useEffect } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { toast } from "sonner"
import { customerClaimDetail } from "@/app/route-config"
import { ClaimCountdown, useRemainingSeconds } from "@/features/claim/components/ClaimCountdown"
import { CardTitle, columnHeadClass, panelClass, SummaryCell } from "@/features/claim/components/ClaimPrimitives"
import { ClaimSubmitForm } from "@/features/claim/components/ClaimSubmitForm"
import { CLAIM_ERROR_MESSAGES } from "@/features/claim/constants"
import { getClaimErrorCode, getClaimErrorMessage } from "@/features/claim/errors"
import { useBookingHorses, useClaimEligibility, useSubmitClaim } from "@/features/claim/hooks"
import { formatInvoiceDateTime } from "@/features/invoice/utils"
import { cn } from "@/lib/utils"
import { formatLocalDateTimeLabel } from "@/shared/utils/datetime"
import { ErrorState, LoadingState } from "@/shared/components/common"
import { PageHeader } from "@/shared/components/PageHeader"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table"

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
      <div className="booking-page-enter mx-auto w-full max-w-[1152px] space-y-2.5">
        <PageHeader title="SUBMIT HANDOVER CLAIM" backHref={backHref} backLabel="BACK TO BOOKING" />

        {eligibility.isLoading ? <LoadingState /> : null}
        {eligibility.isError ? (
          <ErrorState message={getClaimErrorMessage(eligibility.error, "Unable to load the claim eligibility of this booking.")} onRetry={() => void eligibility.refetch()} />
        ) : null}

        {data ? (
          <>
            <dl aria-label="Handover manifest" className={cn(panelClass, "grid grid-cols-2 gap-x-4 px-4 lg:grid-cols-5 lg:gap-x-0 lg:pr-0")}>
              <SummaryCell first label="Handover code"><span className="font-semibold text-gray-900">{data.handover?.handoverCode ?? "—"}</span></SummaryCell>
              <SummaryCell label="Transport">{data.transport?.transportCode ?? "—"}</SummaryCell>
              <SummaryCell label="Booking">{data.booking.bookingCode}</SummaryCell>
              <SummaryCell label="Signed at">{data.handover ? formatInvoiceDateTime(data.handover.completedAt) : "—"}</SummaryCell>
              <SummaryCell label="Claim deadline">
                <span className="flex flex-col">
                  <span className="font-semibold text-gray-900">{formatInvoiceDateTime(data.claimDeadline)}</span>
                  <span className="text-xs text-gray-500">{formatLocalDateTimeLabel(data.claimDeadline)}</span>
                  <ClaimCountdown seconds={remaining} />
                </span>
              </SummaryCell>
            </dl>

            {blocked ? (
              <div className="border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700" role="alert">
                {CLAIM_ERROR_MESSAGES[blockedReason] ?? "A claim cannot be submitted for this booking."}
              </div>
            ) : null}

            <div className="grid items-start gap-2.5 lg:grid-cols-[minmax(0,1fr)_340px]">
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
                <CardTitle>Racehorses</CardTitle>
                <div className="mt-2.5 overflow-x-auto border border-[#e5e2d9]">
                  <Table>
                    <TableHeader className="bg-[#f2efe8] [&_tr]:border-b-0">
                      <TableRow className="border-b-0 hover:bg-transparent">
                        <TableHead className={columnHeadClass}>Horse</TableHead>
                        <TableHead className={columnHeadClass}>Microchip</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {horses.isLoading ? (
                        <TableRow className="h-10 hover:bg-transparent"><TableCell colSpan={2} className="px-2.5 py-0 text-xs text-gray-500">Loading horses...</TableCell></TableRow>
                      ) : horses.data?.length ? (
                        horses.data.map((horse, index) => (
                          <TableRow key={horse.horseId} className={cn("h-11 border-slate-200 hover:bg-amber-50/60", index % 2 === 0 ? "bg-white" : "bg-[#f7f6f3]")}>
                            <TableCell className="px-2.5 py-1.5 text-xs font-semibold text-gray-900">{horse.horseName}</TableCell>
                            <TableCell className="px-2.5 py-1.5 font-mono text-xs text-gray-600">{horse.microchipNumber}</TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow className="h-10 hover:bg-transparent"><TableCell colSpan={2} className="px-2.5 py-0 text-center text-xs text-gray-500">No horses are listed for this booking.</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
                <p className="mt-3 text-[11px] leading-4 text-gray-500">
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

