import { format, parseISO, isValid } from "date-fns"
import { INVOICE_TAX_RATE_PERCENT, PAYMENT_ERROR_CODES, CANCELLATION_REASON_MIN_LENGTH, PAYMENT_CURRENCY_VALUES, PAYMENT_METHOD_VALUES, PAYMENT_TRANSACTION_REFERENCE_MAX_LENGTH } from "@/features/invoice/constants"
import type { InvoiceItem, InvoiceSummary, PaymentErrorCode, PaymentErrorState, Invoice, RecordPaymentPayload } from "@/features/invoice/types"
import type { InvoiceCurrency } from "@/features/invoice/constants"
import { z } from "zod"

// ---- from shared/mock-mode.ts ----
type MockEnvironment = { PROD?: boolean; VITE_INVOICE_API_MOCKS?: string }

/**
 * One switch for every invoice API (compose, view and payment). Flow 6 has no backend yet, so the in-memory mock is
 * on by default in development; set VITE_INVOICE_API_MOCKS=false to call the real API. Never on in a production build.
 */
export function isInvoiceMockMode(env: MockEnvironment = import.meta.env) {
  return env.PROD !== true && env.VITE_INVOICE_API_MOCKS === "true"
}

// ---- from view/format.ts ----
export function invoiceDate(value?: string | null) {
  if (!value) return "—"
  const parsed = parseISO(value)
  return isValid(parsed) ? format(parsed, value.length === 10 ? "dd MMM yyyy" : "dd MMM yyyy, HH:mm") : "—"
}

// ---- from compose/utils.ts ----
export const EMPTY_VALUE = "—"

/** VND has no minor unit: every amount is a whole number. */
export function roundMoney(value: number) {
  return Math.round(value)
}

export function formatMoney(amount: number, currency: InvoiceCurrency = "VND") {
  const fractionDigits = currency === "VND" ? 0 : 2
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
  return isValid(date) ? format(date, "MMMM dd, yyyy") : EMPTY_VALUE
}

export function formatInvoiceDateTime(value: string | null | undefined) {
  if (!value) return EMPTY_VALUE
  const date = parseISO(value)
  return isValid(date) ? format(date, "dd/MM/yyyy HH:mm") : EMPTY_VALUE
}

export function todayIsoDate() {
  return format(new Date(), "yyyy-MM-dd")
}

/** Whole numbers only (no sign, no decimals): SePay does not accept fractional amounts. NaN when invalid. */
export function parseWholeNumber(value: string) {
  const normalized = value.trim()
  if (!/^\d+$/.test(normalized)) return Number.NaN
  return Number(normalized)
}

/**
 * Estimate shown while the draft is being edited (contract R8): subtotal of the manual lines, 20% tax,
 * deposit deduction added after tax. The server recomputes everything, this number is never sent.
 */
export function estimateSummary(
  lines: { quantity: number; price: number }[],
  depositDeductionItems: Pick<InvoiceItem, "total">[],
): InvoiceSummary {
  const subtotal = roundMoney(lines.reduce((sum, line) => sum + (Number.isFinite(line.quantity * line.price) ? roundMoney(line.quantity * line.price) : 0), 0))
  const tax = roundMoney((subtotal * INVOICE_TAX_RATE_PERCENT) / 100)
  const depositDeduction = roundMoney(depositDeductionItems.reduce((sum, item) => sum + item.total, 0))
  return {
    subtotal,
    discount: 0,
    tax,
    taxRatePercent: INVOICE_TAX_RATE_PERCENT,
    depositDeduction,
    grandTotal: roundMoney(subtotal + tax + depositDeduction),
  }
}

// ---- from payment/utils/payment.error.ts ----
const PAYMENT_ERROR_MESSAGES: Record<PaymentErrorCode, string> = {
  PARTIAL_PAYMENT_NOT_SUPPORTED: 'Only full payment of the invoice total is accepted.',
  CURRENCY_MISMATCH: 'Payment currency must match the invoice currency.',
  UNPAYABLE_INVOICE_TYPE: 'This invoice type cannot be paid.',
  INVALID_INVOICE_STATUS: 'This invoice cannot be paid in its current status.',
  INVOICE_HAS_PAYMENT: 'This invoice has a confirmed payment. Contact accounting for a refund process.',
  PAYMENT_IN_PROGRESS: 'A payment for this invoice is being processed.',
  VALIDATION_ERROR: 'Check the payment details and try again.',
  PAYMENT_GATEWAY_ERROR: 'Payment gateway is unavailable. Please try again later.',
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

export function formatPaymentAmount(amount: number, currency: InvoiceCurrency = "VND") {
  const fractionDigits = currency === "VND" ? 0 : 2
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(amount)
}

export function formatPaymentDate(value: string | null | undefined) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
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
  currency: z.enum(PAYMENT_CURRENCY_VALUES),
  paymentMethod: z.enum(PAYMENT_METHOD_VALUES),
  transactionReference: optionalText(PAYMENT_TRANSACTION_REFERENCE_MAX_LENGTH),
  paidAt: paidAt.optional(),
  note: z.string().trim().optional(),
})

export function createRecordPaymentSchema(grandTotal: number, currency: InvoiceCurrency) {
  return recordPaymentSchema.superRefine((payload, context) => {
    if (payload.amount !== grandTotal) {
      context.addIssue({
        code: 'custom',
        path: ['amount'],
        message: 'Amount must equal the invoice grand total.',
      })
    }
    if (payload.currency !== currency) {
      context.addIssue({
        code: 'custom',
        path: ['currency'],
        message: 'Payment currency must match the invoice currency.',
      })
    }
  })
}

export function validateRecordPayment(payload: RecordPaymentPayload, invoice: Invoice) {
  return createRecordPaymentSchema(invoice.summary.grandTotal, invoice.currency).safeParse(payload)
}

export function validateCancellation(cancellationReason: string) {
  return cancellationSchema.safeParse({ cancellationReason })
}
