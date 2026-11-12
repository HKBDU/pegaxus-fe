import { useLiveTruck } from "@/features/live-tracking/hooks/useLiveTruck";

const MAX_SHARED_GPS_AGE_MS = 120_000;

/** Latest usable Driver position for a crew incident form. */
export function useTransportIncidentGps(transportId: string) {
  // Keep GP1 polling while also listening to the live stream. The Driver's fake
  // GPS is posted to the server, and GP1 is the shared source Escort can read.
  const tracking = useLiveTruck(transportId, { pollSnapshot: true });
  const truck = tracking.truck;
  const recordedAt = truck ? Date.parse(truck.recordedAt) : Number.NaN;
  const age = tracking.now + tracking.skewMs - recordedAt;
  const isFresh = Boolean(
    truck && Number.isFinite(age) && age >= -15_000 && age <= MAX_SHARED_GPS_AGE_MS,
  );

  return {
    coordinates: isFresh ? truck : null,
  };
}
