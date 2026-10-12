import { Link } from "react-router-dom"
import { transportPlanDetail } from "@/app/route-config"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table"
import { EmptyState } from "@/shared/components/common"
import type { InvoiceDetail } from "../types"
import { humanize } from "../constants"
import { InvoiceBadge, InvoiceField, InvoiceSection } from "./InvoicePresentation"
import { invoiceDate, money } from "../format"

export function InvoiceDetailSections({ invoice, manager }: { invoice: InvoiceDetail; manager: boolean }) {
  const { customer, booking, transport, transportPlan, summary } = invoice
  return <div className="space-y-5">
    <div className="grid gap-5 lg:grid-cols-2">
      <InvoiceSection title="Invoice Overview"><dl className="grid gap-4 sm:grid-cols-2">
        <InvoiceField label="Invoice Number">{invoice.invoiceNumber}</InvoiceField><InvoiceField label="Invoice Date">{invoiceDate(invoice.invoiceDate)}</InvoiceField>
        <InvoiceField label="Type"><InvoiceBadge value={invoice.type} /></InvoiceField><InvoiceField label="Status"><InvoiceBadge value={invoice.status} /></InvoiceField>
        <InvoiceField label="Payment required">{invoice.isPaymentRequired ? "Yes" : "No"}</InvoiceField><InvoiceField label="Currency">{invoice.currency}</InvoiceField>
        <InvoiceField label="Due Date">{invoiceDate(invoice.dueDate)}</InvoiceField><InvoiceField label="Issued At">{invoiceDate(invoice.issuedAt)}</InvoiceField>
        <InvoiceField label="Paid At">{invoiceDate(invoice.paidAt)}</InvoiceField>
        {invoice.cancelledAt ? <InvoiceField label="Cancelled At">{invoiceDate(invoice.cancelledAt)}</InvoiceField> : null}
      </dl><dl className="space-y-4"><InvoiceField label="Notes">{invoice.note}</InvoiceField>{invoice.cancellationReason ? <InvoiceField label="Cancellation reason">{invoice.cancellationReason}</InvoiceField> : null}</dl></InvoiceSection>
      <InvoiceSection title="Customer Information"><dl className="grid gap-4 sm:grid-cols-2">
        <InvoiceField label="Customer">{customer.name}</InvoiceField><InvoiceField label="Customer Code">{customer.customerCode}</InvoiceField>
        <InvoiceField label="Email">{customer.email}</InvoiceField><InvoiceField label="Phone">{customer.phone}</InvoiceField>
      </dl><dl><InvoiceField label="Address">{customer.address}</InvoiceField></dl>
        <div className="space-y-3 border-t border-slate-100 pt-4"><h3 className="font-heading text-sm uppercase">Contact Person</h3><dl className="grid gap-4 sm:grid-cols-2">
          <InvoiceField label="Name">{invoice.contactPerson.name}</InvoiceField><InvoiceField label="Email">{invoice.contactPerson.email}</InvoiceField><InvoiceField label="Phone">{invoice.contactPerson.phone}</InvoiceField>
        </dl></div>
      </InvoiceSection>
    </div>
    <InvoiceSection title="Booking & Transport Information"><dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <InvoiceField label="Booking Code">{booking.bookingCode}</InvoiceField><InvoiceField label="Departure Date">{invoiceDate(booking.requestedDepartureDate)}</InvoiceField>
      <InvoiceField label="Origin">{booking.originAddress}, {booking.originCountry}</InvoiceField><InvoiceField label="Destination">{booking.destinationAddress}, {booking.destinationCountry}</InvoiceField>
      <InvoiceField label="Transport">{transport ? <span>{transport.transportCode} · {humanize(transport.status)}</span> : "Not linked"}</InvoiceField>
      <InvoiceField label="TransportPlan">{transportPlan ? <span>{manager ? <Link to={transportPlanDetail(transportPlan.transportPlanId)} className="font-semibold text-primary hover:underline">{transportPlan.planCode}</Link> : transportPlan.planCode} · {humanize(transportPlan.status)}</span> : "Not linked"}</InvoiceField>
    </dl></InvoiceSection>
    <InvoiceSection title="Invoice Items">
      {invoice.items.length ? <div className="overflow-x-auto"><Table><TableHeader className="bg-[#e9e6de]"><TableRow>{["Type", "Description", "Horse", "Quantity", "Price", "Total", "Note"].map(label => <TableHead key={label} className="h-11 whitespace-nowrap font-heading text-xs uppercase">{label}</TableHead>)}</TableRow></TableHeader>
        <TableBody>{invoice.items.map((item, index) => <TableRow key={item.invoiceItemId ?? index} className={`[&>td]:text-xs ${item.isDepositDeduction ? "bg-amber-50 text-amber-900" : ""}`}>
          <TableCell className="whitespace-nowrap">{item.isDepositDeduction ? "Deposit Deduction" : humanize(item.itemType)}</TableCell><TableCell className="min-w-48 whitespace-pre-wrap">{item.description}</TableCell>
          <TableCell>{item.horse?.horseName ?? "—"}</TableCell><TableCell className="text-right tabular-nums">{item.quantity}</TableCell><TableCell className="whitespace-nowrap text-right tabular-nums">{money(item.price, invoice.currency)}</TableCell><TableCell className="whitespace-nowrap text-right font-medium tabular-nums">{money(item.total, invoice.currency)}</TableCell><TableCell className="min-w-32 whitespace-pre-wrap">{item.note ?? "—"}</TableCell>
        </TableRow>)}</TableBody></Table></div> : <EmptyState message="No invoice items are available." />}
    </InvoiceSection>
    <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)]">
      <InvoiceSection title="Financial Summary"><dl className="space-y-3">{([
        ["Subtotal", summary.subtotal], ["Discount", summary.discount], [`Tax (${summary.taxRatePercent}%)`, summary.tax], ["Deposit Deduction", summary.depositDeduction],
      ] as const).map(([label, amount]) => <div key={label} className="flex justify-between gap-3 text-sm"><dt className="text-slate-500">{label}</dt><dd className="whitespace-nowrap tabular-nums">{money(amount, invoice.currency)}</dd></div>)}
        <div className="flex justify-between gap-3 border-t border-slate-200 pt-4 font-heading text-xl"><dt>Grand Total</dt><dd className="text-primary tabular-nums">{money(summary.grandTotal, invoice.currency)}</dd></div>
      </dl><p className="text-xs text-slate-500">Totals are supplied by the invoice service.</p></InvoiceSection>
      <InvoiceSection title="Receipts / Payment Information">{invoice.receipts.length ? <div className="space-y-4">{invoice.receipts.map(receipt => <article key={receipt.receiptId} className="space-y-3 rounded-[2px] border border-slate-200 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-semibold">{receipt.receiptCode}</h3><InvoiceBadge value={receipt.status} /></div>
        <dl className="grid gap-3 sm:grid-cols-2"><InvoiceField label="Amount">{money(receipt.amount, receipt.currency)}</InvoiceField><InvoiceField label="Payment Method">{humanize(receipt.paymentMethod)}</InvoiceField>
          <InvoiceField label="Transaction Reference">{receipt.transactionReference}</InvoiceField><InvoiceField label="Recorded By">{receipt.recordedBy?.fullName ?? "Online payment gateway"}</InvoiceField>
          <InvoiceField label="Paid At">{invoiceDate(receipt.paidAt)}</InvoiceField><InvoiceField label="Confirmed At">{invoiceDate(receipt.confirmedAt)}</InvoiceField>
        </dl><dl><InvoiceField label="Note">{receipt.note}</InvoiceField></dl>
      </article>)}</div> : <EmptyState message="No payment receipts exist for this invoice." />}</InvoiceSection>
    </div>
  </div>
}
