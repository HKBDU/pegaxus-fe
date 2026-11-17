import { useLiveTruck } from "@/features/live-tracking/hooks/useLiveTruck";
import { mockGeolocation } from "../simulator/mockGeolocation";

export type DriverPositionStatus =
  | "ready"
  | "missing"
  | "stale"
  | "wrongTransport"
  | "wrongBoundary"
  | "disconnected";

export interface DriverPositionResult {
  status: DriverPositionStatus;
  coordinates: { latitude: number; longitude: number } | null;
  recordedAt: string | null;
  source: "DRIVER_MOCK" | "GP1" | null;
}

const MAX_AGE_MS = 120_000;

export function useTransportDriverPosition(
  transportId: string | undefined,
  routePlanRouteId?: string,
): DriverPositionResult {
  const tracking = useLiveTruck(transportId ?? "", { pollSnapshot: Boolean(transportId) });
  const truck = tracking.truck;
  const recordedAt = truck ? Date.parse(truck.recordedAt) : Number.NaN;
  const age = tracking.now + tracking.skewMs - recordedAt;
  const isFresh = Boolean(truck && Number.isFinite(age) && age >= -15_000 && age <= MAX_AGE_MS);

  // 1. Check local mock sample first (for driver tab or developer on same browser)
  const localSample = mockGeolocation.getIsEnabled() ? mockGeolocation.getLastSample() : null;
  if (localSample && transportId) {
    if (localSample.transportId !== transportId) {
      return { status: "wrongTransport", coordinates: null, recordedAt: null, source: null };
    }
    if (routePlanRouteId && localSample.routePlanRouteId !== routePlanRouteId) {
      return { status: "wrongBoundary", coordinates: null, recordedAt: null, source: null };
    }
    const localAge = Date.now() - Date.parse(localSample.recordedAt);
    if (localAge > MAX_AGE_MS) {
      return { status: "stale", coordinates: null, recordedAt: localSample.recordedAt, source: "DRIVER_MOCK" };
    }
    return {
      status: "ready",
      coordinates: { latitude: localSample.latitude, longitude: localSample.longitude },
      recordedAt: localSample.recordedAt,
      source: "DRIVER_MOCK",
    };
  }

  // 2. Fall back to GP1 stream / server snapshot (for viewers / other signers on separate devices)
  const isOnline =
    ("online" in tracking ? Boolean((tracking as { online?: boolean }).online) : (typeof navigator === "undefined" || navigator.onLine)) &&
    !tracking.query?.isError;
  if (!isOnline) {
    return { status: "disconnected", coordinates: null, recordedAt: null, source: null };
  }
  if (!isFresh) {
    return { status: truck ? "stale" : "missing", coordinates: null, recordedAt: truck?.recordedAt ?? null, source: null };
  }

  return {
    status: "ready",
    coordinates: { latitude: truck!.latitude, longitude: truck!.longitude },
    recordedAt: truck!.recordedAt,
    source: "GP1",
  };
}

export const useTransportDriverGps = useTransportDriverPosition;
