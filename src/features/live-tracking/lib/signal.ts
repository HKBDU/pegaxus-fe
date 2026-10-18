import { SIGNAL_DELAYED_MS, SIGNAL_LIVE_MS } from "../constants"
import type { GpsSignal } from "../types"

/**
 * GPS signal of the vehicle from the `recordedAt` of its newest sample (O-F4-18): `LIVE` <= 30 s, `DELAYED` <= 2 min,
 * `LOST` after that or when there is no sample. `skewMs` = server time - client time, so a wrong clock on this
 * computer does not turn a fresh sample into a stale one.
 */
export function gpsSignal(recordedAt: string | null | undefined, nowMs: number, skewMs = 0): GpsSignal {
  if (!recordedAt) return "LOST"
  const age = nowMs + skewMs - Date.parse(recordedAt)
  if (!Number.isFinite(age)) return "LOST"
  if (age <= SIGNAL_LIVE_MS) return "LIVE"
  if (age <= SIGNAL_DELAYED_MS) return "DELAYED"
  return "LOST"
}

export const SIGNAL_LABEL: Record<GpsSignal, string> = {
  LIVE: "Live",
  DELAYED: "Delayed",
  LOST: "No signal",
}
