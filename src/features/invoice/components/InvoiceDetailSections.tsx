import { Link } from "react-router-dom"
import { transportPlanDetail } from "@/app/route-config"
import { EmptyState } from "@/shared/components/common"
import { Separator } from "@/shared/components/ui/separator"
import type { InvoiceDetail } from "@/features/invoice/types"
import { humanize } from "@/features/invoice/constants"
import { InvoiceItemsTable } from "@/features/invoice/components/InvoiceItemsTable"
import { InvoiceField, InvoiceSection } from "@/features/invoice/components/InvoicePresentation"
import { InvoiceStatusBadge } from "@/features/invoice/components/InvoiceStatusBadge"
import { InvoiceSummaryCard } from "@/features/invoice/components/InvoiceSummaryCard"
import { InvoiceTypeBadge } from "@/features/invoice/components/InvoiceTypeBadge"
import { MoneyText } from "@/features/invoice/components/MoneyText"
import { ReceiptStatusBadge } from "@/features/invoice/components/ReceiptStatusBadge"
import { invoiceDate } from "@/features/invoice/utils"

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
          <InvoiceField label="Type"><InvoiceTypeBadge type={invoice.type} /></InvoiceField>
          <InvoiceField label="Status"><InvoiceStatusBadge status={invoice.status} /></InvoiceField>
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
          <InvoiceItemsTable items={invoice.items} currency={invoice.currency} />
        </section>
        <section aria-label="Financial summary" className="border-t border-slate-300 pt-5">
          <div className="ml-auto w-full max-w-sm"><InvoiceSummaryCard summary={summary} currency={invoice.currency} /></div>
          <p className="mt-2 text-right text-xs text-slate-500">Totals are supplied by the invoice service.</p>
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
        <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-semibold">{receipt.receiptCode}</h3><ReceiptStatusBadge status={receipt.status} /></div>
        <dl className="grid gap-3 sm:grid-cols-2"><InvoiceField label="Amount"><MoneyText amount={receipt.amount} currency={receipt.currency} /></InvoiceField><InvoiceField label="Payment Method">{humanize(receipt.paymentMethod)}</InvoiceField>
          <InvoiceField label="Transaction Reference">{receipt.transactionReference}</InvoiceField><InvoiceField label="Recorded By">{receipt.recordedBy?.fullName ?? "Online payment gateway"}</InvoiceField>
          <InvoiceField label="Paid At">{invoiceDate(receipt.paidAt)}</InvoiceField><InvoiceField label="Confirmed At">{invoiceDate(receipt.confirmedAt)}</InvoiceField>
        </dl><dl><InvoiceField label="Note">{receipt.note}</InvoiceField></dl>
      </article>)}</div> : <EmptyState message="No payment receipts exist for this invoice." />}</InvoiceSection>
  </div>
}
