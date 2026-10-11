import {
  isValidCoordinates,
  toCoordinates,
  type MapPoint,
} from "./coordinates";

export type LineStringGeometry = {
  type: "LineString";
  coordinates: MapPoint[];
};

export type MultiLineStringGeometry = {
  type: "MultiLineString";
  coordinates: MapPoint[][];
};

export type RouteGeometry = LineStringGeometry | MultiLineStringGeometry;

export type RouteGeoJson =
  | RouteGeometry
  | {
      type: "Feature";
      geometry: RouteGeometry;
      properties?: Record<string, unknown> | null;
    }
  | {
      type: "FeatureCollection";
      features: Array<{
        type: "Feature";
        geometry: RouteGeometry | null;
        properties?: Record<string, unknown> | null;
      }>;
    };

function normalizeLine(points: unknown): MapPoint[] | null {
  if (!Array.isArray(points)) return null;

  const normalized = points
    .map((point) => toCoordinates(point))
    .filter((point): point is NonNullable<typeof point> => point !== null)
    .map((point) => [point.longitude, point.latitude] as MapPoint);

  return normalized.length >= 2 ? normalized : null;
}

export function normalizeRouteGeoJson(input: unknown): RouteGeometry | null {
  if (!input || typeof input !== "object") return null;

  const value = input as {
    type?: string;
    coordinates?: unknown;
    geometry?: unknown;
    features?: unknown;
  };

  if (value.type === "LineString") {
    const coordinates = normalizeLine(value.coordinates);
    return coordinates ? { type: "LineString", coordinates } : null;
  }

  if (value.type === "MultiLineString" && Array.isArray(value.coordinates)) {
    const coordinates = value.coordinates
      .map((line) => normalizeLine(line))
      .filter((line): line is MapPoint[] => line !== null);
    return coordinates.length ? { type: "MultiLineString", coordinates } : null;
  }

  if (value.type === "Feature") {
    return normalizeRouteGeoJson(value.geometry);
  }

  if (value.type === "FeatureCollection" && Array.isArray(value.features)) {
    const lines = value.features
      .map((feature) => normalizeRouteGeoJson(feature))
      .filter((geometry): geometry is RouteGeometry => geometry !== null);

    if (lines.length === 1) return lines[0];
    if (lines.length > 1) {
      const coordinates = lines.flatMap((line) =>
        line.type === "LineString" ? [line.coordinates] : line.coordinates,
      );
      return { type: "MultiLineString", coordinates };
    }
  }

  return null;
}

export function createRouteSourceData(
  input: unknown,
): { type: "Feature"; geometry: RouteGeometry } | null {
  const geometry = normalizeRouteGeoJson(input);
  return geometry ? { type: "Feature", geometry } : null;
}

export function isValidRouteGeoJson(input: unknown): boolean {
  return normalizeRouteGeoJson(input) !== null;
}

export { isValidCoordinates };
