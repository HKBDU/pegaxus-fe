import { format, isValid, parseISO } from "date-fns"

import { INVOICE_TAX_RATE_PERCENT } from "@/features/invoice/constants"
import type { InvoiceCurrency, InvoiceItem, InvoiceSummary } from "@/features/invoice/types"

export const EMPTY_VALUE = "—"

export function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

/** Money formatted by the invoice currency (never hard-coded), negative amounts keep their sign. */
export function formatMoney(amount: number, currency: InvoiceCurrency) {
  const fractionDigits = currency === "VND" ? 0 : 2
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
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

export function parseDecimal(value: string) {
  const normalized = value.trim().replace(",", ".")
  if (normalized === "" || !/^-?\d*(\.\d+)?$/.test(normalized)) return Number.NaN
  return Number(normalized)
}

/** Max two decimals, the same limit the BE applies to quantity. */
export function hasAtMostTwoDecimals(value: number) {
  return Math.abs(value * 100 - Math.round(value * 100)) < 1e-8
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
