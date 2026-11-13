import { driverLocationRequestSchema } from "./schemas";
import type { DriverLocationRequest } from "./types";
import { VALIDATION_LIMITS } from "@/shared/constants/validation-limits";

export const SEND_INTERVAL_MS = 2_500;
export const SAMPLE_MAX_AGE_MS = 15_000;

export function isFreshObservation(timestamp: number, now: number) {
  return (
    Number.isFinite(timestamp) &&
    timestamp > 0 &&
    timestamp <= now &&
    now - timestamp <= SAMPLE_MAX_AGE_MS
  );
}

const roundMeasurement = (value: number, scale: number) =>
  Number(value.toFixed(scale));

function optionalMeasurement(
  value: number | null,
  limits: { min: number; max: number; scale: number },
) {
  return value !== null && Number.isFinite(value) &&
    value >= limits.min && value <= limits.max
    ? roundMeasurement(value, limits.scale)
    : undefined;
}

export function locationFromPosition(
  position: GeolocationPosition,
  now: number,
): DriverLocationRequest | null {
  if (!isFreshObservation(position.timestamp, now)) return null;
  const { latitude, longitude, speed, heading, accuracy } = position.coords;
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) ||
      latitude < VALIDATION_LIMITS.latitude.min || latitude > VALIDATION_LIMITS.latitude.max ||
      longitude < VALIDATION_LIMITS.longitude.min || longitude > VALIDATION_LIMITS.longitude.max)
    return null;
  const speedKmh = optionalMeasurement(speed === null ? null : speed * 3.6, VALIDATION_LIMITS.trackingSpeedKmh);
  const headingDegrees = optionalMeasurement(heading, VALIDATION_LIMITS.headingDegrees);
  const accuracyMeters = optionalMeasurement(accuracy, VALIDATION_LIMITS.trackingAccuracyMeters);
  const request = {
    // Serialize the measured point at BE precision; never clamp invalid input or alter its timestamp.
    latitude: roundMeasurement(latitude, VALIDATION_LIMITS.coordinateScale),
    longitude: roundMeasurement(longitude, VALIDATION_LIMITS.coordinateScale),
    recordedAt: new Date(position.timestamp).toISOString(),
    ...(speedKmh !== undefined ? { speedKmh } : {}),
    ...(headingDegrees !== undefined ? { headingDegrees } : {}),
    ...(accuracyMeters !== undefined ? { accuracyMeters } : {}),
  };
  const result = driverLocationRequestSchema.safeParse(request);
  return result.success ? result.data : null;
}
