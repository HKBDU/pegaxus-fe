/**
 * Utilities for acquiring GPS coordinates formatted to 4 decimal places (0.0000).
 */

export interface GpsCoordinates {
  latitude: number
  longitude: number
  accuracyMeters?: number
}

/**
 * Reads the device's current geolocation via navigator.geolocation.
 * Returns coordinates rounded to 4 decimal places (Geoapify standard: 0.0000).
 * Resolves with null if geolocation is unsupported, permission is denied, or it times out.
 */
export async function getCurrentGpsCoordinates(
  timeoutMs = 8000,
): Promise<GpsCoordinates | null> {
  if (typeof window === "undefined" || !("geolocation" in navigator)) {
    return null
  }

  return new Promise((resolve) => {
    let resolved = false
    const timer = setTimeout(() => {
      if (!resolved) {
        resolved = true
        resolve(null)
      }
    }, timeoutMs)

    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (resolved) return
        resolved = true
        clearTimeout(timer)
        const lat = Number(position.coords.latitude.toFixed(4))
        const lng = Number(position.coords.longitude.toFixed(4))
        resolve({
          latitude: lat,
          longitude: lng,
          accuracyMeters: Number.isFinite(position.coords.accuracy)
            ? Math.round(position.coords.accuracy)
            : undefined,
        })
      },
      () => {
        if (resolved) return
        resolved = true
        clearTimeout(timer)
        resolve(null)
      },
      {
        enableHighAccuracy: true,
        timeout: timeoutMs,
        maximumAge: 30_000,
      },
    )
  })
}

/**
 * Format GPS coordinates string as 4 decimal places: `0.0000, 0.0000`
 */
export function formatCoordinates(coords?: { latitude: number; longitude: number } | null): string {
  if (!coords || !Number.isFinite(coords.latitude) || !Number.isFinite(coords.longitude)) {
    return "GPS: Unavailable"
  }
  return `GPS: ${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}`
}
