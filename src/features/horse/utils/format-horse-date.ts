export function toHorseDateInput(value?: string | null) {
  return value ? value.slice(0, 10) : ""
}

export function formatHorseDate(value?: string | null) {
  if (!value) return "—"

  const date = new Date(`${value.slice(0, 10)}T00:00:00`)
  if (Number.isNaN(date.getTime())) return value

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date)
}
