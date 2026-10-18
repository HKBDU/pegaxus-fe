import { formatBookingDate } from "@/features/booking/utils";

export function toLocalDateTime(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  const pad = (number: number, length = 2) =>
    String(number).padStart(length, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}.${pad(date.getMilliseconds(), 3)}`;
}

export function formatPlanDate(value?: string | null) {
  return value ? `${formatBookingDate(value, true)} UTC` : "—";
}
/** VND only, whole amounts. */
export function formatPlanMoney(amount?: number | null) {
  if (amount == null) return "—";
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "VND",
    currencyDisplay: "code",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}
