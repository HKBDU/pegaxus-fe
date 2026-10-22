import { driverLocationRequestSchema } from "./schemas";
import type { DriverLocationRequest } from "./types";
import { VALIDATION_LIMITS } from "@/shared/constants/validation-limits";

export const SEND_INTERVAL_MS = 15_000;
export const SAMPLE_MAX_AGE_MS = 15_000;

export function isFreshObservation(timestamp: number, now: number) {
  return (
    Number.isFinite(timestamp) &&
    timestamp > 0 &&
    timestamp <= now &&
    now - timestamp <= SAMPLE_MAX_AGE_MS
  );
}

// Browser optional metadata must not become fabricated zero values.
function measurement(
  value: number | null,
  limits: { min: number; max: number; scale: number },
) {
  return value !== null &&
    Number.isFinite(value) &&
    value >= limits.min &&
    value <= limits.max
    ? Number(value.toFixed(limits.scale))
    : undefined;
}

export function locationFromPosition(
  position: GeolocationPosition,
  now: number,
): DriverLocationRequest | null {
  if (!isFreshObservation(position.timestamp, now)) return null;
  const { latitude, longitude, speed, heading, accuracy } = position.coords;
  const lat = measurement(latitude, VALIDATION_LIMITS.latitude);
  const lon = measurement(longitude, VALIDATION_LIMITS.longitude);
  if (lat === undefined || lon === undefined) return null;
  const speedKmh = measurement(
    speed === null ? null : speed * 3.6,
    VALIDATION_LIMITS.trackingSpeedKmh,
  );
  const headingDegrees = measurement(heading, VALIDATION_LIMITS.headingDegrees);
  const accuracyMeters = measurement(
    accuracy,
    VALIDATION_LIMITS.trackingAccuracyMeters,
  );
  const request = {
    latitude: lat,
    longitude: lon,
    recordedAt: new Date(position.timestamp).toISOString(),
    ...(speedKmh !== undefined ? { speedKmh } : {}),
    ...(headingDegrees !== undefined ? { headingDegrees } : {}),
    ...(accuracyMeters !== undefined ? { accuracyMeters } : {}),
  };
  const result = driverLocationRequestSchema.safeParse(request);
  return result.success ? result.data : null;
}
