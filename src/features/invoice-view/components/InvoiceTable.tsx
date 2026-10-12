import { Link, useLocation, useNavigate } from "react-router-dom"
import { Eye } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table"
import { Button } from "@/shared/components/ui/button"
import { Skeleton } from "@/shared/components/ui/skeleton"
import { EmptyState } from "@/shared/components/common"
import { TablePagination } from "@/shared/components/common/TablePagination"
import type { PaginationMeta } from "@/shared/types"
import type { InvoiceListItem } from "../types"
import { invoiceDetailPath, customerInvoicePath } from "../constants"
import { InvoiceBadge } from "./InvoicePresentation"
import { invoiceDate, money } from "../format"

export function InvoiceTable({ items, meta, isLoading, audience = "manager", embedded = false, highlightInvoiceId, filtered = false, onPageChange, onPageSizeChange }: {
  items: InvoiceListItem[]; meta: PaginationMeta; isLoading: boolean; audience?: "manager" | "customer"; embedded?: boolean; highlightInvoiceId?: string; filtered?: boolean
  onPageChange: (page: number) => void; onPageSizeChange: (size: number) => void
}) {
  const navigate = useNavigate(), location = useLocation()
  const headers = ["Invoice Number", ...(!embedded ? ["Booking Code", "Customer"] : []), "Type", "Total Amount", "Status", "Due Date", "Issued At", "Actions"]
  const href = (item: InvoiceListItem) => audience === "customer" ? customerInvoicePath(item.bookingId, item.invoiceId) : invoiceDetailPath(item.invoiceId)
  const state = audience === "manager" && !embedded ? { invoiceListSearch: location.search } : undefined
  return <div className="space-y-2.5" aria-busy={isLoading}>
    <div className="booking-panel overflow-x-auto rounded-[2px] border bg-white"><Table>
      <TableHeader className="bg-[#e9e6de]"><TableRow>{headers.map(header => <TableHead key={header} className="h-11 whitespace-nowrap px-2.5 font-heading text-[11px] uppercase tracking-[0.06em] text-gray-600">{header}</TableHead>)}</TableRow></TableHeader>
      <TableBody>{isLoading ? Array.from({ length: 5 }, (_, index) => <TableRow key={index}>{headers.map(header => <TableCell key={header} className="h-11 px-2.5 py-2"><Skeleton className="h-3.5 w-full rounded-none bg-slate-100" /></TableCell>)}</TableRow>) :
        items.length ? items.map((item, index) => <TableRow key={item.invoiceId} data-invoice-id={item.invoiceId} data-highlighted={item.invoiceId === highlightInvoiceId || undefined}
          className={`booking-table-row cursor-pointer border-slate-200 hover:bg-amber-50/60 data-[highlighted=true]:bg-amber-100 ${index % 2 ? "bg-[#f7f6f3]" : "bg-white"} [&>td]:h-11 [&>td]:px-2.5 [&>td]:py-2 [&>td]:text-xs`}
          onClick={event => { if (!(event.target as HTMLElement).closest("a,button")) navigate(href(item), { state }) }}>
          <TableCell><Link to={href(item)} state={state} className="whitespace-nowrap font-semibold text-primary underline-offset-2 hover:underline">{item.invoiceNumber}</Link></TableCell>
          {!embedded ? <><TableCell>{item.bookingCode}</TableCell><TableCell className="min-w-32 max-w-48 whitespace-normal">{item.customerName}</TableCell></> : null}
          <TableCell><InvoiceBadge value={item.type} /></TableCell><TableCell className="whitespace-nowrap text-right tabular-nums">{money(item.totalAmount, item.currency)}</TableCell>
          <TableCell><InvoiceBadge value={item.status} /></TableCell><TableCell className="whitespace-nowrap">{invoiceDate(item.dueDate)}</TableCell><TableCell className="whitespace-nowrap">{invoiceDate(item.issuedAt)}</TableCell>
          <TableCell><Button asChild variant="ghost" size="icon" className="size-7 rounded-[2px]"><Link to={href(item)} state={state} aria-label={`View Detail ${item.invoiceNumber}`}><Eye className="size-3.5" /></Link></Button></TableCell>
        </TableRow>) : <TableRow><TableCell colSpan={headers.length}><EmptyState message={filtered ? "No invoices match these filters." : "No invoices are available yet."} /></TableCell></TableRow>}</TableBody>
    </Table></div>
    <TablePagination meta={meta} onPageChange={onPageChange} onPageSizeChange={onPageSizeChange} pageSizeAriaLabel="Invoices per page" />
  </div>
}
