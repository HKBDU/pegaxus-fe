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

export type SimulatorStatus = "idle" | "running" | "paused" | "completed";

export interface SegmentEndpoint {
  latitude: number | null;
  longitude: number | null;
  locationName?: string;
}

export function useGpsSimulator(initialSegment?: {
  fromLocation: SegmentEndpoint | null;
  toLocation: SegmentEndpoint | null;
}) {
  const [isEnabled, setIsEnabled] = useState(false);
  const [status, setStatus] = useState<SimulatorStatus>("idle");
  const [speedKmh, setSpeedKmh] = useState(60);
  const [distanceTraveled, setDistanceTraveled] = useState(0);
  const [isSignalLoss, setIsSignalLoss] = useState(false);
  const [signalLossSec, setSignalLossSec] = useState(0);
  const [loop, setLoop] = useState(true);
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

  const [totalDistance, setTotalDistance] = useState(0);
  const distanceRef = useRef(0);
  const speedRef = useRef(speedKmh);
  const statusRef = useRef(status);
  const loopRef = useRef(loop);
  const isSignalLossRef = useRef(isSignalLoss);

  useEffect(() => {
    speedRef.current = speedKmh;
  }, [speedKmh]);

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  useEffect(() => {
    loopRef.current = loop;
  }, [loop]);

  useEffect(() => {
    isSignalLossRef.current = isSignalLoss;
    mockGeolocation.setSignalLoss(isSignalLoss);
  }, [isSignalLoss]);

  // Dispatch position helper
  const dispatchCurrentPosition = useCallback(
    (dist: number, speed: number) => {
      const route = routeDataRef.current;
      if (route.coordinates.length === 0) return;

      const raw = positionAtDistance(route, dist);
      const jittered = addGpsJitter(raw.latitude, raw.longitude, 2);

      setCurrentPoint({
        latitude: jittered.latitude,
        longitude: jittered.longitude,
        heading: raw.heading,
      });

      mockGeolocation.dispatchPosition({
        latitude: jittered.latitude,
        longitude: jittered.longitude,
        speedKmh: speed,
        heading: raw.heading,
        accuracyMeters: 8,
      });
    },
    [],
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

      if (data.coordinates.length > 0) {
        dispatchCurrentPosition(0, 0);
      }
    },
    [dispatchCurrentPosition],
  );

const FALLBACK_COORDINATES: Record<
  string,
  { latitude: number; longitude: number }
> = {
  "Chantilly Stables": { latitude: 49.1944, longitude: 2.4858 },
  "Lille Rest Stop": { latitude: 50.6292, longitude: 3.0573 },
  "Calais BCP": { latitude: 50.9513, longitude: 1.8587 },
  "Dover Port": { latitude: 51.1279, longitude: 1.3134 },
  "Newmarket Stables": { latitude: 52.2435, longitude: 0.4057 },
  "Paris Airport": { latitude: 49.0097, longitude: 2.5479 },
  "London Airport": { latitude: 51.47, longitude: -0.4543 },
  "Hanoi Equine Quarantine Facility": {
    latitude: 21.0285,
    longitude: 105.8544,
  },
  "Danang Transit Terminal": { latitude: 16.0544, longitude: 108.2022 },
};

function resolveEndpoint(endpoint: SegmentEndpoint): {
  latitude: number;
  longitude: number;
} {
  if (endpoint.latitude != null && endpoint.longitude != null) {
    return { latitude: endpoint.latitude, longitude: endpoint.longitude };
  }
  if (endpoint.locationName && FALLBACK_COORDINATES[endpoint.locationName]) {
    return FALLBACK_COORDINATES[endpoint.locationName];
  }
  return { latitude: 21.0285, longitude: 105.8544 };
}

  // Load from segment points
  const loadSegmentRoute = useCallback(
    async (from: SegmentEndpoint, to: SegmentEndpoint) => {
      const fromCoord = resolveEndpoint(from);
      const toCoord = resolveEndpoint(to);

      setIsLoadingRoute(true);
      try {
        // Use the same resolver/cache as the ongoing-transport map. If that map
        // already loaded Geoapify's road geometry, the simulator follows the
        // exact same polyline instead of creating a second route or a straight line.
        const resolved = await resolveRouteGeometry({
          id: "gps-simulator-segment",
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
        // `estimated` is the resolver's straight-line fallback. Never use it
        // for GPS simulation: the vehicle must follow a real Geoapify road
        // geometry or remain stopped until one can be loaded.
        if (!resolved.estimated && resolved.line) {
          const coordinates = resolved.line.type === "LineString"
            ? resolved.line.coordinates
            : resolved.line.coordinates.flat();
          if (coordinates.length >= 2) {
            applyCoordinates(coordinates, "segment");
            setIsLoadingRoute(false);
            return;
          }
        }
        // Never substitute the endpoint-to-endpoint line here. A missing road
        // geometry must leave the simulator stopped, otherwise fake GPS can
        // cut across terrain/water between two route endpoints.
        if (resolved.estimated || !resolved.line) {
          setIsLoadingRoute(false);
        }
        routeDataRef.current = { coordinates: [], cumDistances: [], totalDistance: 0 };
        setTotalDistance(0);
        setDistanceTraveled(0);
        setRouteSource("none");
      } catch (err) {
        console.warn(
          "[GpsSimulator] Road geometry failed; simulator will remain stopped:",
          err,
        );
        routeDataRef.current = { coordinates: [], cumDistances: [], totalDistance: 0 };
        setTotalDistance(0);
        setDistanceTraveled(0);
        setRouteSource("none");
      }

      setIsLoadingRoute(false);
    },
    [applyCoordinates],
  );

  // Load Custom GeoJSON
  const loadCustomGeoJson = useCallback(
    (geoJsonInput: unknown) => {
      const coords = parseGeoJsonToCoordinates(geoJsonInput);
      if (coords.length >= 2) {
        applyCoordinates(coords, "custom");
        return true;
      }
      return false;
    },
    [applyCoordinates],
  );

  // Auto load initial segment if provided
  useEffect(() => {
    if (initialSegment?.fromLocation && initialSegment?.toLocation) {
      void loadSegmentRoute(
        initialSegment.fromLocation,
        initialSegment.toLocation,
      );
    }
  }, [
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
        if (loopRef.current) {
          nextDist = 0;
        } else {
          nextDist = total;
          setStatus("completed");
        }
      }

      distanceRef.current = nextDist;
      setDistanceTraveled(Math.round(nextDist));

      dispatchCurrentPosition(nextDist, speedRef.current);
    }, 1000);

    return () => clearInterval(interval);
  }, [isEnabled, status, dispatchCurrentPosition]);

  // Signal loss timer loop
  useEffect(() => {
    if (!isSignalLoss) return;

    const timer = setInterval(() => {
      setSignalLossSec((sec) => sec + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [isSignalLoss]);

  // Enable/Disable mock layer
  const toggleEnable = useCallback(() => {
    setIsEnabled((prev) => {
      const next = !prev;
      if (next) {
        mockGeolocation.enable();
        if (routeDataRef.current.coordinates.length > 0) {
          dispatchCurrentPosition(distanceRef.current, speedRef.current);
        }
      } else {
        mockGeolocation.disable();
        setStatus("idle");
        setIsSignalLoss(false);
        setSignalLossSec(0);
      }
      return next;
    });
  }, [dispatchCurrentPosition]);

  const start = useCallback(() => {
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
    dispatchCurrentPosition(0, 0);
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
    loop,
    setLoop,
    isLoadingRoute,
    routeSource,
    currentPoint,
    toggleEnable,
    start,
    pause,
    reset,
    seek,
    jumpNearStation,
    toggleSignalLoss,
    loadSegmentRoute,
    loadCustomGeoJson,
  };
}
