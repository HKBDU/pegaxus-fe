import { normalizeRouteGeoJson, type RouteGeometry } from "./geojson";

export type RoutingPoint = { latitude: number; longitude: number };

export type RoutePreviewErrorCode =
  | "MISSING_KEY"
  | "NETWORK"
  | "QUOTA"
  | "INVALID_RESPONSE"
  | "TIMEOUT";

export class RoutePreviewError extends Error {
  readonly code: RoutePreviewErrorCode;

  constructor(
    code: RoutePreviewErrorCode,
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "RoutePreviewError";
    this.code = code;
  }
}

export interface RoutePreviewResult {
  geometry: RouteGeometry;
  distanceKm: number;
  durationMinutes: number;
  snappedStart?: RoutingPoint;
  snappedEnd?: RoutingPoint;
}

function getApiKey() {
  const key = import.meta.env.VITE_GEOAPIFY_API_KEY;
  if (!key || key.startsWith("$"))
    throw new RoutePreviewError(
      "MISSING_KEY",
      "Geoapify API key is not configured.",
    );
  return key;
}

export async function snapToFeasibleRoadPoint(
  point: RoutingPoint,
  signal?: AbortSignal,
): Promise<{ latitude: number; longitude: number; isSnapped: boolean }> {
  try {
    const key = getApiKey();
    const snapped = await snapToNearestRoad(point, key, signal);
    const isSnapped =
      Math.abs(snapped.latitude - point.latitude) > 0.0001 ||
      Math.abs(snapped.longitude - point.longitude) > 0.0001;
    return {
      latitude: snapped.latitude,
      longitude: snapped.longitude,
      isSnapped,
    };
  } catch {
    return {
      latitude: point.latitude,
      longitude: point.longitude,
      isSnapped: false,
    };
  }
}

/**
 * Calculates geodesic (great-circle) distance as a graceful fallback
 * when road network routing is not available.
 */
export function calculateGeodesicFallback(
  start: RoutingPoint,
  end: RoutingPoint,
): RoutePreviewResult {
  const R = 6371; // Earth radius in km
  const dLat = ((end.latitude - start.latitude) * Math.PI) / 180;
  const dLon = ((end.longitude - start.longitude) * Math.PI) / 180;
  const lat1 = (start.latitude * Math.PI) / 180;
  const lat2 = (end.latitude * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const straightKm = R * c;
  const distanceKm = Math.round(straightKm * 1.25 * 10) / 10;
  const durationMinutes = Math.max(15, Math.round((distanceKm / 70) * 60));

  return {
    geometry: {
      type: "LineString",
      coordinates: [
        [start.longitude, start.latitude],
        [end.longitude, end.latitude],
      ],
    },
    distanceKm,
    durationMinutes,
  };
}

async function snapToNearestRoad(
  point: RoutingPoint,
  apiKey: string,
  signal?: AbortSignal,
): Promise<RoutingPoint> {
  try {
    const res = await fetch(
      `https://api.geoapify.com/v1/geocode/reverse?lat=${point.latitude}&lon=${point.longitude}&apiKey=${apiKey}`,
      { signal },
    );
    if (!res.ok) return point;
    const data = (await res.json()) as {
      features?: Array<{ properties?: { lat?: number; lon?: number } }>;
    };
    const feat = data.features?.[0];
    if (feat?.properties?.lat != null && feat.properties?.lon != null) {
      return {
        latitude: feat.properties.lat,
        longitude: feat.properties.lon,
      };
    }
  } catch {
    // Ignore snap error and use original coordinates
  }
  return point;
}

async function fetchRoute(
  start: RoutingPoint,
  end: RoutingPoint,
  apiKey: string,
  signal: AbortSignal,
): Promise<Response> {
  const params = new URLSearchParams({
    waypoints: `${start.latitude},${start.longitude}|${end.latitude},${end.longitude}`,
    mode: "drive",
    apiKey,
  });
  return fetch(`https://api.geoapify.com/v1/routing?${params}`, { signal });
}

export async function previewGeoapifyRoute(
  start: RoutingPoint,
  end: RoutingPoint,
  signal?: AbortSignal,
  timeoutMs = 10_000,
): Promise<RoutePreviewResult> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);
  const abort = () => controller.abort();
  signal?.addEventListener("abort", abort, { once: true });
  try {
    const apiKey = getApiKey();
    let response = await fetchRoute(start, end, apiKey, controller.signal);

    let usedStart = start;
    let usedEnd = end;

    // If 400 (e.g. "No suitable edges near location" due to coordinates in forests/parks),
    // attempt to snap the waypoints to the nearest routable road via reverse geocoding.
    if (response.status === 400) {
      const [snappedStart, snappedEnd] = await Promise.all([
        snapToNearestRoad(start, apiKey, controller.signal),
        snapToNearestRoad(end, apiKey, controller.signal),
      ]);
      if (
        snappedStart.latitude !== start.latitude ||
        snappedStart.longitude !== start.longitude ||
        snappedEnd.latitude !== end.latitude ||
        snappedEnd.longitude !== end.longitude
      ) {
        usedStart = snappedStart;
        usedEnd = snappedEnd;
        response = await fetchRoute(
          snappedStart,
          snappedEnd,
          apiKey,
          controller.signal,
        );
      }
    }

    if ([401, 403, 429].includes(response.status))
      throw new RoutePreviewError(
        "QUOTA",
        "Geoapify request quota or authorization failed.",
      );

    if (!response.ok) {
      // If road routing fails even after snapping (e.g. unroutable terrain),
      // provide geodesic fallback rather than blocking the user.
      return calculateGeodesicFallback(start, end);
    }

    const payload = (await response.json()) as {
      features?: Array<{
        geometry?: unknown;
        properties?: { distance?: unknown; time?: unknown };
      }>;
    };
    const feature = payload.features?.[0];
    const geometry = normalizeRouteGeoJson(feature?.geometry);
    const distance = Number(feature?.properties?.distance);
    const duration = Number(feature?.properties?.time);
    if (!geometry || !Number.isFinite(distance) || !Number.isFinite(duration)) {
      return calculateGeodesicFallback(start, end);
    }
    return {
      geometry,
      distanceKm: distance / 1000,
      durationMinutes: duration / 60,
      snappedStart:
        usedStart.latitude !== start.latitude || usedStart.longitude !== start.longitude
          ? usedStart
          : undefined,
      snappedEnd:
        usedEnd.latitude !== end.latitude || usedEnd.longitude !== end.longitude
          ? usedEnd
          : undefined,
    };
  } catch (error) {
    if (error instanceof RoutePreviewError && error.code === "QUOTA") throw error;
    if (error instanceof DOMException && error.name === "AbortError")
      throw new RoutePreviewError(
        "TIMEOUT",
        "Geoapify routing request timed out or was cancelled.",
      );
    // Graceful fallback on unexpected network or parsing errors
    return calculateGeodesicFallback(start, end);
  } finally {
    window.clearTimeout(timeout);
    signal?.removeEventListener("abort", abort);
  }
}
