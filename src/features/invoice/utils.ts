import { format, parseISO, isValid } from "date-fns"
import { INVOICE_TAX_RATE_PERCENT, TRANSIT_DAYS_RANGE, PAYMENT_ERROR_CODES, CANCELLATION_REASON_MIN_LENGTH, PAYMENT_METHOD_VALUES, PAYMENT_TRANSACTION_REFERENCE_MAX_LENGTH } from "@/features/invoice/constants"
import type { InvoiceItem, InvoiceSummary, PaymentErrorCode, PaymentErrorState, Invoice, RecordPaymentPayload } from "@/features/invoice/types"
import type { InvoiceCurrency } from "@/features/invoice/constants"
import { z } from "zod"
import { formatUtcDateTime } from "@/shared/utils/datetime"

// ---- from shared/mock-mode.ts ----
type MockEnvironment = { PROD?: boolean; VITE_INVOICE_API_MOCKS?: string }

/**
 * One switch for every invoice API (compose, view and payment). Flow 6 has no backend yet, so the in-memory mock is
 * on by default in development; set VITE_INVOICE_API_MOCKS=false to call the real API. Never on in a production build.
 */
export function isInvoiceMockMode(env: MockEnvironment = import.meta.env) {
  return env.PROD !== true && env.VITE_INVOICE_API_MOCKS === "true"
}

export function invoiceDate(value?: string | null) {
  if (!value) return "—";
  const parsed = parseISO(value);
  return isValid(parsed)
    ? format(parsed, value.length === 10 ? "dd MMM yyyy" : "dd MMM yyyy, HH:mm")
    : "—";
}

// ---- from compose/utils.ts ----
export const EMPTY_VALUE = "—"

/** VND has no minor unit: every amount is a whole number. */
export function roundMoney(value: number) {
  return Math.round(value)
}

/** Money in VND, whole amounts; the app has a single currency so an older row in another one is shown as VND too. Negative amounts keep their sign. */
export function formatMoney(amount: number, _currency?: InvoiceCurrency) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "VND",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

/** `YYYY-MM-DD` or ISO timestamp -> "January 05, 2018" (the template format). */
export function formatInvoiceDate(value: string | null | undefined) {
  if (!value) return EMPTY_VALUE
  const date = parseISO(value)
  if (!isValid(date)) return EMPTY_VALUE
  // A plain day is shown as it came; an instant is read as its UTC day.
  if (value.length === 10) return format(date, "MMMM dd, yyyy")
  return new Intl.DateTimeFormat("en-US", { month: "long", day: "2-digit", year: "numeric", timeZone: "UTC" }).format(date)
}

/** An instant as labelled UTC ("08:00 UTC, 27/10/2026"); the claim screens read it through this too. */
export function formatInvoiceDateTime(value: string | null | undefined) {
  const text = formatUtcDateTime(value)
  return text === "—" ? EMPTY_VALUE : text
}

export function todayIsoDate() {
  return format(new Date(), "yyyy-MM-dd")
}

/** The time a due date gets when the person only picks a day (the old date-only behaviour: end of day). */
export const DEFAULT_DUE_TIME = "23:59"

/** The BE's due-date instant as the local day and clock time the form edits. A date-only legacy value keeps the end of that day. */
export function splitDueDateTime(value: string | null | undefined) {
  const parsed = value ? parseISO(value) : null
  if (!value || !parsed || !isValid(parsed)) return { date: "", time: DEFAULT_DUE_TIME }
  if (value.length === 10) return { date: value, time: DEFAULT_DUE_TIME }
  return { date: format(parsed, "yyyy-MM-dd"), time: format(parsed, "HH:mm") }
}

/** A local day and time as the UTC instant the BE expects (R29: always sent with a zone). */
export function dueDateTimeToIso(day: string, time: string) {
  return new Date(`${day}T${time}:00`).toISOString()
}

/** Whole numbers only (no sign, no decimals): SePay does not accept fractional amounts. NaN when invalid. */
export function parseWholeNumber(value: string) {
  const normalized = value.trim()
  if (!/^\d+$/.test(normalized)) return Number.NaN
  return Number(normalized)
}

/** Trip length typed on a QUOTATION: a whole number in the BE range, otherwise undefined (the server then derives it from the booking dates). */
export function parseTransitDays(value: string) {
  const days = parseWholeNumber(value)
  return Number.isNaN(days) || days < TRANSIT_DAYS_RANGE.min || days > TRANSIT_DAYS_RANGE.max ? undefined : days
}

/**
 * Estimate shown while the draft is being edited (contract R8): subtotal of the manual lines, 20% tax,
 * deposit deduction added after tax. The server recomputes everything, this number is never sent. IV1 returns no totals,
 * so the form adds the lines it shows; a credit note carries no tax (`taxRatePercent` 0).
 */
export function estimateSummary(
  lines: { quantity: number; price: number }[],
  depositDeductionItems: Pick<InvoiceItem, "total">[],
  taxRatePercent: number = INVOICE_TAX_RATE_PERCENT,
): InvoiceSummary {
  const subtotal = roundMoney(lines.reduce((sum, line) => sum + (Number.isFinite(line.quantity * line.price) ? roundMoney(line.quantity * line.price) : 0), 0))
  const tax = roundMoney((subtotal * taxRatePercent) / 100)
  const depositDeduction = roundMoney(depositDeductionItems.reduce((sum, item) => sum + item.total, 0))
  return {
    subtotal,
    discount: 0,
    tax,
    taxRatePercent,
    depositDeduction,
    grandTotal: roundMoney(subtotal + tax + depositDeduction),
  }
}

// ---- from payment/utils/payment.error.ts ----
const PAYMENT_ERROR_MESSAGES: Record<PaymentErrorCode, string> = {
  PARTIAL_PAYMENT_NOT_SUPPORTED: 'Only full payment of the invoice total is accepted.',
  UNPAYABLE_INVOICE_TYPE: 'This invoice type cannot be paid.',
  INVALID_INVOICE_STATUS: 'This invoice cannot be paid in its current status.',
  INVOICE_HAS_PAYMENT: 'This invoice has a confirmed payment. Contact accounting for a refund process.',
  PAYMENT_IN_PROGRESS: 'A payment for this invoice is being processed.',
  VALIDATION_ERROR: 'Check the payment details and try again.',
  PAYMENT_GATEWAY_ERROR: 'Payment gateway is unavailable. Please try again later.',
  UNSUPPORTED_PAYMENT_AMOUNT: 'SePay only accepts a whole VND amount. This invoice total has decimals, so ask the Logistics Manager to correct the invoice.',
  UNSUPPORTED_PAYMENT_CURRENCY: 'SePay only accepts VND payments.',
}

export function getPaymentErrorMessage(errorCode?: string, fallback?: string) {
  return (errorCode && PAYMENT_ERROR_MESSAGES[errorCode as PaymentErrorCode]) ?? fallback ?? 'Payment request failed.'
}

/** Browser form POST to the SePay checkout. Fields go in the order the BE returned them; the page is left on success. */
export function submitCheckoutForm(paymentUrl: string, checkoutFields: Record<string, string>) {
  const form = document.createElement("form")
  form.method = "POST"
  form.action = paymentUrl
  form.style.display = "none"
  for (const [name, value] of Object.entries(checkoutFields)) {
    const input = document.createElement("input")
    input.type = "hidden"
    input.name = name
    input.value = value
    form.appendChild(input)
  }
  document.body.appendChild(form)
  form.submit()
}

export function mapPaymentError(error: unknown): PaymentErrorState {
  const candidate = error as { errorCode?: string; message?: string }
  const errorCode = candidate?.errorCode
  return {
    errorCode,
    message: getPaymentErrorMessage(errorCode, candidate?.message),
    retryable: errorCode === PAYMENT_ERROR_CODES.PAYMENT_GATEWAY_ERROR,
  }
}

// ---- from payment/utils/payment.format.ts ----
export function formatPaymentAmount(amount: number, _currency?: InvoiceCurrency) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'VND',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

/** SePay only takes a positive whole VND amount; the BE rejects anything else with UNSUPPORTED_PAYMENT_AMOUNT. */
export function isPayableAmount(amount: number) {
  return Number.isInteger(amount) && amount > 0
}

export function formatPaymentDate(value: string | null | undefined) {
  return formatUtcDateTime(value)
}

export function toPaymentTimestamp(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toISOString()
}

// ---- from payment/utils/payment.validation.ts ----
const paidAt = z
  .string()
  .datetime({ offset: true, message: 'Paid time must be a valid ISO timestamp.' })
  .refine((value) => new Date(value).getTime() <= Date.now(), 'Paid time cannot be in the future.')

const optionalText = (max: number) => z.string().trim().max(max).optional()

export const cancellationSchema = z.object({
  cancellationReason: z
    .string()
    .trim()
    .min(CANCELLATION_REASON_MIN_LENGTH, `Cancellation reason must be at least ${CANCELLATION_REASON_MIN_LENGTH} characters.`),
})

export const recordPaymentSchema = z.object({
  amount: z.number().finite().int('Amount must be a whole number.').nonnegative(),
  paymentMethod: z.enum(PAYMENT_METHOD_VALUES),
  transactionReference: optionalText(PAYMENT_TRANSACTION_REFERENCE_MAX_LENGTH),
  paidAt: paidAt.optional(),
  note: z.string().trim().optional(),
})

export function createRecordPaymentSchema(grandTotal: number) {
  return recordPaymentSchema.superRefine((payload, context) => {
    if (payload.amount !== grandTotal) {
      context.addIssue({
        code: 'custom',
        path: ['amount'],
        message: 'Amount must equal the invoice grand total.',
      })
    }
  })
}

export function validateRecordPayment(payload: RecordPaymentPayload, invoice: Invoice) {
  return createRecordPaymentSchema(invoice.summary.grandTotal).safeParse(payload)
}

export function validateCancellation(cancellationReason: string) {
  return cancellationSchema.safeParse({ cancellationReason })
}
