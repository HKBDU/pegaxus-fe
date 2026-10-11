export function durationLabel(minutes: number | null | undefined) {
  if (minutes == null) return "—"
  const whole = Math.round(minutes)
  return `${Math.floor(whole / 60)}h ${whole % 60}m`
}
export function distanceLabel(km: number | null | undefined) {
  return km == null ? "—" : `${km.toLocaleString("en-GB", { maximumFractionDigits: 1 })} km`
}

export function replacementLabel(route: { routeType: string; replacesSequenceNo?: { from: number; to: number } | null }) {
  if (route.routeType !== "BACKUP") return "—"
  const range = route.replacesSequenceNo
  return range ? `Primary ${range.from === range.to ? `segment ${range.from}` : `segments ${range.from}–${range.to}`}` : "Not available"
}
