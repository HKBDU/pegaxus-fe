import { formatBookingDate } from "@/features/booking/utils"

export function formatPlanDate(value?: string | null) {
  return value ? `${formatBookingDate(value, true)} UTC` : "—"
}
export function formatPlanMoney(amount?: number | null, currency?: string | null) {
  if (amount == null || !currency) return "—"
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: currency.toUpperCase(), currencyDisplay: "code" }).format(amount)
}
