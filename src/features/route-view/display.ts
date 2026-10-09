export function durationLabel(minutes: number | null | undefined) {
  if (minutes == null) return "—"
  const whole = Math.round(minutes)
  return `${Math.floor(whole / 60)}h ${whole % 60}m`
}
export function distanceLabel(km: number | null | undefined) {
  return km == null ? "—" : `${km.toLocaleString("en-GB", { maximumFractionDigits: 1 })} km`
}
