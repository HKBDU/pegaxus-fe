import type { MapLocation, MapRoute } from "@/shared/components/map";
import type { RouteGeometry } from "@/shared/utils/map/geojson";
import type { RouteLocation, RoutePlanDetail } from "../types";

function coordinate(value: unknown, limit: number) {
  if (typeof value !== "number" && (typeof value !== "string" || !value.trim()))
    return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && Math.abs(parsed) <= limit ? parsed : null;
}

type MapSegments = {
  segments: {
    sequenceNo: number;
    fromLocation?: RouteLocation | null;
    toLocation?: RouteLocation | null;
  }[];
};

export function toRouteMapLocations(plan: MapSegments): MapLocation[] {
  const seen = new Set<string>();
  return [...plan.segments]
    .sort((a, b) => a.sequenceNo - b.sequenceNo)
    .flatMap((segment) => [segment.fromLocation, segment.toLocation])
    .flatMap((location) => {
      if (!location) return [];
      const latitude = coordinate(location.latitude, 90),
        longitude = coordinate(location.longitude, 180);
      if (
        latitude === null ||
        longitude === null ||
        seen.has(location.locationId)
      )
        return [];
      seen.add(location.locationId);
      return [
        {
          id: location.locationId,
          name: location.locationName,
          type: location.locationType,
          city: location.city,
          country: location.country,
          latitude,
          longitude,
        },
      ];
    });
}

// Reject the whole line if any vertex is invalid. Dropping a vertex would invent a shortcut.
export function verifiedRouteGeometry(input: unknown): RouteGeometry | null {
  if (!input || typeof input !== "object") return null;
  const value = input as { type?: unknown; coordinates?: unknown };
  const line = (points: unknown): boolean =>
    Array.isArray(points) &&
    points.length >= 2 &&
    points.every(
      (point) =>
        Array.isArray(point) &&
        point.length === 2 &&
        typeof point[0] === "number" &&
        typeof point[1] === "number" &&
        coordinate(point[0], 180) !== null &&
        coordinate(point[1], 90) !== null,
    );
  if (value.type === "LineString" && line(value.coordinates))
    return input as RouteGeometry;
  if (
    value.type === "MultiLineString" &&
    Array.isArray(value.coordinates) &&
    value.coordinates.length > 0 &&
    value.coordinates.every(line)
  )
    return input as RouteGeometry;
  return null;
}

/**
 * Sequence numbers of the segments the Transport Specialist blocked in the legal review. The list only means something
 * on a review that found the plan not feasible.
 */
export function blockedSegmentNumbers(plan: Pick<RoutePlanDetail, "legalReview">): Set<number> {
  return new Set(
    plan.legalReview?.isFeasible === false ? (plan.legalReview.blockedSegments ?? []) : [],
  );
}

export function toRouteMapData(
  plan: RoutePlanDetail,
  suppliedGeometry?: unknown,
) {
  const blocked = blockedSegmentNumbers(plan);
  // RP3 currently has no saved geometry field. Build segment routes from the
  // verified endpoints so MapViewer can resolve and render their line geometry.
  const geometry = verifiedRouteGeometry(suppliedGeometry);
  const geometryStatus =
    suppliedGeometry == null ? "missing" : geometry ? "available" : "invalid";
  const locations = toRouteMapLocations(plan);
  const locationById = new Map(locations.map((location) => [location.id, location]));
  const routes: MapRoute[] = plan.segments
    .slice()
    .sort((a, b) => a.sequenceNo - b.sequenceNo)
    .flatMap((segment) => {
      const fromLocation = locationById.get(segment.fromLocation.locationId);
      const toLocation = locationById.get(segment.toLocation.locationId);
      if (!fromLocation || !toLocation) return [];
      return [
        {
          id: segment.routePlanRouteId,
          routePlanRouteId: segment.routePlanRouteId,
          name: segment.route.routeName ?? segment.route.routeCode,
          fromLocation,
          toLocation,
          transportMode: segment.route.transportMode,
          distanceKm: segment.route.distanceKm,
          durationMinutes: segment.route.estimatedDurationMinutes,
          routePlanType: segment.routeType,
          isOutsourced: segment.isOutsourced,
          // Drawn red on the map so the coordinator finds the segment the legal review blocked.
          blocked: blocked.has(segment.sequenceNo),
        },
      ];
    });
  const route: MapRoute | null = geometry
    ? { id: plan.routePlanId, name: plan.routePlanCode, geometry }
    : null;
  return {
    locations,
    route,
    routes,
    geometryStatus,
    omittedStops: plan.segments
      .flatMap((segment) => [segment.fromLocation, segment.toLocation])
      .filter(
        (location) =>
          !location ||
          coordinate(location.latitude, 90) === null ||
          coordinate(location.longitude, 180) === null,
      ).length,
  };
}
