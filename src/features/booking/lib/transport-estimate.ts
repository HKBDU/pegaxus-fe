export interface EstimatePoint {
  latitude: number | null | undefined
  longitude: number | null | undefined
  country: string
}

export interface TransportEstimate {
  distanceKm: number
  durationMinutes: number
}

const EARTH_RADIUS_KM = 6371
const ROAD_FACTOR = 1.3
const CROSSING_DISTANCE_KM = 50
const SAFE_SPEED_KMH = 68
const SHORT_REST_AFTER_MINUTES = 270
const SHORT_REST_MINUTES = 45
const CROSSING_TIME_MINUTES = 240
const HANDLING_TIME_MINUTES = 45
const LONG_REST_THRESHOLD_MINUTES = 1440
const LONG_REST_MINUTES = 1440

function toRadians(value: number) {
  return (value * Math.PI) / 180
}

function isUnitedKingdom(country: string) {
  return /united kingdom|\buk\b|great britain|england|scotland|wales/i.test(country)
}

function isValidPoint(
  point: EstimatePoint,
): point is EstimatePoint & { latitude: number; longitude: number } {
  return (
    typeof point.latitude === "number" &&
    Number.isFinite(point.latitude) &&
    typeof point.longitude === "number" &&
    Number.isFinite(point.longitude)
  )
}

export function estimateTransport(pointA: EstimatePoint, pointB: EstimatePoint): TransportEstimate | null {
  if (!isValidPoint(pointA) || !isValidPoint(pointB)) return null

  const dLat = toRadians(pointB.latitude - pointA.latitude)
  const dLng = toRadians(pointB.longitude - pointA.longitude)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(pointA.latitude)) *
      Math.cos(toRadians(pointB.latitude)) *
      Math.sin(dLng / 2) ** 2
  const crowDistanceKm = EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(Math.max(0, 1 - a)))
  const isCrossChannel = isUnitedKingdom(pointA.country) !== isUnitedKingdom(pointB.country)
  const distanceKm = Math.round((crowDistanceKm * ROAD_FACTOR + (isCrossChannel ? CROSSING_DISTANCE_KM : 0)) * 10) / 10
  const driveMinutes = Math.round((distanceKm / SAFE_SPEED_KMH) * 60)
  const restMinutes = Math.floor(driveMinutes / SHORT_REST_AFTER_MINUTES) * SHORT_REST_MINUTES
  const crossingMinutes = isCrossChannel ? CROSSING_TIME_MINUTES : 0
  const subtotalMinutes = driveMinutes + restMinutes + crossingMinutes + HANDLING_TIME_MINUTES
  const durationMinutes = subtotalMinutes + (subtotalMinutes > LONG_REST_THRESHOLD_MINUTES ? LONG_REST_MINUTES : 0)

  return { distanceKm, durationMinutes }
}

export function formatEstimateDuration(totalMinutes: number) {
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`
}
