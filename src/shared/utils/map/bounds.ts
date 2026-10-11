import { LngLatBounds } from "maplibre-gl";
import { normalizeRouteGeoJson } from "./geojson";
import { toMapPoint, type MapPoint } from "./coordinates";

export type BoundedLocation = {
  latitude: unknown;
  longitude: unknown;
};

export function boundsFromLocations(
  locations: BoundedLocation[],
): LngLatBounds | null {
  const points = locations
    .map((location) =>
      toMapPoint({
        latitude: location.latitude,
        longitude: location.longitude,
      }),
    )
    .filter((point): point is MapPoint => point !== null);

  if (!points.length) return null;

  return points.reduce(
    (bounds, point) => bounds.extend(point),
    new LngLatBounds(points[0], points[0]),
  );
}

export function boundsFromRoute(input: unknown): LngLatBounds | null {
  const geometry = normalizeRouteGeoJson(input);
  if (!geometry) return null;

  const lines =
    geometry.type === "LineString"
      ? [geometry.coordinates]
      : geometry.coordinates;
  const points = lines.flat();
  if (!points.length) return null;

  return points.reduce(
    (bounds, point) => bounds.extend(point),
    new LngLatBounds(points[0], points[0]),
  );
}
