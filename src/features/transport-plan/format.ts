import { formatBookingDate } from "@/features/booking/utils"

export function toLocalDateTime(value?: string | null) {
  if (!value) return ""
  const date = new Date(value)
  const pad = (number: number, length = 2) => String(number).padStart(length, "0")
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}.${pad(date.getMilliseconds(), 3)}`
}

export function formatPlanDate(value?: string | null) {
  return value ? `${formatBookingDate(value, true)} UTC` : "—"
}
export function formatPlanMoney(amount?: number | null, currency?: string | null) {
  if (amount == null) return "—"
  const curr = (currency || "VND").toUpperCase()
  const fractionDigits = curr === "VND" ? 0 : 2
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: curr,
    currencyDisplay: "code",
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(amount)
}
