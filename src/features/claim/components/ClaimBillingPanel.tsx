import { AlertTriangle } from "lucide-react"
import { Link } from "react-router-dom"
import { invoiceDetail } from "@/app/route-config"
import { CardTitle, Field, panelClass } from "@/features/claim/components/ClaimPrimitives"
import { BILLING_WARNING_MESSAGES, CREDIT_NOTE_BLOCKED_MESSAGES } from "@/features/claim/constants"
import type { ClaimBilling } from "@/features/claim/types"
import { formatInvoiceDateTime, formatMoney } from "@/features/invoice/utils"
import { cn } from "@/lib/utils"
import { Badge } from "@/shared/components/ui/badge"

/** The `billing` block of CL4 (manager only): everything comes from the BE, nothing is derived here (R22). */
export function ClaimBillingPanel({ billing }: { billing: ClaimBilling }) {
  const invoice = billing.finalInvoice
  const paid = invoice?.status === "PAID"
  const blocked = billing.creditNote.blockedReason
  return (
    <section aria-label="Final settlement invoice" className={cn(panelClass, "p-4")}>
      <CardTitle>Final settlement invoice</CardTitle>
      <div className="mt-3 space-y-2.5">
        {invoice ? (
          <dl className="space-y-1.5">
            <Field label="Invoice code">
              <Link to={invoiceDetail(invoice.invoiceId)} className="font-semibold text-primary underline-offset-2 hover:underline">{invoice.invoiceNumber}</Link>
            </Field>
            <Field label="Status">
              <Badge className={cn("inline-flex h-5 rounded-full px-2 py-0 text-[0.65rem] font-medium leading-none", paid ? "border-emerald-300 bg-emerald-50 text-emerald-700" : "border-red-300 bg-red-50 text-red-700")}>{paid ? "Paid" : "Unpaid"}</Badge>
            </Field>
            <Field label="Total amount">{formatMoney(invoice.totalAmount)}</Field>
            <Field label="Paid at">{invoice.paidAt ? formatInvoiceDateTime(invoice.paidAt) : "Not paid yet"}</Field>
          </dl>
        ) : (
          <p className="text-xs text-gray-600">This booking has no FINAL invoice yet.</p>
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
      </div>
    </section>
  )
}
