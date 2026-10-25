import { Eye, MoreHorizontal } from "lucide-react"
import { Link } from "react-router-dom"
import { claimDetail } from "@/app/route-config"
import { ClaimStatusBadge, ClaimTypeBadge } from "@/features/claim/components/ClaimPrimitives"
import type { ClaimListItem } from "@/features/claim/types"
import { formatInvoiceDateTime, formatMoney } from "@/features/invoice/utils"
import { cn } from "@/lib/utils"
import { EmptyState } from "@/shared/components/common"
import { TablePagination } from "@/shared/components/common/TablePagination"
import { Button } from "@/shared/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/shared/components/ui/dropdown-menu"
import { Skeleton } from "@/shared/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table"
import type { PaginationMeta } from "@/shared/types"

const HEADERS = ["Claim code", "Booking code", "Customer", "Claim type", "Status", "Requested", "Approved", "Submitted at", "Actions"] as const
const alignment = (header: string) => (header === "Requested" || header === "Approved" ? "text-right" : header === "Actions" ? "w-16 text-center" : "text-left")
const amount = (value: number | null) => (value == null ? "—" : formatMoney(value))

interface ClaimTableProps {
  items: ClaimListItem[]
  meta: PaginationMeta
  isLoading: boolean
  filtered: boolean
  /** Query string of the list, kept so "back" from the detail returns to the same filters. */
  search: string
  onOpen: (claimId: string) => void
  onPageChange: (page: number) => void
  onPageSizeChange: (size: number) => void
}

export function ClaimTable({ items, meta, isLoading, filtered, search, onOpen, onPageChange, onPageSizeChange }: ClaimTableProps) {
  return (
    <div className="space-y-2.5" aria-busy={isLoading}>
      <div className="booking-panel overflow-x-auto rounded-[2px] border bg-white">
        <Table>
          <TableHeader className="bg-[#e9e6de]">
            <TableRow>
              {HEADERS.map((header) => (
                <TableHead key={header} scope="col" className={cn("h-11 whitespace-nowrap px-2.5 font-heading text-[11px] uppercase tracking-[0.06em] text-gray-600", alignment(header))}>
                  {header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }, (_, index) => (
                <TableRow key={index}>
                  {HEADERS.map((header) => (
                    <TableCell key={header} className="h-11 px-2.5 py-2"><Skeleton className="h-3.5 w-full rounded-none bg-slate-100" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : items.length ? (
              items.map((item, index) => (
                <TableRow
                  key={item.claimId}
                  className={cn("booking-table-row cursor-pointer border-slate-200 hover:bg-amber-50/60 [&>td]:h-11 [&>td]:px-2.5 [&>td]:py-2 [&>td]:text-xs", index % 2 ? "bg-[#f7f6f3]" : "bg-white")}
                  onClick={(event) => {
                    if (!(event.target as HTMLElement).closest("a,button,[role=menuitem]")) onOpen(item.claimId)
                  }}
                >
                  <TableCell className="whitespace-nowrap text-left">
                    <Link to={{ pathname: claimDetail(item.claimId), search }} className="font-semibold text-primary underline-offset-2 hover:underline">{item.claimCode}</Link>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-left">{item.bookingCode}</TableCell>
                  <TableCell className="text-left"><span className="block min-w-24 max-w-36 break-words whitespace-normal font-semibold">{item.customerName}</span></TableCell>
                  <TableCell className="text-left">
                    <div className="flex min-w-36 max-w-52 flex-col items-start gap-1">
                      <ClaimTypeBadge type={item.claimType} />
                      <span className="line-clamp-2 whitespace-normal text-[11px] text-gray-500">{item.title}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-left"><ClaimStatusBadge status={item.status} /></TableCell>
                  <TableCell className="whitespace-nowrap text-right tabular-nums">{amount(item.requestedCompensationAmount)}</TableCell>
                  <TableCell className="whitespace-nowrap text-right tabular-nums">{amount(item.approvedCompensationAmount)}</TableCell>
                  <TableCell className="whitespace-nowrap text-left">{formatInvoiceDateTime(item.submittedAt)}</TableCell>
                  <TableCell className="w-16 text-center" onClick={(event) => event.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="size-7 rounded-[2px]" aria-label={`Actions for ${item.claimCode}`}>
                          <MoreHorizontal className="size-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link to={{ pathname: claimDetail(item.claimId), search }}><Eye className="size-3.5" />View &amp; process</Link>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={HEADERS.length}>
                  <EmptyState message={filtered ? "No claims match these filters." : "No claims have been submitted yet."} />
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <TablePagination meta={meta} onPageChange={onPageChange} onPageSizeChange={onPageSizeChange} pageSizeAriaLabel="Claims per page" />
    </div>
  )
}
