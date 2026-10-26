import { VALIDATION_LIMITS } from "@/shared/constants/validation-limits";

export interface RouteData {
  coordinates: [number, number][]; // [lon, lat]
  cumDistances: number[]; // meters
  totalDistance: number; // meters
}

export interface InterpolatedPoint {
  latitude: number;
  longitude: number;
  heading: number;
}

const R_EARTH = 6371000; // meters

/**
 * Calculates Haversine distance in meters between two [lon, lat] coordinates.
 */
export function haversineDistance(
  a: [number, number],
  b: [number, number],
): number {
  const p1 = (a[1] * Math.PI) / 180;
  const p2 = (b[1] * Math.PI) / 180;
  const dp = ((b[1] - a[1]) * Math.PI) / 180;
  const dl = ((b[0] - a[0]) * Math.PI) / 180;

  const sinDp2 = Math.sin(dp / 2);
  const sinDl2 = Math.sin(dl / 2);
  const h = sinDp2 * sinDp2 + Math.cos(p1) * Math.cos(p2) * sinDl2 * sinDl2;
  return 2 * R_EARTH * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * Calculates bearing / heading in degrees (0 to 359.9) from point A to point B.
 */
export function calculateBearing(
  a: [number, number],
  b: [number, number],
): number {
  const p1 = (a[1] * Math.PI) / 180;
  const p2 = (b[1] * Math.PI) / 180;
  const dl = ((b[0] - a[0]) * Math.PI) / 180;

  const y = Math.sin(dl) * Math.cos(p2);
  const x =
    Math.cos(p1) * Math.sin(p2) - Math.sin(p1) * Math.cos(p2) * Math.cos(dl);
  const brng = (Math.atan2(y, x) * (180 / Math.PI) + 360) % 360;
  return Number(brng.toFixed(1));
}

/**
 * Processes a sequence of coordinates and computes cumulative distances.
 */
export function buildRouteData(rawCoordinates: [number, number][]): RouteData {
  if (rawCoordinates.length === 0) {
    return { coordinates: [], cumDistances: [], totalDistance: 0 };
  }
  if (rawCoordinates.length === 1) {
    return {
      coordinates: rawCoordinates,
      cumDistances: [0],
      totalDistance: 0,
    };
  }

  const coordinates: [number, number][] = [rawCoordinates[0]];
  const cumDistances: number[] = [0];

  for (let i = 1; i < rawCoordinates.length; i++) {
    const prev = rawCoordinates[i - 1];
    const curr = rawCoordinates[i];
    const dist = haversineDistance(prev, curr);
    // Ignore duplicate or sub-millimeter points
    if (dist > 0.5) {
      coordinates.push(curr);
      cumDistances.push(cumDistances[cumDistances.length - 1] + dist);
    }
  }

  const totalDistance = cumDistances[cumDistances.length - 1] ?? 0;
  return { coordinates, cumDistances, totalDistance };
}

/**
 * Interpolates vehicle position along the route given distance traveled in meters.
 */
export function positionAtDistance(
  route: RouteData,
  distanceMeters: number,
): InterpolatedPoint {
  const { coordinates, cumDistances, totalDistance } = route;

  if (coordinates.length === 0) {
    return { latitude: 0, longitude: 0, heading: 0 };
  }
  if (coordinates.length === 1 || distanceMeters <= 0) {
    const heading =
      coordinates.length > 1
        ? calculateBearing(coordinates[0], coordinates[1])
        : 0;
    return {
      longitude: coordinates[0][0],
      latitude: coordinates[0][1],
      heading,
    };
  }

  if (distanceMeters >= totalDistance) {
    const lastIdx = coordinates.length - 1;
    const prevIdx = Math.max(0, lastIdx - 1);
    const heading = calculateBearing(coordinates[prevIdx], coordinates[lastIdx]);
    return {
      longitude: coordinates[lastIdx][0],
      latitude: coordinates[lastIdx][1],
      heading,
    };
  }

  // Linear scan for segment
  for (let i = 1; i < cumDistances.length; i++) {
    if (distanceMeters <= cumDistances[i]) {
      const segLength = cumDistances[i] - cumDistances[i - 1];
      const t = segLength > 0 ? (distanceMeters - cumDistances[i - 1]) / segLength : 0;
      const a = coordinates[i - 1];
      const b = coordinates[i];

      const lon = a[0] + (b[0] - a[0]) * t;
      const lat = a[1] + (b[1] - a[1]) * t;
      const heading = calculateBearing(a, b);

      return {
        longitude: lon,
        latitude: lat,
        heading,
      };
    }
  }

  const last = coordinates[coordinates.length - 1];
  return { longitude: last[0], latitude: last[1], heading: 0 };
}

/**
 * Adds natural GPS noise / jitter (random offset within noiseMeters).
 */
export function addGpsJitter(
  lat: number,
  lon: number,
  noiseMeters = 3,
): { latitude: number; longitude: number } {
  if (noiseMeters <= 0) {
    return {
      latitude: Number(lat.toFixed(VALIDATION_LIMITS.coordinateScale)),
      longitude: Number(lon.toFixed(VALIDATION_LIMITS.coordinateScale)),
    };
  }

  const angle = Math.random() * 2 * Math.PI;
  const radius = (Math.random() + Math.random()) * 0.5 * noiseMeters;

  const dLat = (radius * Math.cos(angle)) / 111320;
  const cosLat = Math.cos((lat * Math.PI) / 180);
  const dLon = (radius * Math.sin(angle)) / (111320 * (cosLat || 1));

  return {
    latitude: Number((lat + dLat).toFixed(VALIDATION_LIMITS.coordinateScale)),
    longitude: Number((lon + dLon).toFixed(VALIDATION_LIMITS.coordinateScale)),
  };
}

/**
 * Generates an interpolated multi-point geodesic route between two points.
 */
export function generateGeodesicRoute(
  from: { latitude: number; longitude: number },
  to: { latitude: number; longitude: number },
  steps = 50,
): [number, number][] {
  const result: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const lon = from.longitude + (to.longitude - from.longitude) * t;
    const lat = from.latitude + (to.latitude - from.latitude) * t;
    result.push([
      Number(lon.toFixed(VALIDATION_LIMITS.coordinateScale)),
      Number(lat.toFixed(VALIDATION_LIMITS.coordinateScale)),
    ]);
  }
  return result;
}

/**
 * Safely parses GeoJSON object or string to extract line coordinates.
 */
export function parseGeoJsonToCoordinates(geoJsonInput: unknown): [number, number][] {
  try {
    const data =
      typeof geoJsonInput === "string" ? JSON.parse(geoJsonInput) : geoJsonInput;

    if (!data || typeof data !== "object") return [];

    // FeatureCollection
    if ("type" in data && data.type === "FeatureCollection" && Array.isArray(data.features)) {
      for (const feat of data.features) {
        if (feat?.geometry?.type === "LineString" && Array.isArray(feat.geometry.coordinates)) {
          return feat.geometry.coordinates as [number, number][];
        }
      }
    }

    // Feature
    if ("type" in data && data.type === "Feature" && data.geometry?.type === "LineString") {
      return data.geometry.coordinates as [number, number][];
    }

    // Direct Geometry LineString
    if ("type" in data && data.type === "LineString" && Array.isArray(data.coordinates)) {
      return data.coordinates as [number, number][];
    }

    // Direct array of coordinates
    if (Array.isArray(data) && data.length > 0 && Array.isArray(data[0])) {
      return data as [number, number][];
    }
  } catch {
    // Invalid GeoJSON
  }
  return [];
}
