import { useTransportDriverPosition } from "@/features/location-sharing/hooks/useTransportDriverPosition";

export function useTransportIncidentGps(transportId: string) {
  const result = useTransportDriverPosition(transportId);
  return {
    coordinates: result.status === "ready" ? result.coordinates : null,
  };
}
