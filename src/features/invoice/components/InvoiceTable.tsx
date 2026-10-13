import { Link, useLocation, useNavigate } from "react-router-dom"
import { Eye, MoreHorizontal } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table"
import { Button } from "@/shared/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/shared/components/ui/dropdown-menu"
import { Skeleton } from "@/shared/components/ui/skeleton"
import { EmptyState } from "@/shared/components/common"
import { TablePagination } from "@/shared/components/common/TablePagination"
import type { PaginationMeta } from "@/shared/types"
import type { InvoiceListItem } from "@/features/invoice/types"
import { invoiceDetailPath, customerInvoicePath } from "@/features/invoice/constants"
import { InvoiceStatusBadge } from "@/features/invoice/components/InvoiceStatusBadge"
import { InvoiceTypeBadge } from "@/features/invoice/components/InvoiceTypeBadge"
import { MoneyText } from "@/features/invoice/components/MoneyText"
import { invoiceDate } from "@/features/invoice/utils"

export function InvoiceTable({ items, meta, isLoading, audience = "manager", embedded = false, highlightInvoiceId, filtered = false, onPageChange, onPageSizeChange }: {
  items: InvoiceListItem[]; meta: PaginationMeta; isLoading: boolean; audience?: "manager" | "customer"; embedded?: boolean; highlightInvoiceId?: string; filtered?: boolean
  onPageChange: (page: number) => void; onPageSizeChange: (size: number) => void
}) {
  const navigate = useNavigate(), location = useLocation()
  const headers = ["Invoice Number", ...(!embedded ? ["Booking Code", "Customer"] : []), "Type", "Total Amount", "Status", "Due Date", "Issued At", "Actions"]
  const alignment = (header: string) => header === "Total Amount" ? "text-right" : header === "Actions" ? "w-16 text-center" : "text-left"
  const href = (item: InvoiceListItem) => audience === "customer" ? customerInvoicePath(item.bookingId, item.invoiceId) : invoiceDetailPath(item.invoiceId)
  const state = audience === "manager" && !embedded ? { invoiceListSearch: location.search } : undefined
  return <div className="space-y-2.5" aria-busy={isLoading}>
    <div className="booking-panel overflow-x-auto rounded-[2px] border bg-white"><Table>
      <TableHeader className="bg-[#e9e6de]"><TableRow>{headers.map(header => <TableHead key={header} scope="col" className={`h-11 whitespace-nowrap px-2.5 font-heading text-[11px] uppercase tracking-[0.06em] text-gray-600 ${alignment(header)}`}>{header}</TableHead>)}</TableRow></TableHeader>
      <TableBody>{isLoading ? Array.from({ length: 5 }, (_, index) => <TableRow key={index}>{headers.map(header => <TableCell key={header} className="h-11 px-2.5 py-2"><Skeleton className="h-3.5 w-full rounded-none bg-slate-100" /></TableCell>)}</TableRow>) :
        items.length ? items.map((item, index) => <TableRow key={item.invoiceId} data-invoice-id={item.invoiceId} data-highlighted={item.invoiceId === highlightInvoiceId || undefined}
          className={`booking-table-row cursor-pointer border-slate-200 hover:bg-amber-50/60 data-[highlighted=true]:bg-amber-100 ${index % 2 ? "bg-[#f7f6f3]" : "bg-white"} [&>td]:h-11 [&>td]:px-2.5 [&>td]:py-2 [&>td]:text-xs`}
          onClick={event => { if (!(event.target as HTMLElement).closest("a,button,[role=menuitem]")) navigate(href(item), { state }) }}>
          <TableCell className="text-left"><Link to={href(item)} state={state} className="whitespace-nowrap font-semibold text-primary underline-offset-2 hover:underline">{item.invoiceNumber}</Link></TableCell>
          {!embedded ? <><TableCell className="text-left">{item.bookingCode}</TableCell><TableCell className="text-left"><span className="block min-w-32 max-w-48 break-words whitespace-normal">{item.customerName}</span></TableCell></> : null}
          <TableCell className="text-left"><InvoiceTypeBadge type={item.type} /></TableCell><TableCell className="whitespace-nowrap text-right tabular-nums"><MoneyText amount={item.totalAmount} currency={item.currency} /></TableCell>
          <TableCell className="text-left"><InvoiceStatusBadge status={item.status} /></TableCell><TableCell className="whitespace-nowrap text-left">{invoiceDate(item.dueDate)}</TableCell><TableCell className="whitespace-nowrap text-left">{invoiceDate(item.issuedAt)}</TableCell>
          <TableCell className="w-16 text-center" onClick={event => event.stopPropagation()}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="size-7 rounded-[2px]" aria-label={`Actions for ${item.invoiceNumber}`}><MoreHorizontal className="size-3.5" /></Button></DropdownMenuTrigger>
              <DropdownMenuContent align="end"><DropdownMenuItem asChild><Link to={href(item)} state={state}><Eye className="size-3.5" />View Detail</Link></DropdownMenuItem></DropdownMenuContent>
            </DropdownMenu>
          </TableCell>
        </TableRow>) : <TableRow><TableCell colSpan={headers.length}><EmptyState message={filtered ? "No invoices match these filters." : "No invoices are available yet."} /></TableCell></TableRow>}</TableBody>
    </Table></div>
    <TablePagination meta={meta} onPageChange={onPageChange} onPageSizeChange={onPageSizeChange} pageSizeAriaLabel="Invoices per page" />
  </div>
}
