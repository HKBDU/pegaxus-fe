import { Link } from "react-router-dom"
import { customerClaimDetail, customerClaimNew } from "@/app/route-config"
import { ClaimCountdown, useRemainingSeconds } from "@/features/claim/components/ClaimCountdown"
import { ClaimStatusBadge, ClaimTypeBadge, primaryButtonClass } from "@/features/claim/components/ClaimPrimitives"
import { CLAIM_ERROR_MESSAGES } from "@/features/claim/constants"
import { getClaimErrorMessage } from "@/features/claim/errors"
import { useClaimEligibility, useClaims } from "@/features/claim/hooks"
import type { ClaimQueryParams } from "@/features/claim/types"
import { formatInvoiceDateTime, formatMoney } from "@/features/invoice/utils"
import { cn } from "@/lib/utils"
import { Button } from "@/shared/components/ui/button"
import { Skeleton } from "@/shared/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table"

const CUSTOMER_LIST = { pageIndex: 1, pageSize: 20, sortBy: "submittedAt:desc" } as const

/**
 * H8a: the "Handover & Claims" block of Booking Details (customer only). CL1 decides whether the Submit button is
 * live and runs the countdown; CL3 with `bookingId` lists the claims of this booking.
 */
export function BookingClaimsSection({ bookingId, highlightClaimId }: { bookingId: string; highlightClaimId?: string }) {
  const eligibility = useClaimEligibility(bookingId)
  const params: ClaimQueryParams = { ...CUSTOMER_LIST, bookingId }
  const claims = useClaims(params)
  const data = eligibility.data
  const remaining = useRemainingSeconds(data?.remainingSeconds, eligibility.dataUpdatedAt)
  const canSubmit = Boolean(data?.canSubmit) && remaining !== 0
  const blockedMessage = data && !canSubmit ? CLAIM_ERROR_MESSAGES[data.blockedReason ?? "CLAIM_WINDOW_EXPIRED"] : undefined

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0 text-xs leading-5 text-gray-600">
          {eligibility.isLoading ? <Skeleton className="h-4 w-56 rounded-none bg-slate-100" /> : null}
          {eligibility.isError ? <span className="text-red-600">{getClaimErrorMessage(eligibility.error, "Unable to check the claim window.")}</span> : null}
          {data ? (
            <>
              {data.claimDeadline ? (
                <p>
                  Claim deadline: <span className="font-semibold text-gray-900">{formatInvoiceDateTime(data.claimDeadline)}</span>{" "}
                  <ClaimCountdown seconds={remaining} className="ml-1" />
                </p>
              ) : null}
              {blockedMessage ? <p className="max-w-xl">{blockedMessage}</p> : null}
              {data.claimCount > 0 ? <p>{data.claimCount} claim{data.claimCount === 1 ? "" : "s"} filed for this booking.</p> : null}
            </>
          ) : null}
        </div>
        {canSubmit ? (
          <Button asChild className={primaryButtonClass}>
            <Link to={customerClaimNew(bookingId)}>Submit claim</Link>
          </Button>
        ) : (
          <Button type="button" className={primaryButtonClass} disabled>
            Submit claim
          </Button>
        )}
      </div>

      {claims.isError ? <p className="text-xs text-red-600">{getClaimErrorMessage(claims.error, "Unable to load the claims of this booking.")}</p> : null}
      <div className="overflow-x-auto border border-[#e5e2d9]">
        <Table>
          <TableHeader className="bg-[#e9e6de]">
            <TableRow>
              {["Claim code", "Type", "Status", "Requested", "Approved", "Submitted", ""].map((header, index) => (
                <TableHead key={header || index} scope="col" className={cn("h-10 whitespace-nowrap px-2.5 font-heading text-[11px] uppercase tracking-[0.06em] text-gray-600", header === "Requested" || header === "Approved" ? "text-right" : "text-left")}>
                  {header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {claims.isLoading ? (
              <TableRow>
                {Array.from({ length: 7 }, (_, index) => (
                  <TableCell key={index} className="px-2.5 py-2"><Skeleton className="h-3.5 w-full rounded-none bg-slate-100" /></TableCell>
                ))}
              </TableRow>
            ) : claims.data?.items.length ? (
              claims.data.items.map((claim, index) => (
                <TableRow
                  key={claim.claimId}
                  data-highlighted={claim.claimId === highlightClaimId || undefined}
                  className={cn("border-slate-200 data-[highlighted=true]:bg-amber-100 [&>td]:px-2.5 [&>td]:py-2 [&>td]:text-xs", index % 2 ? "bg-[#f7f6f3]" : "bg-white")}
                >
                  <TableCell className="whitespace-nowrap font-semibold">
                    <Link to={customerClaimDetail(bookingId, claim.claimId)} className="text-primary underline-offset-2 hover:underline">{claim.claimCode}</Link>
                  </TableCell>
                  <TableCell><ClaimTypeBadge type={claim.claimType} /></TableCell>
                  <TableCell><ClaimStatusBadge status={claim.status} /></TableCell>
                  <TableCell className="whitespace-nowrap text-right tabular-nums">{claim.requestedCompensationAmount == null ? "—" : formatMoney(claim.requestedCompensationAmount)}</TableCell>
                  <TableCell className="whitespace-nowrap text-right tabular-nums">{claim.approvedCompensationAmount == null ? "—" : formatMoney(claim.approvedCompensationAmount)}</TableCell>
                  <TableCell className="whitespace-nowrap">{formatInvoiceDateTime(claim.submittedAt)}</TableCell>
                  <TableCell className="text-right">
                    <Link to={customerClaimDetail(bookingId, claim.claimId)} className="font-heading text-[11px] font-semibold uppercase tracking-[0.05em] text-primary hover:underline">View</Link>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="px-2.5 py-6 text-center text-xs text-gray-500">No claims have been filed for this booking.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
