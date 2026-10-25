import { Eye, MoreHorizontal } from "lucide-react"
import { Link, useNavigate } from "react-router-dom"
import { customerClaimDetail, customerClaimNew } from "@/app/route-config"
import { ClaimCountdown, useRemainingSeconds } from "@/features/claim/components/ClaimCountdown"
import { ClaimStatusBadge, ClaimTypeBadge, columnHeadClass } from "@/features/claim/components/ClaimPrimitives"
import { CLAIM_ERROR_MESSAGES } from "@/features/claim/constants"
import { getClaimErrorMessage } from "@/features/claim/errors"
import { useClaimEligibility, useClaims } from "@/features/claim/hooks"
import type { ClaimQueryParams } from "@/features/claim/types"
import { formatInvoiceDateTime, formatMoney } from "@/features/invoice/utils"
import { cn } from "@/lib/utils"
import { Button } from "@/shared/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/shared/components/ui/dropdown-menu"
import { Skeleton } from "@/shared/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table"

const CUSTOMER_LIST = { pageIndex: 1, pageSize: 20, sortBy: "submittedAt:desc" } as const
const HEADERS = ["Claim code", "Type", "Status", "Requested", "Approved", "Submitted", ""] as const
const money = (amount: number | null | undefined) => (amount == null ? "—" : formatMoney(amount))

/**
 * Button that opens the claim form, shown only while CL1 says the customer can still file a claim. The claim page carries
 * it; the Booking Details header carries it only until a first claim exists (`onlyFirst`), so a booking without claims
 * still has a way in.
 */
export function SubmitClaimAction({ bookingId, className, onlyFirst = false }: { bookingId: string; className?: string; onlyFirst?: boolean }) {
  const eligibility = useClaimEligibility(bookingId)
  const data = eligibility.data
  const remaining = useRemainingSeconds(data?.remainingSeconds, eligibility.dataUpdatedAt)
  if (!data?.canSubmit || remaining === 0) return null
  if (onlyFirst && data.claimCount > 0) return null
  return (
    <Link to={customerClaimNew(bookingId)} className={className}>
      Submit claim
    </Link>
  )
}

/**
 * H8a: the "Handover & Claims" block of Booking Details (customer only). CL1 runs the countdown and says why a claim
 * cannot be filed; CL3 with `bookingId` lists the claims of this booking. The Submit button lives on the claim page.
 */
export function BookingClaimsSection({ bookingId, highlightClaimId }: { bookingId: string; highlightClaimId?: string }) {
  const navigate = useNavigate()
  const eligibility = useClaimEligibility(bookingId)
  const params: ClaimQueryParams = { ...CUSTOMER_LIST, bookingId }
  const claims = useClaims(params)
  const data = eligibility.data
  const remaining = useRemainingSeconds(data?.remainingSeconds, eligibility.dataUpdatedAt)
  const canSubmit = Boolean(data?.canSubmit) && remaining !== 0
  const blockedMessage = data && !canSubmit ? CLAIM_ERROR_MESSAGES[data.blockedReason ?? "CLAIM_WINDOW_EXPIRED"] : undefined

  return (
    <div className="space-y-2.5">
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
          </>
        ) : null}
      </div>

      {claims.isError ? <p className="text-xs text-red-600">{getClaimErrorMessage(claims.error, "Unable to load the claims of this booking.")}</p> : null}
      <div className="overflow-x-auto border border-[#e5e2d9]">
        <Table>
          <TableHeader className="bg-[#f2efe8] [&_tr]:border-b-0">
            <TableRow className="border-b-0 hover:bg-transparent">
              {HEADERS.map((header, index) => (
                <TableHead key={header || index} scope="col" className={cn(columnHeadClass, header === "Requested" || header === "Approved" ? "text-right" : "text-left", !header && "w-12")}>
                  {header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {claims.isLoading ? (
              <TableRow className="h-11 hover:bg-transparent">
                {HEADERS.map((header, index) => (
                  <TableCell key={header || index} className="px-2.5 py-1.5"><Skeleton className="h-3.5 w-full rounded-none bg-slate-100" /></TableCell>
                ))}
              </TableRow>
            ) : claims.data?.items.length ? (
              claims.data.items.map((claim, index) => {
                const detail = customerClaimDetail(bookingId, claim.claimId)
                return (
                  <TableRow
                    key={claim.claimId}
                    data-highlighted={claim.claimId === highlightClaimId || undefined}
                    className={cn(
                      "booking-table-row h-11 cursor-pointer border-slate-200 hover:bg-amber-50/60 data-[highlighted=true]:bg-amber-100 [&>td]:px-2.5 [&>td]:py-1.5 [&>td]:text-xs",
                      index % 2 === 0 ? "bg-white" : "bg-[#f7f6f3]",
                    )}
                    onClick={(event) => {
                      if (!(event.target as HTMLElement).closest("a,button,[role=menuitem]")) navigate(detail)
                    }}
                  >
                    <TableCell className="whitespace-nowrap font-semibold">
                      <Link to={detail} className="text-primary underline-offset-2 hover:underline">{claim.claimCode}</Link>
                    </TableCell>
                    <TableCell><ClaimTypeBadge type={claim.claimType} /></TableCell>
                    <TableCell><ClaimStatusBadge status={claim.status} /></TableCell>
                    <TableCell className="whitespace-nowrap text-right tabular-nums">{money(claim.requestedCompensationAmount)}</TableCell>
                    <TableCell className="whitespace-nowrap text-right tabular-nums">{money(claim.approvedCompensationAmount)}</TableCell>
                    <TableCell className="whitespace-nowrap">{formatInvoiceDateTime(claim.submittedAt)}</TableCell>
                    <TableCell className="w-12 text-center" onClick={(event) => event.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="size-7 rounded-[2px]" aria-label={`Actions for ${claim.claimCode}`}>
                            <MoreHorizontal className="size-3.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link to={detail}><Eye className="size-3.5" />View Detail</Link>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )
              })
            ) : (
              <TableRow className="h-10 hover:bg-transparent">
                <TableCell colSpan={HEADERS.length} className="px-4 py-0 text-center text-[13px] text-gray-500">No claims have been filed for this booking.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
