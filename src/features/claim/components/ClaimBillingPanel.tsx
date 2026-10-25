import { AlertTriangle } from "lucide-react"
import { Link } from "react-router-dom"
import { invoiceDetail } from "@/app/route-config"
import { Field, SectionTitle } from "@/features/claim/components/ClaimPrimitives"
import { BILLING_WARNING_MESSAGES, CREDIT_NOTE_BLOCKED_MESSAGES } from "@/features/claim/constants"
import type { ClaimBilling } from "@/features/claim/types"
import { formatInvoiceDateTime, formatMoney } from "@/features/invoice/utils"
import { cn } from "@/lib/utils"

const box = "border border-[#e5e2d9] bg-[#f7f6f3] px-3 py-2"

/** The `billing` block of CL4 (manager only): everything comes from the BE, nothing is derived here (R22). */
export function ClaimBillingPanel({ billing }: { billing: ClaimBilling }) {
  const invoice = billing.finalInvoice
  const paid = invoice?.status === "PAID"
  const blocked = billing.creditNote.blockedReason
  return (
    <section aria-label="Final settlement invoice" className="space-y-3">
      <SectionTitle tone="danger">Final settlement invoice</SectionTitle>
      {invoice ? (
        <dl className="grid gap-3 sm:grid-cols-4">
          <Field label="Invoice code" className={box}>
            <Link to={invoiceDetail(invoice.invoiceId)} className="font-semibold text-primary underline-offset-2 hover:underline">{invoice.invoiceNumber}</Link>
          </Field>
          <Field label="Status" className={box}>
            <span className={cn("inline-block px-1.5 py-0.5 font-heading text-[10px] font-bold uppercase tracking-[0.05em] text-white", paid ? "bg-emerald-600" : "bg-red-600")}>{paid ? "Paid" : "Unpaid"}</span>
          </Field>
          <Field label="Total amount" className={box}>{formatMoney(invoice.totalAmount)}</Field>
          <Field label="Paid at" className={box}>{invoice.paidAt ? formatInvoiceDateTime(invoice.paidAt) : "Not paid yet"}</Field>
        </dl>
      ) : (
        <p className={cn(box, "text-xs text-gray-600")}>This booking has no FINAL invoice yet.</p>
      )}
      {billing.warning ? (
        <div className="flex gap-2 border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900" role="alert">
          <AlertTriangle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          <p>{BILLING_WARNING_MESSAGES[billing.warning] ?? billing.warning}</p>
        </div>
      ) : null}
      {!billing.creditNote.eligible && blocked ? (
        <p className="text-xs text-gray-600">Credit note unavailable: {CREDIT_NOTE_BLOCKED_MESSAGES[blocked] ?? blocked}</p>
      ) : null}
      {billing.creditNote.eligible && billing.creditNote.approvedAmount !== null ? (
        <p className="text-xs text-gray-700">Credit note ready for <span className="font-semibold">{formatMoney(billing.creditNote.approvedAmount)}</span>.</p>
      ) : null}
      {billing.bookingCreditNotes.length ? (
        <ul className="space-y-1 text-xs text-gray-700">
          {billing.bookingCreditNotes.map((note) => (
            <li key={note.invoiceId}>
              Credit note <Link to={invoiceDetail(note.invoiceId)} className="font-semibold text-primary hover:underline">{note.invoiceNumber}</Link> · {note.status} · {formatMoney(note.totalAmount)}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  )
}
