import { useCallback, useEffect, useRef, useState } from "react";
import {
  buildRouteData,
  positionAtDistance,
  addGpsJitter,
  parseGeoJsonToCoordinates,
  type RouteData,
  type InterpolatedPoint,
} from "./engine";
import { mockGeolocation } from "./mockGeolocation";
import { resolveRouteGeometry } from "@/shared/components/map/route-geometry-cache";

export type SimulatorStatus = "idle" | "running" | "paused" | "completed" | "error";

export interface SegmentEndpoint {
  latitude?: number | null;
  longitude?: number | null;
  locationName?: string;
}

/**
 * Allowed coordinate tolerance for uploaded custom GeoJSON routes:
 * 0.02 degrees corresponds to approximately ~2.2 km.
 * Custom uploaded routes must have their start and end points within this threshold of the segment endpoints.
 */
export const CUSTOM_GEOJSON_ENDPOINT_TOLERANCE_DEG = 0.02;

export const isNearEndpoint = (
  a: [number, number],
  b: { latitude: number; longitude: number },
  tolerance = CUSTOM_GEOJSON_ENDPOINT_TOLERANCE_DEG,
) =>
  Math.abs(a[0] - b.longitude) < tolerance &&
  Math.abs(a[1] - b.latitude) < tolerance;

export function useGpsSimulator(initialSegment?: {
  transportId: string;
  routePlanRouteId: string;
  transportMode: "ROAD" | "SEA" | "AIR";
  isOutsourced: boolean;
  fromLocation: SegmentEndpoint | null;
  toLocation: SegmentEndpoint | null;
}) {
  const [isEnabled, setIsEnabled] = useState(false);
  const [status, setStatus] = useState<SimulatorStatus>("idle");
  const [speedKmh, setSpeedKmh] = useState(60);
  const [distanceTraveled, setDistanceTraveled] = useState(0);
  const [isSignalLoss, setIsSignalLoss] = useState(false);
  const [signalLossSec, setSignalLossSec] = useState(0);
  const [routeError, setRouteError] = useState<string | null>(null);
  const [routeAttempts, setRouteAttempts] = useState(0);
  const [isLoadingRoute, setIsLoadingRoute] = useState(false);
  const [routeSource, setRouteSource] = useState<
    "segment" | "custom" | "geodesic" | "none"
  >("none");
  const [currentPoint, setCurrentPoint] = useState<InterpolatedPoint | null>(
    null,
  );

  const routeDataRef = useRef<RouteData>({
    coordinates: [],
    cumDistances: [],
    totalDistance: 0,
  });
  const routeLoadVersionRef = useRef(0);
  const sessionIdRef = useRef(crypto.randomUUID());
  const sequenceRef = useRef(0);
  const skippedBoundaryRef = useRef<{ boundaryNo: number; latitude: number; longitude: number } | null>(null);

  const [totalDistance, setTotalDistance] = useState(0);
  const distanceRef = useRef(0);
  const speedRef = useRef(speedKmh);
  const statusRef = useRef(status);
  const segmentKey = initialSegment ? `${initialSegment.transportId}:${initialSegment.routePlanRouteId}` : null;
  const isSignalLossRef = useRef(isSignalLoss);

  useEffect(() => {
    speedRef.current = speedKmh;
  }, [speedKmh]);

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  useEffect(() => {
    isSignalLossRef.current = isSignalLoss;
    mockGeolocation.setSignalLoss(isSignalLoss);
  }, [isSignalLoss]);

  // Dispatch position helper
  const dispatchCurrentPosition = useCallback(
    (dist: number, speed: number) => {
      const route = routeDataRef.current;
      if (route.coordinates.length === 0 || !initialSegment?.transportId || !initialSegment.routePlanRouteId) return;

      const raw = positionAtDistance(route, dist);
      const jittered = addGpsJitter(raw.latitude, raw.longitude, 2);

      setCurrentPoint({
        latitude: jittered.latitude,
        longitude: jittered.longitude,
        heading: raw.heading,
      });

      mockGeolocation.dispatchPosition({
        transportId: initialSegment.transportId,
        routePlanRouteId: initialSegment.routePlanRouteId,
        sessionId: sessionIdRef.current,
        sequence: ++sequenceRef.current,
        latitude: jittered.latitude,
        longitude: jittered.longitude,
        speedKmh: speed,
        heading: raw.heading,
        accuracyMeters: 8,
      });
    },
    [initialSegment?.transportId, initialSegment?.routePlanRouteId],
  );

  // Load route into simulator
  const applyCoordinates = useCallback(
    (coords: [number, number][], source: "segment" | "custom" | "geodesic") => {
      const data = buildRouteData(coords);
      routeDataRef.current = data;
      setTotalDistance(data.totalDistance);
      distanceRef.current = 0;
      setDistanceTraveled(0);
      setRouteSource(source);

      if (mockGeolocation.getIsEnabled() && data.coordinates.length > 0) {
        dispatchCurrentPosition(0, 0);
      }
    },
    [dispatchCurrentPosition],
  );

function resolveEndpoint(endpoint: SegmentEndpoint): {
  latitude: number;
  longitude: number;
} {
  if (endpoint.latitude != null && endpoint.longitude != null &&
    Number.isFinite(endpoint.latitude) && Number.isFinite(endpoint.longitude) &&
    Math.abs(endpoint.latitude) <= 90 && Math.abs(endpoint.longitude) <= 180) {
    return { latitude: endpoint.latitude, longitude: endpoint.longitude };
  }
  throw new Error(`Missing valid coordinates for ${endpoint.locationName ?? "segment endpoint"}.`);
}

  // Load from segment points
  const loadSegmentRoute = useCallback(
    async (from: SegmentEndpoint, to: SegmentEndpoint, mode: "ROAD" | "SEA" | "AIR", outsourced: boolean) => {
      const loadVersion = ++routeLoadVersionRef.current;
      setIsLoadingRoute(true);
      setRouteError(null);
      setRouteAttempts(0);
      try {
        const fromCoord = resolveEndpoint(from);
        const toCoord = resolveEndpoint(to);
        if (fromCoord.latitude === toCoord.latitude && fromCoord.longitude === toCoord.longitude)
          throw new Error("Segment endpoints are identical.");
        if (mode !== "ROAD" || outsourced) {
          setRouteError("This segment has no road playback. Use Skip segment at the next handover point.");
          setStatus("error");
          return;
        }
        // Use the same resolver/cache as the ongoing-transport map. If that map
        // already loaded Geoapify's road geometry, the simulator follows the
        // exact same polyline instead of creating a second route or a straight line.
        let routeFailure = "Road geometry is unavailable";
        for (let attempt = 1; attempt <= 4; attempt++) {
        if (loadVersion !== routeLoadVersionRef.current) return;
        setRouteAttempts(attempt);
        try {
        const resolved = await resolveRouteGeometry({
          id: initialSegment?.routePlanRouteId ?? "gps-simulator-segment",
          name: `${from.locationName ?? "Origin"} to ${to.locationName ?? "Destination"}`,
          transportMode: "ROAD",
          fromLocation: {
            id: "gps-simulator-from",
            name: from.locationName ?? "Origin",
            latitude: fromCoord.latitude,
            longitude: fromCoord.longitude,
          },
          toLocation: {
            id: "gps-simulator-to",
            name: to.locationName ?? "Destination",
            latitude: toCoord.latitude,
            longitude: toCoord.longitude,
          },
        });
        if (loadVersion !== routeLoadVersionRef.current) return;
        // `estimated` is the resolver's straight-line fallback. Never use it
        // for GPS simulation: the vehicle must follow a real Geoapify road
        // geometry or remain stopped until one can be loaded.
        if (!resolved.estimated && resolved.line) {
          const coordinates = resolved.line.type === "LineString"
            ? resolved.line.coordinates
            : resolved.line.coordinates.flat();
          if (coordinates.length >= 2 && buildRouteData(coordinates).totalDistance > 0) {
            applyCoordinates(coordinates, "segment");
            setStatus("idle");
            return;
          }
        }
        routeFailure = resolved.error ?? routeFailure;
        } catch (error) {
          routeFailure = error instanceof Error ? error.message : "Road geometry request failed";
        }
        if (attempt < 4) await new Promise<void>((resolve) => setTimeout(resolve, 400 * (2 ** (attempt - 1))));
        }
        if (loadVersion !== routeLoadVersionRef.current) return;
        setRouteError(`${routeFailure} after four attempts. Try again or skip this segment.`);
        setStatus("error");
        // Never substitute the endpoint-to-endpoint line here. A missing road
        // geometry must leave the simulator stopped, otherwise fake GPS can
        // cut across terrain/water between two route endpoints.
        routeDataRef.current = { coordinates: [], cumDistances: [], totalDistance: 0 };
        setTotalDistance(0);
        setDistanceTraveled(0);
        setRouteSource("none");
      } catch (err) {
        if (loadVersion !== routeLoadVersionRef.current) return;
        setRouteError(err instanceof Error ? err.message : "Road geometry failed.");
        setStatus("error");
        routeDataRef.current = { coordinates: [], cumDistances: [], totalDistance: 0 };
        setTotalDistance(0);
        setDistanceTraveled(0);
        setRouteSource("none");
      }

      finally {
        if (loadVersion === routeLoadVersionRef.current) setIsLoadingRoute(false);
      }
    },
    [applyCoordinates, initialSegment?.routePlanRouteId],
  );

  // Load Custom GeoJSON
  const loadCustomGeoJson = useCallback(
    (geoJsonInput: unknown) => {
      const coords = parseGeoJsonToCoordinates(geoJsonInput);
      const from = initialSegment?.fromLocation;
      const to = initialSegment?.toLocation;
      const near = (a: [number, number], b: { latitude: number; longitude: number }) =>
        Math.abs(a[0] - b.longitude) < CUSTOM_GEOJSON_ENDPOINT_TOLERANCE_DEG &&
        Math.abs(a[1] - b.latitude) < CUSTOM_GEOJSON_ENDPOINT_TOLERANCE_DEG;
      if (!from || !to) return false;
      let endpoints;
      try { endpoints = [resolveEndpoint(from), resolveEndpoint(to)] as const; }
      catch { return false; }
      if (coords.length >= 2 &&
        coords.every(([lon, lat]) => Number.isFinite(lon) && Number.isFinite(lat) && Math.abs(lon) <= 180 && Math.abs(lat) <= 90) &&
        buildRouteData(coords).totalDistance > 0 && near(coords[0], endpoints[0]) &&
        near(coords[coords.length - 1], endpoints[1])) {
        // A late segment lookup must not replace a custom route chosen by the driver.
        routeLoadVersionRef.current += 1;
        setIsLoadingRoute(false);
        applyCoordinates(coords, "custom");
        return true;
      }
      return false;
    },
    [applyCoordinates, initialSegment?.fromLocation, initialSegment?.toLocation],
  );

  // Auto load initial segment if provided
  useEffect(() => {
    routeLoadVersionRef.current += 1;
    skippedBoundaryRef.current = null;
    sessionIdRef.current = crypto.randomUUID();
    sequenceRef.current = 0;
    routeDataRef.current = { coordinates: [], cumDistances: [], totalDistance: 0 };
    mockGeolocation.clearPosition();
    distanceRef.current = 0;
    setDistanceTraveled(0);
    setTotalDistance(0);
    setCurrentPoint(null);
    setRouteSource("none");
    setStatus("idle");
    if (initialSegment?.fromLocation && initialSegment?.toLocation) {
      void loadSegmentRoute(
        initialSegment.fromLocation,
        initialSegment.toLocation,
        initialSegment.transportMode,
        initialSegment.isOutsourced,
      );
    } else {
      setIsLoadingRoute(false);
      setRouteError("No current segment is available.");
    }
    return () => { routeLoadVersionRef.current += 1; mockGeolocation.clearPosition(); };
  }, [
    segmentKey,
    initialSegment?.transportMode,
    initialSegment?.isOutsourced,
    initialSegment?.fromLocation?.latitude,
    initialSegment?.fromLocation?.longitude,
    initialSegment?.fromLocation?.locationName,
    initialSegment?.toLocation?.latitude,
    initialSegment?.toLocation?.longitude,
    initialSegment?.toLocation?.locationName,
    loadSegmentRoute,
  ]);

  // Main simulation tick loop (every 1000ms)
  useEffect(() => {
    if (!isEnabled || status !== "running") return;

    const interval = setInterval(() => {
      if (statusRef.current !== "running") return;

      const total = routeDataRef.current.totalDistance;
      if (total <= 0) return;

      // Distance covered in 1 second = (speed in km/h / 3.6) meters
      const stepMeters = (speedRef.current / 3.6) * 1.0;
      let nextDist = distanceRef.current + stepMeters;

      if (nextDist >= total) {
        nextDist = total;
        setStatus("completed");
      }

      distanceRef.current = nextDist;
      setDistanceTraveled(Math.round(nextDist));

      dispatchCurrentPosition(nextDist, nextDist === total ? 0 : speedRef.current);
    }, 1000);

    return () => clearInterval(interval);
  }, [isEnabled, status, dispatchCurrentPosition]);

  useEffect(() => {
    if (!isEnabled || status !== "completed") return;
    const timer = setInterval(() => {
      const skipped = skippedBoundaryRef.current;
      if (skipped && initialSegment) {
        mockGeolocation.dispatchPosition({
          transportId: initialSegment.transportId, routePlanRouteId: initialSegment.routePlanRouteId,
          boundaryNo: skipped.boundaryNo, sessionId: sessionIdRef.current,
          sequence: ++sequenceRef.current, latitude: skipped.latitude, longitude: skipped.longitude,
          speedKmh: 0, heading: 0,
        });
      } else dispatchCurrentPosition(routeDataRef.current.totalDistance, 0);
    }, 2500);
    return () => clearInterval(timer);
  }, [isEnabled, status, dispatchCurrentPosition, initialSegment?.transportId, initialSegment?.routePlanRouteId]);

  // Signal loss timer loop
  useEffect(() => {
    if (!isSignalLoss) return;

    const timer = setInterval(() => {
      setSignalLossSec((sec) => sec + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [isSignalLoss]);

  // Enable/Disable mock layer. Enabling is intentionally synchronous so callers
  // can reacquire an existing geolocation watcher immediately afterwards.
  const enableMockGps = useCallback(() => {
    mockGeolocation.enable();
    if (routeDataRef.current.coordinates.length > 0)
      dispatchCurrentPosition(distanceRef.current, speedRef.current);
    setIsEnabled(true);
  }, [dispatchCurrentPosition]);

  const disableMockGps = useCallback(() => {
    mockGeolocation.disable();
    setIsEnabled(false);
    setStatus("idle");
    setIsSignalLoss(false);
    setSignalLossSec(0);
  }, []);

  const toggleEnable = useCallback(() => {
    if (isEnabled) disableMockGps();
    else enableMockGps();
  }, [disableMockGps, enableMockGps, isEnabled]);

  const start = useCallback(() => {
    if (routeDataRef.current.totalDistance <= 0) return;
    if (!isEnabled) {
      setIsEnabled(true);
      mockGeolocation.enable();
    }
    setStatus("running");
  }, [isEnabled]);

  const pause = useCallback(() => {
    setStatus("paused");
  }, []);

  const reset = useCallback(() => {
    distanceRef.current = 0;
    setDistanceTraveled(0);
    setStatus("idle");
    setIsSignalLoss(false);
    setSignalLossSec(0);
    if (mockGeolocation.getIsEnabled()) dispatchCurrentPosition(0, 0);
  }, [dispatchCurrentPosition]);

  const seek = useCallback(
    (percent: number) => {
      const clamped = Math.max(0, Math.min(100, percent));
      const total = routeDataRef.current.totalDistance;
      const dist = (clamped / 100) * total;
      distanceRef.current = dist;
      setDistanceTraveled(Math.round(dist));
      dispatchCurrentPosition(dist, speedRef.current);
    },
    [dispatchCurrentPosition],
  );

  const jumpNearStation = useCallback(
    (metersBefore = 350) => {
      const total = routeDataRef.current.totalDistance;
      if (total <= 0) return;
      const targetDist = Math.max(0, total - metersBefore);
      distanceRef.current = targetDist;
      setDistanceTraveled(Math.round(targetDist));
      dispatchCurrentPosition(targetDist, speedRef.current);
    },
    [dispatchCurrentPosition],
  );

  const toggleSignalLoss = useCallback(() => {
    setIsSignalLoss((prev) => {
      const next = !prev;
      if (!next) setSignalLossSec(0);
      return next;
    });
  }, []);

  const retryRoute = useCallback(() => {
    if (initialSegment?.fromLocation && initialSegment.toLocation)
      void loadSegmentRoute(initialSegment.fromLocation, initialSegment.toLocation,
        initialSegment.transportMode, initialSegment.isOutsourced);
  }, [initialSegment?.fromLocation, initialSegment?.toLocation, initialSegment?.transportMode,
    initialSegment?.isOutsourced, loadSegmentRoute]);

  const skipToBoundary = useCallback((boundaryNo: number) => {
    if (!initialSegment?.transportId || !initialSegment.routePlanRouteId || !initialSegment.toLocation ||
      !mockGeolocation.getIsEnabled() || !Number.isInteger(boundaryNo) || boundaryNo <= 0) return false;
    let target;
    try { target = resolveEndpoint(initialSegment.toLocation); }
    catch (error) {
      setRouteError(error instanceof Error ? error.message : "Handover point has no valid coordinates.");
      return false;
    }
    ++routeLoadVersionRef.current;
    skippedBoundaryRef.current = { boundaryNo, ...target };
    routeDataRef.current = { coordinates: [], cumDistances: [], totalDistance: 0 };
    setTotalDistance(0);
    setRouteSource("none");
    setIsLoadingRoute(false);
    statusRef.current = "completed";
    setStatus("completed");
    setCurrentPoint({ ...target, heading: 0 });
    mockGeolocation.dispatchPosition({
      transportId: initialSegment.transportId,
      routePlanRouteId: initialSegment.routePlanRouteId,
      boundaryNo,
      sessionId: sessionIdRef.current,
      sequence: ++sequenceRef.current,
      ...target,
      speedKmh: 0,
      heading: 0,
    });
    return true;
  }, [initialSegment?.transportId, initialSegment?.routePlanRouteId, initialSegment?.toLocation]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mockGeolocation.disable();
    };
  }, []);

  const progressPercent =
    totalDistance > 0
      ? Number(((distanceTraveled / totalDistance) * 100).toFixed(1))
      : 0;

  return {
    isEnabled,
    status,
    speedKmh,
    setSpeedKmh,
    distanceTraveled,
    totalDistance,
    progressPercent,
    isSignalLoss,
    signalLossSec,
    routeError,
    routeAttempts,
    isLoadingRoute,
    routeSource,
    currentPoint,
    enableMockGps,
    disableMockGps,
    toggleEnable,
    start,
    pause,
    reset,
    seek,
    jumpNearStation,
    toggleSignalLoss,
    loadSegmentRoute,
    retryRoute,
    skipToBoundary,
    loadCustomGeoJson,
  };
}
