import { useQueryClient } from "@tanstack/react-query"
import { formatUtcDateTime } from "@/shared/utils/datetime"
import { BadgeCheck, Building2, Calendar, CircleDot, Coins, FileText, Mail, Send, TriangleAlert } from "lucide-react"
import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"
import { invoiceEdit } from "@/app/route-config"
import { ISSUE_CONFIRMATION_TEXT } from "@/features/invoice/constants"
import { getInvoiceErrorCode, getInvoiceErrorMessage } from "@/features/invoice/errors"
import { invoiceKeys, useIssueInvoice } from "@/features/invoice/hooks/useInvoiceCompose"
import type { Invoice, InvoiceType, IssuedInvoice } from "@/features/invoice/types"
import { formatMoney, invoiceDate } from "@/features/invoice/utils"
import { Button } from "@/shared/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/shared/components/ui/dialog"

/** What the dialog reads from the invoice. The full `Invoice` from IV2, IV3 or IV6 fits. */
export type IssueInvoiceDialogInvoice = Pick<
  Invoice,
  "invoiceId" | "invoiceNumber" | "type" | "status" | "createdAt" | "updatedAt" | "invoiceDate" | "dueDate" | "currency" | "items" | "summary" | "customer" | "booking" | "contactPerson"
>

interface IssueInvoiceDialogProps {
  invoice: IssueInvoiceDialogInvoice
  open: boolean
  onOpenChange: (open: boolean) => void
  onIssued?: (issued: IssuedInvoice) => void
  /** "Back to Edit" handler. Defaults to opening the edit page of the draft. */
  onBackToEdit?: () => void
}

const day = (value: string) => formatUtcDateTime(value)

/** Second bullet of "What happens when you issue this invoice?", per UC-68 step 6. */
const NOTIFICATION_TEXT: Record<InvoiceType, string> = {
  QUOTATION: "A quotation notification and email will be sent to the customer. No payment is required.",
  DEPOSIT: "A notification and email with the amount and due date will be sent to the customer.",
  FINAL: "A notification and email with the amount and due date will be sent to the customer.",
  SUPPLEMENTARY: "A notification and email with the amount and due date will be sent to the customer.",
  CREDIT_NOTE: "A notification and email with the compensation amount will be sent to the customer.",
}

/** SCR-F6-004: issue confirmation of UC-68. Sends `lastUpdatedAt` so a stale draft is rejected with INVOICE_MODIFIED. */
export function IssueInvoiceDialog({ invoice, open, onOpenChange, onIssued, onBackToEdit }: IssueInvoiceDialogProps) {
  const issueMutation = useIssueInvoice(invoice.invoiceId)
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [errorCode, setErrorCode] = useState<string>()
  const [errorMessage, setErrorMessage] = useState<string>()
  const { summary, currency } = invoice

  function close(next: boolean) {
    if (issueMutation.isPending) return
    if (!next) {
      setErrorCode(undefined)
      setErrorMessage(undefined)
      issueMutation.reset()
    }
    onOpenChange(next)
  }

  function issue() {
    setErrorCode(undefined)
    setErrorMessage(undefined)
    issueMutation.mutate(invoice.updatedAt, {
      onSuccess: (issued) => {
        toast.success(`Invoice ${issued.invoiceNumber} issued`)
        onOpenChange(false)
        onIssued?.(issued)
      },
      onError: (error) => {
        setErrorCode(getInvoiceErrorCode(error))
        setErrorMessage(getInvoiceErrorMessage(error))
      },
    })
  }

  function reload() {
    void queryClient.invalidateQueries({ queryKey: invoiceKeys.detail(invoice.invoiceId) })
    close(false)
  }

  function backToEdit() {
    if (issueMutation.isPending) return
    if (onBackToEdit) return onBackToEdit()
    navigate(invoiceEdit(invoice.invoiceId))
    onOpenChange(false)
  }

  const needsReload = errorCode === "INVOICE_MODIFIED" || errorCode === "INVALID_INVOICE_STATUS"
  const needsEdit = errorCode === "DEPOSIT_DEDUCTION_CHANGED" || errorCode === "INVOICE_SOURCE_CHANGED" || errorCode === "EMPTY_INVOICE_ITEMS" || errorCode === "INVOICE_TOTAL_NOT_POSITIVE"

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent showCloseButton={!issueMutation.isPending} className="flex max-h-[94dvh] flex-col gap-0 overflow-hidden rounded-none border-0 bg-[#faf9f6] p-0 sm:max-w-[640px]">
        <header className="flex shrink-0 items-center gap-3 border-b border-[#e5e2d9] bg-white px-6 py-4 pr-14">
          <span className="flex size-10 shrink-0 items-center justify-center bg-[#ef8f00] text-slate-950">
            <Send className="size-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <DialogTitle className="m-0! font-heading text-xl! font-bold! uppercase tracking-[0.02em]! text-gray-900!">Issue invoice</DialogTitle>
            <DialogDescription className="m-0 text-xs text-gray-500">Review the details below before issuing this invoice to the customer.</DialogDescription>
          </div>
        </header>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-6">
          <div className="rounded-none border border-[#e5e2d9] bg-white px-4 py-3">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-lg font-bold text-gray-900">{invoice.invoiceNumber}</p>
              <span className="inline-flex items-center gap-1 rounded-none border border-gray-300 bg-white px-2 py-0.5 text-[11px] font-medium text-gray-600">
                <CircleDot className="size-3" aria-hidden="true" />
                Draft
              </span>
            </div>
            <p className="mt-1 text-[11px] text-gray-500">
              Created on {day(invoice.createdAt)} by {invoice.contactPerson.name} · Last updated {day(invoice.updatedAt)}
            </p>
          </div>

          <dl className="grid gap-x-6 gap-y-4 rounded-none border border-[#e5e2d9] p-4 sm:grid-cols-2 sm:[&>div:nth-child(odd)]:border-r sm:[&>div:nth-child(odd)]:pr-4">
            <div className="space-y-4">
              <Detail icon={<Building2 />} label="Customer" value={invoice.customer.name} sub={invoice.customer.customerCode} />
              <Detail icon={<Mail />} label="Billing Email" value={invoice.customer.email} />
              <Detail icon={<FileText />} label="Booking Reference" value={invoice.booking.bookingCode} />
            </div>
            <div className="space-y-4">
              <Detail icon={<Calendar />} label="Invoice Date" value={day(invoice.invoiceDate)} />
              <Detail icon={<Calendar />} label={invoice.type === "QUOTATION" ? "Valid Until" : "Due Date"} value={invoiceDate(invoice.dueDate)} />
              <Detail
                icon={<Coins />}
                label={invoice.type === "QUOTATION" ? "Estimated Total" : "Total Amount"}
                value={<span className="text-xl font-bold text-[#ef8f00]">{formatMoney(summary.grandTotal, currency)}</span>}
                sub={`Including tax ${summary.taxRatePercent}% (${formatMoney(summary.tax, currency)})`}
              />
            </div>
          </dl>

          <section className="rounded-none border border-amber-200 bg-amber-50/70 p-4" aria-label="What happens when you issue this invoice">
            <h3 className="m-0! flex items-center gap-2 text-sm! font-semibold! tracking-normal! text-gray-900!">
              <BadgeCheck className="size-5 text-[#ef8f00]" aria-hidden="true" />
              What happens when you issue this invoice?
            </h3>
            <ul className="mt-3 space-y-2 pl-1 text-xs text-gray-700">
              {["The invoice will be issued to the customer.", NOTIFICATION_TEXT[invoice.type], "Most invoice fields will become locked after issuing (to correct it, cancel it and create a new invoice)."].map((text) => (
                <li key={text} className="flex items-start gap-2">
                  <BadgeCheck className="mt-0.5 size-4 shrink-0 text-[#ef8f00]" aria-hidden="true" />
                  <span>{text}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-none border border-[#e5e2d9] p-4" aria-label="Line item totals">
            <h3 className="m-0! text-sm! font-semibold! tracking-normal! text-gray-900!">Line Item Totals ({invoice.items.length} {invoice.items.length === 1 ? "item" : "items"})</h3>
            <dl className="mt-3 space-y-2 text-xs text-gray-700">
              <TotalRow label="Subtotal" value={formatMoney(summary.subtotal, currency)} />
              <TotalRow label={`Tax (${summary.taxRatePercent}%)`} value={formatMoney(summary.tax, currency)} />
              {summary.depositDeduction !== 0 ? <TotalRow label="Deposit deduction" value={formatMoney(summary.depositDeduction, currency)} /> : null}
              <div className="flex items-baseline justify-between gap-3 border-t border-[#e5e2d9] pt-2">
                <dt className="text-sm font-bold text-gray-900">Total Amount</dt>
                <dd className="text-base font-bold tabular-nums text-[#ef8f00]">{formatMoney(summary.grandTotal, currency)}</dd>
              </div>
            </dl>
          </section>

          {errorMessage ? (
            <div className="rounded-none border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700" role="alert">
              <p>{errorMessage}</p>
              {needsEdit ? <button type="button" className="mt-1 font-semibold underline" onClick={backToEdit}>Open the draft</button> : null}
            </div>
          ) : null}

          <div className="flex items-start gap-3 rounded-none border border-amber-200 bg-amber-50 px-4 py-3" role="note">
            <TriangleAlert className="mt-0.5 size-5 shrink-0 text-[#ef8f00]" aria-hidden="true" />
            <div className="text-xs text-gray-700">
              <p className="font-semibold text-amber-900">Please review the invoice details carefully before issuing.</p>
              <p className="mt-0.5">{ISSUE_CONFIRMATION_TEXT[invoice.type]}</p>
            </div>
          </div>
        </div>

        <footer className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-[#e5e2d9] bg-white px-6 py-3">
          <Button type="button" variant="outline" className="h-9 rounded-none px-5 font-heading text-xs font-semibold uppercase tracking-[0.05em]" disabled={issueMutation.isPending} onClick={backToEdit}>
            Back to edit
          </Button>
          {needsReload ? (
            <Button type="button" className="h-9 rounded-none bg-[#ef8f00] px-5 font-heading text-xs font-semibold uppercase tracking-[0.05em] text-slate-950 hover:bg-[#db8300]" onClick={reload}>Reload invoice</Button>
          ) : (
            <Button type="button" className="h-9 rounded-none bg-[#ef8f00] px-5 font-heading text-xs font-semibold uppercase tracking-[0.05em] text-slate-950 hover:bg-[#db8300]" disabled={issueMutation.isPending} onClick={issue}>
              <Send className="size-4" aria-hidden="true" />
              {issueMutation.isPending ? "Issuing..." : "Issue Invoice"}
            </Button>
          )}
        </footer>
      </DialogContent>
    </Dialog>
  )
}

function Detail({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: React.ReactNode; sub?: string }) {
  return (
    <div className="flex min-w-0 items-start gap-3">
      <span className="mt-0.5 shrink-0 text-gray-400 [&_svg]:size-5" aria-hidden="true">{icon}</span>
      <div className="min-w-0">
        <dt className="text-[11px] text-gray-500">{label}</dt>
        <dd className="mt-0.5 break-words text-sm font-semibold text-gray-900">{value}</dd>
        {sub ? <p className="text-[11px] text-gray-500">{sub}</p> : null}
      </div>
    </div>
  )
}

function TotalRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt>{label}</dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
  )
}
