import { zodResolver } from "@hookform/resolvers/zod"
import { AlertTriangle, FileText, Layers, ReceiptText, Truck, Users } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { Controller, FormProvider, useForm, useWatch, type FieldErrors, type Path } from "react-hook-form"
import { toast } from "sonner"

import { BillingSummaryCard } from "@/features/invoice/components/BillingSummaryCard"
import { InvoiceLineItemsTable } from "@/features/invoice/components/InvoiceLineItemsTable"
import { IssueInvoiceDialog } from "@/features/invoice/components/IssueInvoiceDialog"
import {
  DEFAULT_INVOICE_CURRENCY,
  INVOICE_CURRENCIES,
  INVOICE_CURRENCY_LABELS,
  INVOICE_TYPES,
  INVOICE_TYPE_HINTS,
  INVOICE_TYPE_LABELS,
  TRANSPORT_STATUS_LABELS,
} from "@/features/invoice/constants"
import { getInvoiceErrorCode, getInvoiceErrorMessage, InvoiceApiError } from "@/features/invoice/errors"
import { useCreateInvoice, useInvoiceSuggestion, useUpdateInvoice } from "@/features/invoice/hooks"
import {
  invoiceFormSchema,
  invoiceToFormValues,
  toCreatePayload,
  toUpdatePayload,
  type InvoiceFormValues,
} from "@/features/invoice/schemas"
import type { Invoice, InvoiceBookingContext, InvoiceItem, InvoiceType } from "@/features/invoice/types"
import { estimateSummary, parseDecimal, roundMoney, todayIsoDate } from "@/features/invoice/utils"
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/shared/components/ui/alert-dialog"
import { Button } from "@/shared/components/ui/button"
import { DatePicker } from "@/shared/components/ui/date-picker"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/shared/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select"
import { Textarea } from "@/shared/components/ui/textarea"

const DEFAULT_VALUES: InvoiceFormValues = { type: "QUOTATION", currency: DEFAULT_INVOICE_CURRENCY, dueDate: "", note: "", items: [] }
const fieldLabelClass = "mb-1 block text-xs font-semibold text-gray-800"

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
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
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
      if (row) setEditingIndex(Number(row[1]))
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
        if (typeof firstBad === "number" && firstBad >= 0) setEditingIndex(firstBad)
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
        <DialogContent showCloseButton={!isSaving} className="flex max-h-[92dvh] flex-col gap-0 overflow-hidden rounded-2xl border-0 p-0 sm:max-w-[900px]">
          <header className="flex shrink-0 items-start gap-3 px-6 pt-5 pb-3 pr-12">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-orange-50 text-orange-500">
              <ReceiptText className="size-5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <DialogTitle className="m-0! text-xl! font-semibold! tracking-normal! text-gray-900!">{isEdit ? "Edit Invoice" : "Create Invoice"}</DialogTitle>
              <DialogDescription className="m-0 text-sm text-gray-500">
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
              <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 pb-4">
                <dl className="grid grid-cols-2 gap-x-4 gap-y-3 rounded-xl border border-gray-200 bg-gray-50 p-3 lg:grid-cols-4">
                  <InfoCell icon={<Truck className="size-4 text-orange-500" />} label="Invoice for Transport" value={booking.transportCode ?? "—"} />
                  <InfoCell icon={<FileText className="size-4 text-blue-500" />} label="Booking" value={booking.bookingCode} />
                  <InfoCell icon={<Users className="size-4 text-violet-500" />} label="Customer" value={booking.customerName || "—"} />
                  <InfoCell
                    icon={<Layers className="size-4 text-orange-500" />}
                    label="Status"
                    value={
                      transportStatus ? (
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                          {TRANSPORT_STATUS_LABELS[transportStatus] ?? transportStatus}
                        </span>
                      ) : "—"
                    }
                  />
                </dl>

                <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
                  <section className="min-w-0" aria-label="Invoice details">
                    <h3 className="m-0! mb-3 flex items-center gap-2 text-sm! font-semibold! tracking-normal! text-gray-900!">
                      <FileText className="size-4 text-orange-500" aria-hidden="true" />
                      Invoice Details
                    </h3>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="sm:col-span-2">
                        <label className={fieldLabelClass} htmlFor="invoice-type">Invoice Type <span className="text-red-500">*</span></label>
                        <Select value={selectedType ?? ""} onValueChange={(value) => pickType(value as InvoiceType)} disabled={isEdit || isSaving}>
                          <SelectTrigger id="invoice-type" className="h-10 w-full rounded-lg text-sm"><SelectValue placeholder="Select invoice type" /></SelectTrigger>
                          <SelectContent>
                            {INVOICE_TYPES.map((option) => <SelectItem key={option} value={option}>{INVOICE_TYPE_LABELS[option]}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <p className="mt-1 text-[11px] text-gray-500">{selectedType ? INVOICE_TYPE_HINTS[selectedType] : "Quotation, Deposit, Final, Supplementary or Credit note."}</p>
                        {suggestionQuery.isFetching && !isEdit ? <p className="mt-1 text-[11px] text-gray-500" role="status">Checking the booking...</p> : null}
                        {precheckError ? (
                          <div className="mt-2 flex gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700" role="alert">
                            <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                            <p>{getInvoiceErrorMessage(precheckError, "Unable to check this booking. Try another type or reload.")}</p>
                          </div>
                        ) : null}
                      </div>

                      <div>
                        <label className={fieldLabelClass} htmlFor="invoice-currency">Currency <span className="text-red-500">*</span></label>
                        <Controller
                          control={control}
                          name="currency"
                          render={({ field }) => (
                            <Select value={field.value} onValueChange={field.onChange} disabled={Boolean(depositCurrency) || isSaving}>
                              <SelectTrigger id="invoice-currency" className="h-10 w-full rounded-lg text-sm"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {INVOICE_CURRENCIES.map((option) => <SelectItem key={option} value={option}>{INVOICE_CURRENCY_LABELS[option]}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          )}
                        />
                        {depositCurrency ? <p className="mt-1 text-[11px] text-gray-500">Locked to the currency of the paid deposit.</p> : null}
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
                              className="h-10 w-full rounded-lg text-sm"
                            />
                          )}
                        />
                        {errors.dueDate ? <p className="mt-1 text-[11px] text-red-600" role="alert">{errors.dueDate.message}</p> : null}
                      </div>

                      <div className="sm:col-span-2">
                        <label className={fieldLabelClass} htmlFor="invoice-note">Notes</label>
                        <Textarea id="invoice-note" rows={3} placeholder="Add any additional notes for this invoice..." className="rounded-lg text-sm" {...register("note")} />
                      </div>
                    </div>
                  </section>

                  <BillingSummaryCard lines={summaryLines} summary={estimate} currency={currency} />
                </div>

                <InvoiceLineItemsTable
                  currency={currency}
                  horses={booking.horses}
                  depositDeductionItems={depositDeductionItems}
                  editingIndex={editingIndex}
                  onEditingIndexChange={setEditingIndex}
                  disabled={isSaving}
                />

                {formError ? <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700" role="alert">{formError}</div> : null}
              </div>

              <footer className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-gray-100 bg-white px-6 py-3">
                <Button type="button" variant="outline" className="h-9 px-5 text-sm" disabled={isSaving} onClick={() => onClose()}>Cancel</Button>
                <Button
                  type="button"
                  variant="outline"
                  className="h-9 border-orange-300 px-5 text-sm text-orange-600 hover:bg-orange-50 hover:text-orange-700"
                  disabled={isSaving || !canSave || (isEdit && !isDirty)}
                  onClick={() => submitWith("draft")}
                >
                  {isSaving && savingIntent === "draft" ? "Saving..." : "Save Draft"}
                </Button>
                <Button
                  type="button"
                  className="h-9 bg-orange-600 px-5 text-sm text-white hover:bg-orange-700"
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
    <div className="flex min-w-0 items-start gap-2">
      <span className="mt-0.5 shrink-0" aria-hidden="true">{icon}</span>
      <div className="min-w-0">
        <dt className="text-[11px] text-gray-500">{label}</dt>
        <dd className="mt-0.5 truncate text-sm font-semibold text-gray-900">{value}</dd>
      </div>
    </div>
  )
}
