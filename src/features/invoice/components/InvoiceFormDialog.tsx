import { zodResolver } from "@hookform/resolvers/zod"
import { AlertTriangle, FileText, Layers, ReceiptText, Truck, Users } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { Controller, FormProvider, useForm, useWatch, type FieldErrors, type Path } from "react-hook-form"
import { toast } from "sonner"
import { BillingSummaryCard } from "@/features/invoice/components/BillingSummaryCard"
import { InvoiceLineItemsTable } from "@/features/invoice/components/InvoiceLineItemsTable"
import { IssueInvoiceDialog } from "@/features/invoice/components/IssueInvoiceDialog"
import { DEFAULT_INVOICE_CURRENCY, INVOICE_CURRENCY_LABELS, INVOICE_TYPE_HINTS, TRANSPORT_STATUS_LABELS, INVOICE_CURRENCIES, INVOICE_TYPE, INVOICE_TYPE_LABELS } from "@/features/invoice/constants"
import { getInvoiceErrorCode, getInvoiceErrorMessage, InvoiceApiError } from "@/features/invoice/errors"
import { useCreateInvoice, useInvoiceSuggestion, useUpdateInvoice } from "@/features/invoice/hooks/useInvoiceCompose"
import { invoiceFormSchema, invoiceToFormValues, toCreatePayload, toUpdatePayload, type InvoiceFormValues } from "@/features/invoice/schemas"
import type { Invoice, InvoiceBookingContext, InvoiceItem, InvoiceType } from "@/features/invoice/types"
import { estimateSummary, parseDecimal, roundMoney, todayIsoDate } from "@/features/invoice/utils"
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/shared/components/ui/alert-dialog"
import { Button } from "@/shared/components/ui/button"
import { DatePicker } from "@/shared/components/ui/date-picker"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/shared/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select"
import { Textarea } from "@/shared/components/ui/textarea"

const DEFAULT_VALUES: InvoiceFormValues = { type: "QUOTATION", currency: DEFAULT_INVOICE_CURRENCY, dueDate: "", note: "", items: [] }
const fieldLabelClass = "mb-1 block font-heading text-[11px] font-medium uppercase tracking-[0.06em] text-gray-500"
const controlClass = "h-9 w-full rounded-none border-[#d8d5cb] bg-white px-3 text-sm shadow-none"
const panelClass = "border border-[#e5e2d9] bg-white"
const panelHeaderClass = "m-0! flex items-center gap-2 border-b border-[#e5e2d9] bg-[#f7f6f3] px-4 py-2.5 font-heading text-[13px]! font-bold! uppercase tracking-[0.04em]! text-gray-900!"

type Intent = "draft" | "issue"

/** `items[0].quantity` from the BE -> react-hook-form path `items.0.quantity`. */
const toFormPath = (field: string) => field.replace(/\[(\d+)\]/g, ".$1")

interface InvoiceFormDialogProps {
  mode: "create" | "edit"
  booking: InvoiceBookingContext
  /** The saved draft, only in edit mode. */
  invoice?: Invoice
  /** Called for every way out (cancel, close, after saving) with the invoice to show, if one was saved. */
  onClose: (saved?: { invoiceId: string }, options?: { edit?: boolean }) => void
  /** Reload the draft after INVOICE_MODIFIED; the page refetches and remounts the form. */
  onReload?: () => void
}

/**
 * SCR-F6-003 as a modal (design: Create Invoice). Create calls IV2, edit calls IV3 with `lastUpdatedAt`.
 * "Save Draft" keeps the invoice as DRAFT; the primary button saves and then opens the issue confirmation (UC-68).
 */
export function InvoiceFormDialog({ mode, booking, invoice, onClose, onReload }: InvoiceFormDialogProps) {
  const isEdit = mode === "edit" && Boolean(invoice)
  const [selectedType, setSelectedType] = useState<InvoiceType | null>(isEdit && invoice ? invoice.type : null)
  const [formError, setFormError] = useState<string>()
  const [staleOpen, setStaleOpen] = useState(false)
  const [focusRow, setFocusRow] = useState<{ index: number; nonce: number } | null>(null)
  const [issueTarget, setIssueTarget] = useState<Invoice | null>(null)
  const [savingIntent, setSavingIntent] = useState<Intent>("draft")

  const createMutation = useCreateInvoice(booking.bookingId)
  const updateMutation = useUpdateInvoice(invoice?.invoiceId ?? "")
  const isSaving = createMutation.isPending || updateMutation.isPending

  const form = useForm<InvoiceFormValues>({
    resolver: zodResolver(invoiceFormSchema),
    defaultValues: isEdit && invoice ? invoiceToFormValues(invoice) : DEFAULT_VALUES,
    mode: "onTouched",
  })
  const { control, handleSubmit, setValue, setError, register, formState: { errors, isDirty } } = form

  // IV1 only when creating: for an existing draft it would answer INVOICE_ALREADY_EXISTS about the draft itself.
  const suggestionQuery = useInvoiceSuggestion(booking.bookingId, isEdit ? undefined : (selectedType ?? undefined))
  const precheckError = suggestionQuery.isError ? suggestionQuery.error : null
  const depositDeductionItems: InvoiceItem[] = useMemo(
    () => (isEdit && invoice ? invoice.items.filter((item) => item.isDepositDeduction) : (suggestionQuery.data?.items ?? [])),
    [isEdit, invoice, suggestionQuery.data],
  )
  const transportStatus = isEdit ? invoice?.transport?.status : suggestionQuery.data?.transportStatus

  // A FINAL must use the currency of the paid deposit, otherwise the BE answers CURRENCY_MISMATCH.
  const depositCurrency = selectedType === "FINAL" ? (suggestionQuery.data?.currency ?? null) : null
  useEffect(() => {
    if (depositCurrency) setValue("currency", depositCurrency, { shouldDirty: true })
  }, [depositCurrency, setValue])

  const [type, currency, items] = useWatch({ control, name: ["type", "currency", "items"] })
  const parsedLines = (items ?? []).map((item) => ({
    label: item.description?.trim() || "Untitled line",
    quantity: parseDecimal(item.quantity ?? ""),
    price: parseDecimal(item.price ?? ""),
    key: item.invoiceItemId ?? "",
  }))
  const estimate = estimateSummary(parsedLines, depositDeductionItems)
  const summaryLines = [
    ...parsedLines.flatMap((line, index) =>
      Number.isNaN(line.quantity) || Number.isNaN(line.price)
        ? []
        : [{ key: `${line.key}-${index}`, label: line.label, amount: roundMoney(line.quantity * line.price) }],
    ),
  ]

  function pickType(next: InvoiceType) {
    setSelectedType(next)
    setValue("type", next, { shouldDirty: true })
    setFormError(undefined)
  }

  function applyApiError(error: unknown) {
    const code = getInvoiceErrorCode(error)
    if (code === "INVOICE_MODIFIED") return setStaleOpen(true)
    if (code === "INVOICE_LOCKED") {
      toast.error(getInvoiceErrorMessage(error))
      return onClose(invoice)
    }
    if (error instanceof InvoiceApiError && error.errors?.length) {
      error.errors.forEach(({ field, message }) => setError(toFormPath(field) as Path<InvoiceFormValues>, { type: "server", message }))
      const row = /^items\[(\d+)\]/.exec(error.errors[0].field)
      if (row) setFocusRow({ index: Number(row[1]), nonce: Date.now() })
    }
    setFormError(getInvoiceErrorMessage(error))
  }

  function afterSave(saved: Invoice, message: string, next: Intent) {
    toast.success(message)
    if (next === "issue") setIssueTarget(saved)
    else onClose(saved)
  }

  const makeSubmit = (next: Intent) =>
    handleSubmit(
      (values) => {
        setFormError(undefined)
        setSavingIntent(next)
        if (isEdit && invoice) {
          updateMutation.mutate(toUpdatePayload(values, invoice.updatedAt), {
            onSuccess: (saved) => afterSave(saved, "Draft saved", next),
            onError: applyApiError,
          })
          return
        }
        createMutation.mutate(toCreatePayload(values), {
          onSuccess: (saved) => afterSave(saved, `Draft ${saved.invoiceNumber} created`, next),
          onError: applyApiError,
        })
      },
      (invalid: FieldErrors<InvoiceFormValues>) => {
        const firstBad = invalid.items?.findIndex?.((row) => Boolean(row))
        if (typeof firstBad === "number" && firstBad >= 0) setFocusRow({ index: firstBad, nonce: Date.now() })
      },
    )

  function submitWith(next: Intent) {
    // Nothing changed on a saved draft: go straight to the issue confirmation.
    if (next === "issue" && isEdit && invoice && !isDirty) return setIssueTarget(invoice)
    void makeSubmit(next)()
  }

  function reloadLatest() {
    setStaleOpen(false)
    onReload?.()
  }

  const canSave = selectedType !== null && !precheckError && !(suggestionQuery.isFetching && !isEdit)
  const issueLabel = isEdit ? "Issue Invoice" : "Create Invoice"
  const dateLabel = type === "QUOTATION" ? "Valid Until" : "Due Date"

  return (
    <>
      <Dialog open={!issueTarget} onOpenChange={(open) => !open && !isSaving && onClose()}>
        <DialogContent showCloseButton={!isSaving} className="flex h-[94dvh] max-h-[880px] flex-col gap-0 overflow-hidden rounded-none border-0 bg-[#faf9f6] p-0 sm:max-w-[1120px]">
          <header className="flex shrink-0 items-center gap-3 border-b border-[#e5e2d9] bg-white px-6 py-4 pr-14">
            <span className="flex size-10 shrink-0 items-center justify-center bg-[#ef8f00] text-slate-950">
              <ReceiptText className="size-5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <DialogTitle className="m-0! font-heading text-xl! font-bold! uppercase tracking-[0.02em]! text-gray-900!">{isEdit ? "Edit invoice" : "Create invoice"}</DialogTitle>
              <DialogDescription className="m-0 text-xs text-gray-500">
                {isEdit ? "Update this draft invoice before it is issued." : "Generate a draft invoice for this transport."}
              </DialogDescription>
            </div>
          </header>

          <FormProvider {...form}>
            <form
              noValidate
              className="flex min-h-0 flex-1 flex-col"
              onSubmit={(event) => {
                event.preventDefault()
                submitWith("draft")
              }}
            >
              <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-6">
                <dl className={`grid grid-cols-2 lg:grid-cols-4 lg:divide-x lg:divide-[#e5e2d9] ${panelClass}`}>
                  <InfoCell icon={<Truck className="size-4 text-[#ef8f00]" />} label="Invoice for transport" value={booking.transportCode ?? "—"} />
                  <InfoCell icon={<FileText className="size-4 text-sky-600" />} label="Booking" value={booking.bookingCode} />
                  <InfoCell icon={<Users className="size-4 text-violet-600" />} label="Customer" value={booking.customerName || "—"} />
                  <InfoCell
                    icon={<Layers className="size-4 text-[#ef8f00]" />}
                    label="Transport status"
                    value={
                      transportStatus ? (
                        <span className="inline-block border border-emerald-300 bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                          {TRANSPORT_STATUS_LABELS[transportStatus] ?? transportStatus}
                        </span>
                      ) : "—"
                    }
                  />
                </dl>

                <div className="grid items-stretch gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
                  <section className={`flex flex-col ${panelClass}`} aria-label="Invoice details">
                    <h3 className={panelHeaderClass}>
                      <FileText className="size-4 text-[#ef8f00]" aria-hidden="true" />
                      Invoice details
                    </h3>
                    <div className="grid gap-x-4 gap-y-4 p-4 sm:grid-cols-3">
                      <div>
                        <label className={fieldLabelClass} htmlFor="invoice-type">Invoice type <span className="text-red-500">*</span></label>
                        <Select value={selectedType ?? ""} onValueChange={(value) => pickType(value as InvoiceType)} disabled={isEdit || isSaving}>
                          <SelectTrigger id="invoice-type" className={controlClass}><SelectValue placeholder="Select invoice type" /></SelectTrigger>
                          <SelectContent>
                            {Object.values(INVOICE_TYPE).map((option) => <SelectItem key={option} value={option}>{INVOICE_TYPE_LABELS[option]}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className={fieldLabelClass} htmlFor="invoice-currency">Currency <span className="text-red-500">*</span></label>
                        <Controller
                          control={control}
                          name="currency"
                          render={({ field }) => (
                            <Select value={field.value} onValueChange={field.onChange} disabled={Boolean(depositCurrency) || isSaving}>
                              <SelectTrigger id="invoice-currency" className={controlClass}><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {INVOICE_CURRENCIES.map((option) => <SelectItem key={option} value={option}>{INVOICE_CURRENCY_LABELS[option]}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          )}
                        />
                      </div>
                      <div>
                        <label className={fieldLabelClass} htmlFor="invoice-due-date">{dateLabel} <span className="text-red-500">*</span></label>
                        <Controller
                          control={control}
                          name="dueDate"
                          render={({ field }) => (
                            <DatePicker
                              id="invoice-due-date"
                              value={field.value}
                              onChange={field.onChange}
                              onBlur={field.onBlur}
                              minDate={todayIsoDate()}
                              displayFormat="MMM dd, yyyy"
                              placeholder="Pick a date"
                              className={controlClass}
                            />
                          )}
                        />
                        {errors.dueDate ? <p className="mt-1 text-[11px] text-red-600" role="alert">{errors.dueDate.message}</p> : null}
                      </div>

                      <div className="min-h-4 text-[11px] leading-4 text-gray-500 sm:col-span-3 sm:-mt-2">
                        {suggestionQuery.isFetching && !isEdit ? <span role="status">Checking the booking...</span> : null}
                        {!suggestionQuery.isFetching || isEdit ? (selectedType ? INVOICE_TYPE_HINTS[selectedType] : "Quotation, Deposit, Final, Supplementary or Credit note.") : null}
                        {depositCurrency ? " The currency is locked to the paid deposit." : ""}
                      </div>
                      {precheckError ? (
                        <div className="flex gap-2 border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 sm:col-span-3" role="alert">
                          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                          <p>{getInvoiceErrorMessage(precheckError, "Unable to check this booking. Try another type or reload.")}</p>
                        </div>
                      ) : null}

                      <div className="sm:col-span-3">
                        <label className={fieldLabelClass} htmlFor="invoice-note">Notes</label>
                        <Textarea id="invoice-note" rows={2} placeholder="Add any additional notes for this invoice..." className="min-h-[60px] rounded-none border-[#d8d5cb] text-sm shadow-none" {...register("note")} />
                      </div>
                    </div>
                  </section>

                  <BillingSummaryCard lines={summaryLines} summary={estimate} currency={currency} />
                </div>

                <InvoiceLineItemsTable
                  currency={currency}
                  horses={booking.horses}
                  depositDeductionItems={depositDeductionItems}
                  focusRow={focusRow}
                  disabled={isSaving}
                />

                {formError ? <div className="border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700" role="alert">{formError}</div> : null}
              </div>

              <footer className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-[#e5e2d9] bg-white px-6 py-3">
                <Button type="button" variant="outline" className="h-9 rounded-none px-5 font-heading text-xs font-semibold uppercase tracking-[0.05em]" disabled={isSaving} onClick={() => onClose()}>Cancel</Button>
                <Button
                  type="button"
                  variant="outline"
                  className="h-9 rounded-none border-[#ef8f00] px-5 font-heading text-xs font-semibold uppercase tracking-[0.05em] text-slate-900 hover:bg-amber-50 hover:text-slate-950"
                  disabled={isSaving || !canSave || (isEdit && !isDirty)}
                  onClick={() => submitWith("draft")}
                >
                  {isSaving && savingIntent === "draft" ? "Saving..." : "Save draft"}
                </Button>
                <Button
                  type="button"
                  className="h-9 rounded-none bg-[#ef8f00] px-5 font-heading text-xs font-semibold uppercase tracking-[0.05em] text-slate-950 hover:bg-[#db8300]"
                  disabled={isSaving || !canSave}
                  onClick={() => submitWith("issue")}
                >
                  <ReceiptText className="size-4" aria-hidden="true" />
                  {isSaving && savingIntent === "issue" ? "Saving..." : issueLabel}
                </Button>
              </footer>
            </form>
          </FormProvider>
        </DialogContent>
      </Dialog>

      {issueTarget ? (
        <IssueInvoiceDialog
          invoice={issueTarget}
          open
          onOpenChange={(open) => !open && onClose(issueTarget)}
          onBackToEdit={() => (isEdit ? setIssueTarget(null) : onClose(issueTarget, { edit: true }))}
        />
      ) : null}

      <AlertDialog open={staleOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Please reload the page</AlertDialogTitle>
            <AlertDialogDescription>
              The invoice was just updated by another session. Reload to get the latest version. Your unsaved changes will be replaced.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={reloadLatest}>Reload</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

function InfoCell({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="flex min-w-0 items-start gap-2.5 px-4 py-3">
      <span className="mt-0.5 shrink-0" aria-hidden="true">{icon}</span>
      <div className="min-w-0">
        <dt className="font-heading text-[11px] font-medium uppercase tracking-[0.06em] text-gray-500">{label}</dt>
        <dd className="mt-0.5 truncate text-sm font-semibold text-gray-900">{value}</dd>
      </div>
    </div>
  )
}
