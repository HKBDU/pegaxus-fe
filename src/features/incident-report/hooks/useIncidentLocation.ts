import { useCallback, useEffect, useRef, useState } from "react";
import {
  getCurrentGpsCoordinates,
  type GpsCoordinates,
} from "@/shared/utils/gps";
import type { IncidentLocation } from "@/shared/types/incident";
import {
  createIncidentLocation,
  findIncidentLocation,
  getIncidentLocation,
} from "../services";

export type IncidentLocationStatus =
  | "idle"
  | "locating"
  | "reading"
  | "creating"
  | "ready"
  | "unavailable"
  | "error";

export interface UseIncidentLocationOptions {
  locationId?: string;
  initialCoordinates?: GpsCoordinates | null;
  locationDescription?: string;
}

export function useIncidentLocation({
  locationId,
  initialCoordinates,
  locationDescription,
}: UseIncidentLocationOptions = {}) {
  const [coordinates, setCoordinates] = useState<GpsCoordinates | null>(
    initialCoordinates ?? null,
  );
  const [location, setLocation] = useState<IncidentLocation | null>(null);
  const [status, setStatus] = useState<IncidentLocationStatus>(
    locationId ? "reading" : "idle",
  );
  const [error, setError] = useState<string | null>(null);
  const startedRef = useRef(false);

  const resolve = useCallback(async () => {
    setError(null);
    if (locationId) {
      setStatus("reading");
      try {
        const saved = await getIncidentLocation(locationId);
        setLocation(saved);
        setCoordinates(
          saved.latitude !== null && saved.longitude !== null
            ? { latitude: saved.latitude, longitude: saved.longitude }
            : null,
        );
        setStatus("ready");
        return saved;
      } catch (cause) {
        setStatus("error");
        setError(
          cause instanceof Error
            ? cause.message
            : "Saved location could not be loaded.",
        );
        return null;
      }
    }

    setStatus("locating");
    const current = coordinates ?? (await getCurrentGpsCoordinates());
    if (!current) {
      setStatus("unavailable");
      setError(
        "GPS is unavailable. The incident can be saved with a location selected by the host flow.",
      );
      return null;
    }
    setCoordinates(current);

    try {
      setStatus("reading");
      const existing = await findIncidentLocation(
        current.latitude,
        current.longitude,
      );
      if (existing) {
        setLocation(existing);
        setStatus("ready");
        return existing;
      }
      setStatus("creating");
      const created = await createIncidentLocation({
        locationName:
          locationDescription?.trim() ||
          `Incident location ${current.latitude}, ${current.longitude}`,
        locationType: "OTHER",
        latitude: current.latitude,
        longitude: current.longitude,
        locationNote: "Created from incident report GPS.",
      });
      setLocation(created);
      setStatus("ready");
      return created;
    } catch (cause) {
      setStatus("error");
      setError(
        cause instanceof Error
          ? cause.message
          : "Incident location could not be saved.",
      );
      return null;
    }
  }, [coordinates, locationDescription, locationId]);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    void resolve();
  }, [resolve]);

  return {
    coordinates,
    location,
    locationId: location?.locationId ?? locationId,
    locationDescription: location?.locationName ?? locationDescription ?? "",
    status,
    error,
    resolve,
  };
}
