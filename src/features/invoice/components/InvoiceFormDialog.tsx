import { zodResolver } from "@hookform/resolvers/zod"
import { AlertTriangle, FileText, Layers, ReceiptText, Truck, Users } from "lucide-react"
import { useMemo, useState } from "react"
import { Controller, FormProvider, useForm, useWatch, type FieldErrors, type Path } from "react-hook-form"
import { toast } from "sonner"
import { BillingSummaryCard } from "@/features/invoice/components/BillingSummaryCard"
import { GeneratedLinesTable } from "@/features/invoice/components/GeneratedLinesTable"
import { InvoiceLineItemsTable } from "@/features/invoice/components/InvoiceLineItemsTable"
import { IssueInvoiceDialog } from "@/features/invoice/components/IssueInvoiceDialog"
import { DEFAULT_INVOICE_CURRENCY, INVOICE_CURRENCY_LABELS, INVOICE_STATUS, INVOICE_TAX_RATE_PERCENT, INVOICE_TYPE_HINTS, TRANSIT_DAYS_RANGE, TRANSPORT_STATUS_LABELS, INVOICE_TYPE, INVOICE_TYPE_LABELS, initialInvoiceParams, isGeneratedInvoiceType, QUOTATION_FORMULA_MAX_HORSES } from "@/features/invoice/constants"
import { getInvoiceErrorCode, getInvoiceErrorMessage, InvoiceApiError } from "@/features/invoice/errors"
import { useCreateInvoice, useInvoiceSuggestion, useUpdateInvoice } from "@/features/invoice/hooks/useInvoiceCompose"
import { useBookingInvoices } from "@/features/invoice/hooks/useInvoices"
import { invoiceFormSchema, invoiceToFormValues, prefillToFormValues, toCreatePayload, toUpdatePayload, type InvoiceFormValues } from "@/features/invoice/schemas"
import type { Invoice, InvoiceBookingContext, InvoiceItem, InvoicePrefill, InvoiceType } from "@/features/invoice/types"
import { formatUtcDateTime, toUtcIso } from "@/shared/utils/datetime"
import { DEFAULT_DUE_TIME, estimateSummary, formatMoney, parseTransitDays, parseWholeNumber, roundMoney, todayIsoDate } from "@/features/invoice/utils"
import { useDebounce } from "@/shared/hooks"
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/shared/components/ui/alert-dialog"
import { Button } from "@/shared/components/ui/button"
import { DatePicker } from "@/shared/components/ui/date-picker"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/shared/components/ui/dialog"
import { Input } from "@/shared/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select"
import { Textarea } from "@/shared/components/ui/textarea"
import { TimePicker } from "@/shared/components/ui/time-picker"

const DEFAULT_VALUES: InvoiceFormValues = { type: "QUOTATION", dueDate: "", dueTime: DEFAULT_DUE_TIME, note: "", transitDays: "", items: [] }
const fieldLabelClass = "mb-1 block font-heading text-[11px] font-medium uppercase tracking-[0.06em] text-gray-500"
const controlClass = "h-9 w-full rounded-none border-[#d8d5cb] bg-white px-3 text-sm shadow-none"
const panelClass = "border border-[#e5e2d9] bg-white"
const panelHeaderClass = "m-0! flex items-center gap-2 border-b border-[#e5e2d9] bg-[#f7f6f3] px-4 py-2.5 font-heading text-[13px]! font-bold! uppercase tracking-[0.04em]! text-gray-900!"

type Intent = "draft" | "issue"

/** A booking has at most one deposit invoice that is not cancelled: only its cancellation allows another one. */
const DEPOSIT_LOOKUP = { ...initialInvoiceParams, pageSize: 50, type: INVOICE_TYPE.DEPOSIT }

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
  /** Create mode only: type and lines handed over by another screen (a claim's credit note). */
  prefill?: InvoicePrefill
}

/**
 * SCR-F6-003 as a modal (design: Create Invoice). Create calls IV2, edit calls IV3 with `lastUpdatedAt`.
 * "Save Draft" keeps the invoice as DRAFT; the primary button saves and then opens the issue confirmation (UC-68).
 */
export function InvoiceFormDialog({ mode, booking, invoice, onClose, onReload, prefill }: InvoiceFormDialogProps) {
  const isEdit = mode === "edit" && Boolean(invoice)
  const [selectedType, setSelectedType] = useState<InvoiceType | null>(isEdit && invoice ? invoice.type : (prefill?.type ?? null))
  const [formError, setFormError] = useState<string>()
  const [staleOpen, setStaleOpen] = useState(false)
  const [focusRow, setFocusRow] = useState<{ index: number; nonce: number } | null>(null)
  const [issueTarget, setIssueTarget] = useState<Invoice | null>(null)
  const [savingIntent, setSavingIntent] = useState<Intent>("draft")

  const createMutation = useCreateInvoice(booking.bookingId)
  const updateMutation = useUpdateInvoice(invoice?.invoiceId ?? "")
  const isSaving = createMutation.isPending || updateMutation.isPending

  // A saved QUOTATION of a booking beyond the formula (0 or 10+ horses) has lines the manager typed.
  const savedLocked =
    isEdit && invoice
      ? isGeneratedInvoiceType(invoice.type) &&
        !(invoice.type === INVOICE_TYPE.QUOTATION && (booking.horses.length === 0 || booking.horses.length > QUOTATION_FORMULA_MAX_HORSES))
      : false

  const form = useForm<InvoiceFormValues>({
    resolver: zodResolver(invoiceFormSchema),
    defaultValues: isEdit && invoice ? invoiceToFormValues(invoice, savedLocked) : { ...DEFAULT_VALUES, ...(prefill ? prefillToFormValues(prefill) : {}) },
    mode: "onTouched",
  })
  const { control, handleSubmit, setValue, setError, register, formState: { errors, isDirty } } = form
  const [type, items, transitDaysInput] = useWatch({ control, name: ["type", "items", "transitDays"] })
  const [dueDateValue, dueTimeValue] = useWatch({ control, name: ["dueDate", "dueTime"] })
  // The day and the clock time are the viewer's own; the BE gets (and shows everyone else) the UTC instant.
  const dueUtcPreview = dueDateValue && dueTimeValue ? toUtcIso(`${dueDateValue}T${dueTimeValue}`) : undefined
  // The days re-price a QUOTATION through IV1; wait until typing stops and the number is valid.
  const debouncedDays = useDebounce(transitDaysInput ?? "", 400)
  const transitDays = selectedType === INVOICE_TYPE.QUOTATION ? parseTransitDays(debouncedDays) : undefined

  const depositsQuery = useBookingInvoices(booking.bookingId, DEPOSIT_LOOKUP, "manager")
  const activeDeposit = isEdit ? undefined : depositsQuery.data?.items.find((item) => item.status !== INVOICE_STATUS.CANCELLED)
  const depositBlocked = Boolean(activeDeposit) && selectedType === INVOICE_TYPE.DEPOSIT

  // IV1 only when creating: for an existing draft it would answer INVOICE_ALREADY_EXISTS about the draft itself.
  const suggestionQuery = useInvoiceSuggestion(booking.bookingId, isEdit ? undefined : (selectedType ?? undefined), transitDays)
  // IV1 `isLocked` decides whether the server builds the lines; until it answers (or if it is for another type), the type decides.
  const suggestion = suggestionQuery.data?.type === selectedType ? suggestionQuery.data : undefined
  const locked = isEdit ? savedLocked : (suggestion?.isLocked ?? isGeneratedInvoiceType(selectedType))
  // A QUOTATION typed by hand (10+ horses) must carry a note.
  const noteRequired = !locked && selectedType === INVOICE_TYPE.QUOTATION
  const precheckError = suggestionQuery.isError ? suggestionQuery.error : null
  // QUOTATION, DEPOSIT and FINAL: the server builds the lines (IV1 while creating, the saved draft while editing), deposit deductions included.
  const generatedItems: InvoiceItem[] = useMemo(
    () => (isEdit && invoice ? invoice.items : (suggestionQuery.data?.items ?? [])),
    [isEdit, invoice, suggestionQuery.data],
  )
  const depositDeductionItems = useMemo(() => generatedItems.filter((item) => item.isDepositDeduction), [generatedItems])
  const generatedLines = useMemo(() => generatedItems.filter((item) => !item.isDepositDeduction), [generatedItems])
  const transportStatus = isEdit ? invoice?.transport?.status : suggestionQuery.data?.transportStatus

  const parsedLines = locked
    ? generatedLines.map((item) => ({ label: item.description, quantity: item.quantity, price: item.price, key: item.invoiceItemId ?? "" }))
    : (items ?? []).map((item) => ({
        label: item.description?.trim() || "Untitled line",
        quantity: parseWholeNumber(item.quantity ?? ""),
        price: parseWholeNumber(item.price ?? ""),
        key: item.invoiceItemId ?? "",
      }))
  // IV1 answers no totals, so the form adds the lines itself; a credit note carries no tax.
  const taxRatePercent = selectedType === INVOICE_TYPE.CREDIT_NOTE ? 0 : (suggestionQuery.data?.pricing?.taxRatePercent ?? invoice?.summary.taxRatePercent ?? INVOICE_TAX_RATE_PERCENT)
  const estimate = estimateSummary(parsedLines, locked ? depositDeductionItems : [], taxRatePercent)
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
    // Rows typed for a manual type must not block (or be sent with) a type whose lines the server builds.
    if (isGeneratedInvoiceType(next)) setValue("items", [])
    form.clearErrors()
    setFormError(undefined)
  }

  function applyApiError(error: unknown) {
    const code = getInvoiceErrorCode(error)
    if (code === "INVOICE_MODIFIED") return setStaleOpen(true)
    if (code === "INVOICE_ITEMS_GENERATED") toast.error(getInvoiceErrorMessage(error))
    if (code === "INVOICE_LOCKED") {
      toast.error(getInvoiceErrorMessage(error))
      return onClose(invoice)
    }
    if (error instanceof InvoiceApiError && error.errors?.length) {
      // The BE may name a field in PascalCase ("DueDate"); the form fields start with a lower-case letter.
      const fieldOf = (field: string) => field.charAt(0).toLowerCase() + field.slice(1)
      error.errors.forEach(({ field, message }) => setError(toFormPath(fieldOf(field)) as Path<InvoiceFormValues>, { type: "server", message }))
      const row = /^items\[(\d+)\]/.exec(error.errors[0].field)
      if (row) setFocusRow({ index: Number(row[1]), nonce: Date.now() })
      // A message that already sits under its own field (due date, note, transit days) is not repeated in the banner.
      if (error.errors.every(({ field }) => ["dueDate", "note", "transitDays"].includes(fieldOf(field)))) return
    }
    setFormError(getInvoiceErrorMessage(error))
  }

  function afterSave(saved: Invoice, message: string, next: Intent) {
    toast.success(message)
    // The server rebuilds generated lines on every save: say so when the amount differs from what the manager just saw.
    const shown = isEdit && invoice ? invoice.summary.grandTotal : estimate.grandTotal
    if (locked && saved.summary.grandTotal !== shown)
      toast.warning(`The system recalculated this invoice: total ${formatMoney(shown)} → ${formatMoney(saved.summary.grandTotal)}.`)
    if (next === "issue") setIssueTarget(saved)
    else onClose(saved)
  }

  const makeSubmit = (next: Intent) =>
    handleSubmit(
      (values) => {
        setFormError(undefined)
        if (noteRequired && !values.note.trim()) {
          setError("note", { type: "manual", message: "Add a note: this quotation is typed by hand because the booking has 10 or more horses." })
          return
        }
        setSavingIntent(next)
        if (isEdit && invoice) {
          updateMutation.mutate(toUpdatePayload(values, invoice.updatedAt, locked), {
            onSuccess: (saved) => afterSave(saved, "Draft saved", next),
            onError: applyApiError,
          })
          return
        }
        createMutation.mutate(toCreatePayload(values, locked), {
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

  const transportCancelled = transportStatus === "CANCELLED"
  const canSave = selectedType !== null && !precheckError && !depositBlocked && !transportCancelled && !(suggestionQuery.isFetching && !isEdit)
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
                    <div className="grid gap-x-4 gap-y-4 p-4 sm:grid-cols-2">
                      <div>
                        <label className={fieldLabelClass} htmlFor="invoice-type">Invoice type <span className="text-red-500">*</span></label>
                        <Select value={selectedType ?? ""} onValueChange={(value) => pickType(value as InvoiceType)} disabled={isEdit || isSaving}>
                          <SelectTrigger id="invoice-type" className={controlClass}><SelectValue placeholder="Select invoice type" /></SelectTrigger>
                          <SelectContent>
                            {Object.values(INVOICE_TYPE).map((option) => {
                              const taken = option === INVOICE_TYPE.DEPOSIT && Boolean(activeDeposit)
                              return <SelectItem key={option} value={option} disabled={taken}>{INVOICE_TYPE_LABELS[option]}{taken ? " (already created)" : ""}</SelectItem>
                            })}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className={fieldLabelClass} htmlFor="invoice-due-date">{dateLabel} <span className="text-red-500">*</span></label>
                        <div className="grid grid-cols-[minmax(0,1fr)_7.5rem] gap-2">
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
                          <Controller
                            control={control}
                            name="dueTime"
                            render={({ field }) => (
                              <TimePicker
                                id="invoice-due-time"
                                aria-label="Due time"
                                value={field.value}
                                onChange={field.onChange}
                                onBlur={field.onBlur}
                                className={controlClass}
                              />
                            )}
                          />
                        </div>
                        {dueUtcPreview ? <p className="mt-1 text-[11px] text-gray-500">Your local time. Due at <span className="font-semibold text-gray-700">{formatUtcDateTime(dueUtcPreview)}</span></p> : null}
                        {errors.dueDate || errors.dueTime ? <p className="mt-1 text-[11px] text-red-600" role="alert">{errors.dueDate?.message ?? errors.dueTime?.message}</p> : null}
                      </div>

                      <div>
                        <p className={fieldLabelClass}>Currency</p>
                        {/* VND is the only supported currency, so there is nothing to choose. */}
                        <div id="invoice-currency" className={`${controlClass} flex items-center bg-[#f7f6f3] text-gray-700`}>{INVOICE_CURRENCY_LABELS.VND}</div>
                      </div>

                      {selectedType === INVOICE_TYPE.QUOTATION ? (
                        <div>
                          <label className={fieldLabelClass} htmlFor="invoice-transit-days">Transit days</label>
                          <Input
                            id="invoice-transit-days"
                            inputMode="numeric"
                            maxLength={2}
                            disabled={isSaving}
                            placeholder={suggestionQuery.data?.pricing?.transitDays ? `Auto: ${suggestionQuery.data.pricing.transitDays}` : "Auto from booking dates"}
                            aria-invalid={Boolean(errors.transitDays)}
                            className={controlClass}
                            onKeyDown={(event) => { if ([".", ",", "e", "E", "+", "-"].includes(event.key)) event.preventDefault() }}
                            {...register("transitDays")}
                          />
                          {errors.transitDays ? <p className="mt-1 text-[11px] text-red-600" role="alert">{errors.transitDays.message}</p> : (
                            <p className="mt-1 text-[11px] text-gray-500">{TRANSIT_DAYS_RANGE.min}–{TRANSIT_DAYS_RANGE.max} days. Empty = from booking dates.</p>
                          )}
                        </div>
                      ) : null}

                      <div className="min-h-4 text-[11px] leading-4 text-gray-500 sm:col-span-2 sm:-mt-2">
                        {suggestionQuery.isFetching && !isEdit ? <span role="status">Checking the booking...</span> : null}
                        {!suggestionQuery.isFetching || isEdit ? (selectedType ? INVOICE_TYPE_HINTS[selectedType] : "Quotation, Deposit, Final, Supplementary or Credit note.") : null}
                      </div>
                      {depositBlocked && activeDeposit ? (
                        <div className="flex gap-2 border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900 sm:col-span-2" role="alert">
                          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                          <p>This booking already has a deposit invoice ({activeDeposit.invoiceNumber}). Cancel it first to create another one.</p>
                        </div>
                      ) : null}
                      {transportCancelled ? (
                        <div className="flex gap-2 border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900 sm:col-span-2" role="alert">
                          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                          <p>This transport was cancelled, so no new invoice can be created for it.</p>
                        </div>
                      ) : null}
                      {precheckError ? (
                        <div className="flex gap-2 border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 sm:col-span-2" role="alert">
                          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                          <p>{getInvoiceErrorMessage(precheckError, "Unable to check this booking. Try another type or reload.")}</p>
                        </div>
                      ) : null}

                      <div className="sm:col-span-2">
                        <label className={fieldLabelClass} htmlFor="invoice-note">Notes{noteRequired ? <span className="text-red-500"> *</span> : null}</label>
                        <Textarea id="invoice-note" rows={2} placeholder="Add any additional notes for this invoice..." className="field-sizing-fixed h-[60px] min-h-[60px] resize-none overflow-y-auto rounded-none border-[#d8d5cb] text-sm shadow-none" {...register("note")} />
                        {errors.note ? <p className="mt-1 text-[11px] text-red-600" role="alert">{errors.note.message}</p> : null}
                      </div>
                    </div>
                  </section>

                  <BillingSummaryCard lines={summaryLines} summary={estimate} currency={DEFAULT_INVOICE_CURRENCY} />
                </div>

                {locked ? (
                  <GeneratedLinesTable
                    items={generatedItems}
                    isLoading={!isEdit && suggestionQuery.isFetching && !suggestionQuery.data}
                    hint={isEdit ? "Rebuilt by the system every time the draft is saved." : "Built by the system from the booking. Amounts are final once the draft is saved."}
                  />
                ) : (
                  <InvoiceLineItemsTable
                    currency={DEFAULT_INVOICE_CURRENCY}
                    horses={booking.horses}
                    depositDeductionItems={[]}
                    focusRow={focusRow}
                    disabled={isSaving}
                  />
                )}

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
