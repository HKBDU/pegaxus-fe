import { Link } from "react-router-dom"
import { transportPlanDetail } from "@/app/route-config"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table"
import { EmptyState } from "@/shared/components/common"
import { Separator } from "@/shared/components/ui/separator"
import type { InvoiceDetail } from "../types"
import { humanize } from "../constants"
import { InvoiceBadge, InvoiceField, InvoiceSection } from "./InvoicePresentation"
import { invoiceDate, money } from "../format"

export function InvoiceDetailSections({ invoice, manager }: { invoice: InvoiceDetail; manager: boolean }) {
  const { customer, booking, transport, transportPlan, summary } = invoice
  return <div className="space-y-5">
    <section aria-label="Invoice document" className="grid min-w-0 overflow-hidden rounded-[2px] border border-slate-200 bg-white lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
      <div className="min-w-0 space-y-6 bg-[#e9e6de] p-5 sm:p-7">
        <div className="border-t-4 border-slate-900 pt-4"><p className="text-xs uppercase tracking-[0.2em] text-slate-600">PEGAXUS</p><h2 className="mt-1 font-heading text-4xl uppercase text-slate-900">Invoice</h2></div>
        <dl className="grid gap-5 sm:grid-cols-2 lg:grid-cols-1">
          <InvoiceField label="Invoice Number"><span className="font-semibold">{invoice.invoiceNumber}</span></InvoiceField>
          <InvoiceField label="Invoice Date">{invoiceDate(invoice.invoiceDate)}</InvoiceField>
          <InvoiceField label="Due Date">{invoiceDate(invoice.dueDate)}</InvoiceField>
          <InvoiceField label="Type"><InvoiceBadge value={invoice.type} /></InvoiceField>
          <InvoiceField label="Status"><InvoiceBadge value={invoice.status} /></InvoiceField>
          <InvoiceField label="Currency">{invoice.currency}</InvoiceField>
          <InvoiceField label="Payment required">{invoice.isPaymentRequired ? "Yes" : "No"}</InvoiceField>
          <InvoiceField label="Issued At">{invoiceDate(invoice.issuedAt)}</InvoiceField>
          <InvoiceField label="Paid At">{invoiceDate(invoice.paidAt)}</InvoiceField>
          {invoice.cancelledAt ? <InvoiceField label="Cancelled At">{invoiceDate(invoice.cancelledAt)}</InvoiceField> : null}
        </dl>
        <Separator className="bg-slate-400/40" />
        <dl className="space-y-5"><InvoiceField label="Notes / Terms">{invoice.note}</InvoiceField>{invoice.cancellationReason ? <InvoiceField label="Cancellation reason">{invoice.cancellationReason}</InvoiceField> : null}</dl>
      </div>
      <div className="min-w-0 space-y-7 bg-[#faf9f7] p-5 sm:p-7">
        <div className="grid gap-6 border-t-4 border-slate-900 pt-5 sm:grid-cols-2">
          <section className="min-w-0 space-y-4" aria-label="Invoice sender">
            <h3 className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">From</h3>
            <p className="font-heading text-3xl text-slate-900">PEGAXUS</p>
            <dl className="space-y-3"><InvoiceField label="Contact Person">{invoice.contactPerson.name}</InvoiceField><InvoiceField label="Contact Email">{invoice.contactPerson.email}</InvoiceField><InvoiceField label="Contact Phone">{invoice.contactPerson.phone}</InvoiceField></dl>
          </section>
          <section className="min-w-0 space-y-4" aria-label="Invoice recipient">
            <h3 className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">To</h3>
            <p className="break-words text-xl font-semibold text-slate-900">{customer.name}</p>
            <dl className="space-y-3"><InvoiceField label="Customer Code">{customer.customerCode}</InvoiceField><InvoiceField label="Address">{customer.address}</InvoiceField><InvoiceField label="Email">{customer.email}</InvoiceField><InvoiceField label="Phone">{customer.phone}</InvoiceField></dl>
          </section>
        </div>
        <section aria-label="Invoice items" className="space-y-3">
          <h3 className="font-heading text-lg uppercase text-slate-900">Invoice Items</h3>
          {invoice.items.length ? <Table className="min-w-[520px]">
            <TableHeader className="border-y border-slate-300 bg-[#e9e6de]"><TableRow className="hover:bg-transparent">
              <TableHead scope="col" className="h-11 w-1/2 text-left font-heading text-xs uppercase">Description</TableHead>
              <TableHead scope="col" className="h-11 text-right font-heading text-xs uppercase">Price</TableHead>
              <TableHead scope="col" className="h-11 text-right font-heading text-xs uppercase">Quantity</TableHead>
              <TableHead scope="col" className="h-11 text-right font-heading text-xs uppercase">Total</TableHead>
            </TableRow></TableHeader>
            <TableBody>{invoice.items.map((item, index) => <TableRow key={item.invoiceItemId ?? index} className={`[&>td]:py-4 [&>td]:text-xs ${item.isDepositDeduction ? "bg-amber-50 text-amber-900 hover:bg-amber-50" : "hover:bg-transparent"}`}>
              <TableCell className="min-w-48 whitespace-normal text-left align-top">
                <p className="break-words whitespace-pre-wrap font-semibold">{item.description}</p>
                <p className="mt-1 text-[11px] text-slate-500">{item.isDepositDeduction ? "Deposit Deduction" : humanize(item.itemType)}</p>
                {item.horse ? <p className="mt-1 break-words text-slate-600">Horse: {item.horse.horseName}</p> : null}
                {item.note ? <p className="mt-2 break-words whitespace-pre-wrap text-slate-500">{item.note}</p> : null}
              </TableCell>
              <TableCell className="whitespace-nowrap text-right align-top tabular-nums">{money(item.price, invoice.currency)}</TableCell>
              <TableCell className="text-right align-top tabular-nums">{item.quantity}</TableCell>
              <TableCell className="whitespace-nowrap text-right align-top font-semibold tabular-nums">{money(item.total, invoice.currency)}</TableCell>
            </TableRow>)}</TableBody>
          </Table> : <EmptyState message="No invoice items are available." />}
        </section>
        <section aria-label="Financial summary" className="space-y-4 border-t border-slate-300 pt-5">
          <h3 className="font-heading text-lg uppercase text-slate-900">Financial Summary</h3>
          <dl className="ml-auto w-full max-w-sm space-y-3">{([
            ["Subtotal", summary.subtotal], ["Discount", summary.discount], [`Tax (${summary.taxRatePercent}%)`, summary.tax], ["Deposit Deduction", summary.depositDeduction],
          ] as const).map(([label, amount]) => <div key={label} className="flex flex-wrap justify-between gap-2 text-sm"><dt className="text-slate-600">{label}</dt><dd className="whitespace-nowrap font-medium tabular-nums">{money(amount, invoice.currency)}</dd></div>)}
            <div className="flex flex-wrap justify-between gap-2 border-t-4 border-primary pt-4"><dt className="font-heading text-2xl uppercase text-slate-900">Grand Total</dt><dd className="text-2xl font-semibold text-primary tabular-nums">{money(summary.grandTotal, invoice.currency)}</dd></div>
          </dl>
          <p className="text-right text-xs text-slate-500">Totals are supplied by the invoice service.</p>
        </section>
      </div>
    </section>
    <InvoiceSection title="Booking & Transport Information"><dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <InvoiceField label="Booking Code">{booking.bookingCode}</InvoiceField><InvoiceField label="Departure Date">{invoiceDate(booking.requestedDepartureDate)}</InvoiceField>
      <InvoiceField label="Origin">{booking.originAddress}, {booking.originCountry}</InvoiceField><InvoiceField label="Destination">{booking.destinationAddress}, {booking.destinationCountry}</InvoiceField>
      <InvoiceField label="Transport">{transport ? <span>{transport.transportCode} · {humanize(transport.status)}</span> : "Not linked"}</InvoiceField>
      <InvoiceField label="TransportPlan">{transportPlan ? <span>{manager ? <Link to={transportPlanDetail(transportPlan.transportPlanId)} className="font-semibold text-primary hover:underline">{transportPlan.planCode}</Link> : transportPlan.planCode} · {humanize(transportPlan.status)}</span> : "Not linked"}</InvoiceField>
    </dl></InvoiceSection>
      <InvoiceSection title="Receipts / Payment Information">{invoice.receipts.length ? <div className="grid gap-4 lg:grid-cols-2">{invoice.receipts.map(receipt => <article key={receipt.receiptId} className="min-w-0 space-y-3 rounded-[2px] border border-slate-200 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-semibold">{receipt.receiptCode}</h3><InvoiceBadge value={receipt.status} /></div>
        <dl className="grid gap-3 sm:grid-cols-2"><InvoiceField label="Amount">{money(receipt.amount, receipt.currency)}</InvoiceField><InvoiceField label="Payment Method">{humanize(receipt.paymentMethod)}</InvoiceField>
          <InvoiceField label="Transaction Reference">{receipt.transactionReference}</InvoiceField><InvoiceField label="Recorded By">{receipt.recordedBy?.fullName ?? "Online payment gateway"}</InvoiceField>
          <InvoiceField label="Paid At">{invoiceDate(receipt.paidAt)}</InvoiceField><InvoiceField label="Confirmed At">{invoiceDate(receipt.confirmedAt)}</InvoiceField>
        </dl><dl><InvoiceField label="Note">{receipt.note}</InvoiceField></dl>
      </article>)}</div> : <EmptyState message="No payment receipts exist for this invoice." />}</InvoiceSection>
  </div>
}
