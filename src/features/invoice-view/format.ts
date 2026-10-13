import { format, parseISO, isValid } from "date-fns"

export function money(amount: number, currency: string) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency, currencyDisplay: "code" }).format(amount)
}
export function invoiceDate(value?: string | null) {
  if (!value) return "—"
  const parsed = parseISO(value)
  return isValid(parsed) ? format(parsed, value.length === 10 ? "dd MMM yyyy" : "dd MMM yyyy, HH:mm") : "—"
}
