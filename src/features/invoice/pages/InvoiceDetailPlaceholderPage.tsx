import { useState } from "react"
import { Link, useParams } from "react-router-dom"

import { invoiceEdit, ROLE_ROUTES } from "@/app/route-config"
import { InvoiceStatusBadge, InvoiceTypeBadge } from "@/features/invoice/components/InvoiceBadges"
import { IssueInvoiceDialog } from "@/features/invoice/components/IssueInvoiceDialog"
import { getInvoiceErrorMessage } from "@/features/invoice/errors"
import { useInvoice } from "@/features/invoice/hooks"
import { formatMoney } from "@/features/invoice/utils"
import { ErrorState, LoadingState } from "@/shared/components/common"
import { PageHeader } from "@/shared/components/PageHeader"

const buttonClass =
  "inline-flex h-9 items-center justify-center whitespace-nowrap rounded-[2px] border px-4 font-heading text-[11px] font-semibold uppercase tracking-[0.04em] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"

/**
 * TEMPORARY stand-in for the invoice detail page (invoice-view feature, SCR-F6-002, owned by Duong). It only lets the
 * create, edit and issue flows land somewhere and be tried end to end: the invoice number, status, the lines and the
 * Edit / Issue buttons that `availableActions` allows. Replace the `invoices/:invoiceId` route with the real page
 * when it is merged and delete this file.
 */
export default function InvoiceDetailPlaceholderPage() {
  const { invoiceId = "" } = useParams()
  const invoiceQuery = useInvoice(invoiceId)
  const [issueOpen, setIssueOpen] = useState(false)
  const invoice = invoiceQuery.data

  return (
    <div className="min-h-[70dvh] bg-[#f4f2ed] px-5 pt-5 pb-8 sm:px-6 lg:px-10">
      <div className="mx-auto w-full max-w-[960px]">
        <PageHeader title="INVOICE DETAILS" backHref={ROLE_ROUTES.invoices} backLabel="BACK TO INVOICES" />

        {invoiceQuery.isLoading ? <LoadingState /> : null}
        {invoiceQuery.isError ? (
          <ErrorState message={getInvoiceErrorMessage(invoiceQuery.error, "Unable to load this invoice.")} onRetry={() => void invoiceQuery.refetch()} />
        ) : null}

        {invoice ? (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2 border border-[#e5e2d9] bg-white p-3">
              <InvoiceTypeBadge type={invoice.type} />
              <InvoiceStatusBadge status={invoice.status} />
              <span className="text-xs text-gray-600">{invoice.invoiceNumber}</span>
              <span className="text-xs text-gray-400">· {invoice.customer.name} · {invoice.booking.bookingCode}</span>
              <div className="ml-auto flex flex-wrap gap-2">
                {invoice.availableActions.includes("EDIT") ? (
                  <Link to={invoiceEdit(invoice.invoiceId)} className={`${buttonClass} border-gray-900 bg-white text-gray-900 hover:bg-gray-100`}>
                    Edit invoice
                  </Link>
                ) : null}
                {invoice.availableActions.includes("ISSUE") ? (
                  <button type="button" className={`${buttonClass} border-primary bg-primary text-gray-900 hover:bg-primary-hover`} onClick={() => setIssueOpen(true)}>
                    Issue invoice
                  </button>
                ) : null}
              </div>
            </div>

            <div className="border border-[#e5e2d9] bg-white p-4 text-xs text-gray-700">
              <ul className="divide-y divide-gray-100">
                {invoice.items.map((item) => (
                  <li key={item.invoiceItemId ?? item.description} className="flex items-baseline justify-between gap-3 py-2">
                    <span className="min-w-0 break-words">{item.description} <span className="text-gray-400">× {item.quantity}</span></span>
                    <span className="whitespace-nowrap tabular-nums">{formatMoney(item.total, invoice.currency)}</span>
                  </li>
                ))}
              </ul>
              <dl className="mt-3 space-y-1 border-t border-gray-200 pt-3">
                <div className="flex justify-between"><dt>Subtotal</dt><dd className="tabular-nums">{formatMoney(invoice.summary.subtotal, invoice.currency)}</dd></div>
                <div className="flex justify-between"><dt>Tax ({invoice.summary.taxRatePercent}%)</dt><dd className="tabular-nums">{formatMoney(invoice.summary.tax, invoice.currency)}</dd></div>
                <div className="flex justify-between text-sm font-bold text-gray-900"><dt>Total</dt><dd className="tabular-nums">{formatMoney(invoice.summary.grandTotal, invoice.currency)}</dd></div>
              </dl>
            </div>

            <IssueInvoiceDialog invoice={invoice} open={issueOpen} onOpenChange={setIssueOpen} />
          </div>
        ) : null}
      </div>
    </div>
  )
}
