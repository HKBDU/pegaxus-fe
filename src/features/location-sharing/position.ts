import { driverLocationRequestSchema } from "./schemas";
import type { DriverLocationRequest } from "./types";

export const SEND_INTERVAL_MS = 15_000;
export const SAMPLE_MAX_AGE_MS = 15_000;

// Browser optional metadata must not become fabricated zero values.
const nonnegative = (value: number | null) =>
  value !== null && Number.isFinite(value) && value >= 0;

export function locationFromPosition(
  position: GeolocationPosition,
  now: number,
): DriverLocationRequest | null {
  if (
    !Number.isFinite(position.timestamp) ||
    position.timestamp <= 0 ||
    position.timestamp > now ||
    now - position.timestamp > SAMPLE_MAX_AGE_MS
  )
    return null;
  const { latitude, longitude, speed, heading, accuracy } = position.coords;
  const request = {
    latitude,
    longitude,
    recordedAt: new Date(position.timestamp).toISOString(),
    ...(nonnegative(speed) && Number.isFinite(speed! * 3.6)
      ? { speedKmh: speed! * 3.6 }
      : {}),
    ...(nonnegative(heading) && heading! <= 359
      ? { headingDegrees: heading! }
      : {}),
    ...(nonnegative(accuracy) ? { accuracyMeters: accuracy } : {}),
  };
  const result = driverLocationRequestSchema.safeParse(request);
  return result.success ? result.data : null;
}
